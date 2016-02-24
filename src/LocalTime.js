/**
 * @copyright (c) 2016, Philipp Thuerwaechter & Pattrick Hueper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */


import {MathUtil} from './MathUtil';
import {assert, requireNonNull, requireInstance} from './assert';
import {DateTimeException, UnsupportedTemporalTypeException, IllegalArgumentException} from './errors';

import {Clock} from './Clock';
import {LocalDateTime} from './LocalDateTime';

import {DateTimeFormatter} from './format/DateTimeFormatter';

import {ChronoField} from './temporal/ChronoField';
import {ChronoUnit} from './temporal/ChronoUnit';
import {TemporalAccessor} from './temporal/TemporalAccessor';
import {TemporalQueries} from './temporal/TemporalQueries';
import {createTemporalQuery} from './temporal/TemporalQuery';

/**
 * A time without time-zone in the ISO-8601 calendar system,
 * such as {@code 10:15:30}.
 * <p>
 * {@link LocalTime} is an immutable date-time object that represents a time,
 * often viewed as hour-minute-second.
 * Time is represented to nanosecond precision.
 * For example, the value '13:45.30.123456789' can be stored in a {@link LocalTime}.
 * <p>
 * It does not store or represent a date or time-zone.
 * Instead, it is a description of the local time as seen on a wall clock.
 * It cannot represent an instant on the time-line without additional information
 * such as an offset or time-zone.
 * <p>
 * The ISO-8601 calendar system is the modern civil calendar system used today
 * in most of the world. This API assumes that all calendar systems use the same
 * representation, this class, for time-of-day.
 */
export class LocalTime extends TemporalAccessor /** implements Temporal, TemporalAdjuster */ {
    /**
     * Obtains the current time from the specified clock.
     * <p>
     * This will query the specified clock to obtain the current time.
     * Using this method allows the use of an alternate clock for testing.
     * The alternate clock may be introduced using {@link Clock dependency injection}.
     *
     * @param {Clock} [clock=Clock.systemDefaultZone()] - the clock to use, not null
     * @return {LocalTime} the current time, not null
     */
    static now(clock = Clock.systemDefaultZone()) {
        requireNonNull(clock, 'clock');
        // inline OffsetTime factory to avoid creating object and InstantProvider checks
        var now = clock.instant();  // called once
        var offset = clock.offset(now);
        var secsOfDay = MathUtil.intMod(now.epochSecond(), LocalTime.SECONDS_PER_DAY);
        secsOfDay = MathUtil.intMod((secsOfDay + offset.totalSeconds()), LocalTime.SECONDS_PER_DAY);
        if (secsOfDay < 0) {
            secsOfDay += LocalTime.SECONDS_PER_DAY;
        }
        return LocalTime.ofSecondOfDay(secsOfDay, now.nano());
    }

    /**
     * Obtains an instance of {@link LocalTime} from an hour, minute, second and nanosecond.
     * <p>
     * This factory may return a cached value, but applications must not rely on this.
     *
     * @param {number} [hour=0] - the hour-of-day to represent, from 0 to 23
     * @param {number} [minute=0] - the minute-of-hour to represent, from 0 to 59
     * @param {number} [second=0] - the second-of-minute to represent, from 0 to 59
     * @param {number} [nanoOfSecond=0] - the nano-of-second to represent, from 0 to 999,999,999
     * @return {LocalTime} the local time, not null
     * @throws {DateTimeException} if the value of any field is out of range
     */
    static of(hour, minute, second, nanoOfSecond) {
        return new LocalTime(hour, minute, second, nanoOfSecond);
    }

    /**
     * Obtains an instance of {@link LocalTime} from a second-of-day value, with
     * associated nanos of second.
     * <p>
     * This factory may return a cached value, but applications must not rely on this.
     *
     * @param {number} [secondOfDay=0] - the second-of-day, from {@code 0} to {@code 24 * 60 * 60 - 1}
     * @param {number} [nanoOfSecond=0] - the nano-of-second, from 0 to 999,999,999
     * @return {LocalTime} the local time, not null
     * @throws {DateTimeException} if the either input value is invalid
     */
    static ofSecondOfDay(secondOfDay=0, nanoOfSecond=0) {
        ChronoField.SECOND_OF_DAY.checkValidValue(secondOfDay);
        ChronoField.NANO_OF_SECOND.checkValidValue(nanoOfSecond);
        var hours = MathUtil.intDiv(secondOfDay, LocalTime.SECONDS_PER_HOUR);
        secondOfDay -= hours * LocalTime.SECONDS_PER_HOUR;
        var minutes = MathUtil.intDiv(secondOfDay, LocalTime.SECONDS_PER_MINUTE);
        secondOfDay -= minutes * LocalTime.SECONDS_PER_MINUTE;
        return new LocalTime(hours, minutes, secondOfDay, nanoOfSecond);
    }
    
    /**
     * Obtains an instance of {@link LocalTime} from a nanos-of-day value.
     * <p>
     * This factory may return a cached value, but applications must not rely on this.
     *
     * @param {number} [nanoOfDay=0] - the nano of day, from {@code 0} to {@code 24 * 60 * 60 * 1,000,000,000 - 1}
     * @return {LocalTime} the local time, not null
     * @throws {DateTimeException} if the nanos of day value is invalid
     */
    static ofNanoOfDay(nanoOfDay=0) {
        ChronoField.NANO_OF_DAY.checkValidValue(nanoOfDay);
        var hours = MathUtil.intDiv(nanoOfDay, LocalTime.NANOS_PER_HOUR);
        nanoOfDay -= hours * LocalTime.NANOS_PER_HOUR;
        var minutes = MathUtil.intDiv(nanoOfDay, LocalTime.NANOS_PER_MINUTE);
        nanoOfDay -= minutes * LocalTime.NANOS_PER_MINUTE;
        var seconds = MathUtil.intDiv(nanoOfDay, LocalTime.NANOS_PER_SECOND);
        nanoOfDay -= seconds * LocalTime.NANOS_PER_SECOND;
        return new LocalTime(hours, minutes, seconds, nanoOfDay);
    }

    //-----------------------------------------------------------------------
    /**
     * Obtains an instance of {@link LocalTime} from a temporal object.
     * <p>
     * A {@link TemporalAccessor} represents some form of date and time information.
     * This factory converts the arbitrary temporal object to an instance of {@link LocalTime}.
     * <p>
     * The conversion uses the {@link TemporalQueries#localTime()} query, which relies
     * on extracting the {@link ChronoField#NANO_OF_DAY NANO_OF_DAY} field.
     * <p>
     * This method matches the signature of the functional interface {@link TemporalQuery}
     * allowing it to be used in queries via method reference, {@link LocalTime::from}.
     *
     * @param {!TemporalAccessor} temporal - the temporal object to convert, not null
     * @return {LocalTime} the local time, not null
     * @throws {DateTimeException} if unable to convert to a {@link LocalTime}
     */
    static from(temporal) {
        requireNonNull(temporal, 'temporal');
        var time = temporal.query(TemporalQueries.localTime());
        if (time == null) {
            throw new DateTimeException(`Unable to obtain LocalTime TemporalAccessor: ${temporal}, type ${temporal.constructor != null ? temporal.constructor.name : ''}`);
        }
        return time;
    }

    /**
     * Obtains an instance of {@link LocalTime} from a text string using a specific formatter.
     * <p>
     * The text is parsed using the formatter, returning a time.
     *
     * @param {!String} text - the text to parse, not null
     * @param {!String} formatter - the formatter to use, not null
     * @return {LocalTime} the parsed local time, not null
     * @throws {DateTimeParseException} if the text cannot be parsed
     */
    static parse(text, formatter=DateTimeFormatter.ISO_LOCAL_TIME) {
        requireNonNull(formatter, 'formatter');
        return formatter.parse(text, LocalTime.FROM);
    }

    /**
     * Constructor, previously validated.
     *
     * @param {number} [hour=0] - the hour-of-day to represent, validated from 0 to 23
     * @param {number} [minute=0] - the minute-of-hour to represent, validated from 0 to 59
     * @param {number} [second=0] - the second-of-minute to represent, validated from 0 to 59
     * @param {number} [nanoOfSecond=0] - the nano-of-second to represent, validated from 0 to 999,999,999
     */
    constructor(hour=0, minute=0, second=0, nanoOfSecond=0) {
        super();
        LocalTime._validate(hour, minute, second, nanoOfSecond);
        if ((minute | second | nanoOfSecond) === 0) {
            return LocalTime.HOURS[hour];
        }
        this._hour = hour;
        this._minute = minute;
        this._second = second;
        this._nano = nanoOfSecond;
    }

    static _validate(hour, minute, second, nanoOfSecond){
        ChronoField.HOUR_OF_DAY.checkValidValue(hour);
        ChronoField.MINUTE_OF_HOUR.checkValidValue(minute);
        ChronoField.SECOND_OF_MINUTE.checkValidValue(second);
        ChronoField.NANO_OF_SECOND.checkValidValue(nanoOfSecond);
        
    }
    //-----------------------------------------------------------------------
    /**
     * Checks if the specified field is supported.
     * <p>
     * This checks if this time can be queried for the specified field.
     * If false, then calling the {@link #range(TemporalField) range} and
     * {@link #get(TemporalField) get} methods will throw an exception.
     * <p>
     * If the field is a {@link ChronoField} then the query is implemented here.
     * The supported fields are:
     * <ul>
     * <li>{@link ChronoField.NANO_OF_SECOND}
     * <li>{@link ChronoField.NANO_OF_DAY}
     * <li>{@link ChronoField.MICRO_OF_SECOND}
     * <li>{@link ChronoField.MICRO_OF_DAY}
     * <li>{@link ChronoField.MILLI_OF_SECOND}
     * <li>{@link ChronoField.MILLI_OF_DAY}
     * <li>{@link ChronoField.SECOND_OF_MINUTE}
     * <li>{@link ChronoField.SECOND_OF_DAY}
     * <li>{@link ChronoField.MINUTE_OF_HOUR}
     * <li>{@link ChronoField.MINUTE_OF_DAY}
     * <li>{@link ChronoField.HOUR_OF_AMPM}
     * <li>{@link ChronoField.CLOCK_HOUR_OF_AMPM}
     * <li>{@link ChronoField.HOUR_OF_DAY}
     * <li>{@link ChronoField.CLOCK_HOUR_OF_DAY}
     * <li>{@link ChronoField.AMPM_OF_DAY}
     * </ul>
     * All other {@link ChronoField} instances will return false.
     * <p>
     * If the field is not a {@link ChronoField}, then the result of this method
     * is obtained by invoking {@link TemporalField.isSupportedBy}
     * passing this as the argument.
     * Whether the field is supported is determined by the field.
     *
     * @param {ChronoField|ChronoUnit} fieldOrUnit - the field to check, null returns false
     * @return {boolean} true if the field is supported on this time, false if not
     */
    isSupported(fieldOrUnit) {
        if (fieldOrUnit instanceof ChronoField) {
            return fieldOrUnit.isTimeBased();
        } else if (fieldOrUnit instanceof ChronoUnit) {
            return fieldOrUnit.isTimeBased();
        }
        return fieldOrUnit != null && fieldOrUnit.isSupportedBy(this);
    }

    /**
     * Gets the range of valid values for the specified field.
     * <p>
     * The range object expresses the minimum and maximum valid values for a field.
     * This time is used to enhance the accuracy of the returned range.
     * If it is not possible to return the range, because the field is not supported
     * or for some other reason, an exception is thrown.
     * <p>
     * If the field is a {@link ChronoField} then the query is implemented here.
     * The {@link #isSupported(TemporalField) supported fields} will return
     * appropriate range instances.
     * All other {@link ChronoField} instances will throw a {@link DateTimeException}.
     * <p>
     * If the field is not a {@link ChronoField}, then the result of this method
     * is obtained by invoking {@code TemporalField.rangeRefinedBy(TemporalAccessor)}
     * passing this as the argument.
     * Whether the range can be obtained is determined by the field.
     *
     * @param {ChronoField} field - the field to query the range for, not null
     * @return {ValueRange} the range of valid values for the field, not null
     * @throws {DateTimeException} if the range for the field cannot be obtained
     */
    range(field) {
        requireNonNull(field);
        return super.range(field);
    }

    /**
     * Gets the value of the specified field from this time as an {@code int}.
     * <p>
     * This queries this time for the value for the specified field.
     * The returned value will always be within the valid range of values for the field.
     * If it is not possible to return the value, because the field is not supported
     * or for some other reason, an exception is thrown.
     * <p>
     * If the field is a {@link ChronoField} then the query is implemented here.
     * The {@link #isSupported(TemporalField) supported fields} will return valid
     * values based on this time, except {@link ChronoField.NANO_OF_DAY} and {@link ChronoField.MICRO_OF_DAY}
     * which are too large to fit in an {@code int} and throw a {@link DateTimeException}.
     * All other {@link ChronoField} instances will throw a {@link DateTimeException}.
     * <p>
     * If the field is not a {@link ChronoField}, then the result of this method
     * is obtained by invoking {@link TemporalField.getFrom}
     * passing this as the argument. Whether the value can be obtained,
     * and what the value represents, is determined by the field.
     *
     * @param {ChronoField} field - the field to get, not null
     * @return {number} the value for the field
     * @throws {DateTimeException} if a value for the field cannot be obtained
     * @throws {ArithmeticException} if numeric overflow occurs
     */
    get(field) {
        return this.getLong(field);
    }

    /**
     * Gets the value of the specified field from this time as a {@code long}.
     * <p>
     * This queries this time for the value for the specified field.
     * If it is not possible to return the value, because the field is not supported
     * or for some other reason, an exception is thrown.
     * <p>
     * If the field is a {@link ChronoField} then the query is implemented here.
     * The {@link #isSupported(TemporalField) supported fields} will return valid
     * values based on this time.
     * All other {@link ChronoField} instances will throw a {@link DateTimeException}.
     * <p>
     * If the field is not a {@link ChronoField}, then the result of this method
     * is obtained by invoking {@link TemporalField.from}
     * passing this as the argument. Whether the value can be obtained,
     * and what the value represents, is determined by the field.
     *
     * @param {ChronoField} field - the field to get, not null
     * @return {number} the value for the field
     * @throws {DateTimeException} if a value for the field cannot be obtained
     * @throws {ArithmeticException} if numeric overflow occurs
     */
    getLong(field) {
        requireNonNull(field, 'field');
        if (field instanceof ChronoField) {
            return this._get0(field);
        }
        return field.getFrom(this);
    }

    /**
     * 
     * @param {ChronoField} field
     * @returns {number}
     * @private
     */
    _get0(field) {
        switch (field) {
            case ChronoField.NANO_OF_SECOND: return this._nano;
            case ChronoField.NANO_OF_DAY: return this.toNanoOfDay();
            case ChronoField.MICRO_OF_SECOND: return MathUtil.intDiv(this._nano, 1000);
            case ChronoField.MICRO_OF_DAY: return MathUtil.intDiv(this.toNanoOfDay(), 1000);
            case ChronoField.MILLI_OF_SECOND: return MathUtil.intDiv(this._nano, 1000000);
            case ChronoField.MILLI_OF_DAY: return MathUtil.intDiv(this.toNanoOfDay(), 1000000);
            case ChronoField.SECOND_OF_MINUTE: return this._second;
            case ChronoField.SECOND_OF_DAY: return this.toSecondOfDay();
            case ChronoField.MINUTE_OF_HOUR: return this._minute;
            case ChronoField.MINUTE_OF_DAY: return this._hour * 60 + this._minute;
            case ChronoField.HOUR_OF_AMPM: return this._hour % 12;
            case ChronoField.CLOCK_HOUR_OF_AMPM: var ham = MathUtil.intMod(this._hour, 12); return (ham % 12 === 0 ? 12 : ham);
            case ChronoField.HOUR_OF_DAY: return this._hour;
            case ChronoField.CLOCK_HOUR_OF_DAY: return (this._hour === 0 ? 24 : this._hour);
            case ChronoField.AMPM_OF_DAY: return this._hour / 12;
        }
        throw new UnsupportedTemporalTypeException('Unsupported field: ' + field);
    }

    //-----------------------------------------------------------------------
    /**
     * Gets the hour-of-day field.
     *
     * @return {number} the hour-of-day, from 0 to 23
     */
    hour() {
        return this._hour;
    }

    /**
     * Gets the minute-of-hour field.
     *
     * @return {number} the minute-of-hour, from 0 to 59
     */
    minute() {
        return this._minute;
    }

    /**
     * Gets the second-of-minute field.
     *
     * @return {number} the second-of-minute, from 0 to 59
     */
    second() {
        return this._second;
    }

    /**
     * Gets the nano-of-second field.
     *
     * @return {number} the nano-of-second, from 0 to 999,999,999
     */
    nano() {
        return this._nano;
    }

    /**
     * function overloading for {@link LocalDate.with}
     * 
     * if called with 1 (or less) arguments {@link LocalTime.withTemporalAdjuster} is called.
     * Otherwise {@link LocalTime.with2} is called.
     *
     * @param {!(TemporalAdjuster|ChronoField)} adjusterOrField
     * @param {number} newValue - only required if called with 2 arguments
     * @return {LocalTime}
     */
    with(adjusterOrField, newValue){
        if(arguments.length < 2){
            return this.withTemporalAdjuster(adjusterOrField);
        } else {
            return this.with2(adjusterOrField, newValue);
        }
    }

    /**
     * Returns an adjusted copy of this time.
     * <p>
     * This returns a new {@link LocalTime}, based on this one, with the time adjusted.
     * The adjustment takes place using the specified adjuster strategy object.
     * Read the documentation of the adjuster to understand what adjustment will be made.
     * <p>
     * A simple adjuster might simply set the one of the fields, such as the hour field.
     * A more complex adjuster might set the time to the last hour of the day.
     * <p>
     * The result of this method is obtained by invoking the
     * {@link TemporalAdjuster.adjustInto} method on the
     * specified adjuster passing this as the argument.
     * <p>
     * This instance is immutable and unaffected by this method call.
     *
     * @param {TemporalAdjuster} adjuster - the adjuster to use, not null
     * @return {LocalTime} a {@link LocalTime} based on this with the adjustment made, not null
     * @throws {DateTimeException} if the adjustment cannot be made
     * @throws {ArithmeticException} if numeric overflow occurs
     */
    withTemporalAdjuster(adjuster) {
        requireNonNull(adjuster, 'adjuster');
        // optimizations
        if (adjuster instanceof LocalTime) {
            return adjuster;
        }
        assert(typeof adjuster.adjustInto === 'function', 'adjuster', IllegalArgumentException);
        return adjuster.adjustInto(this);
    }

    /**
     * Returns a copy of this time with the specified field set to a new value.
     * <p>
     * This returns a new {@link LocalTime}, based on this one, with the value
     * for the specified field changed.
     * This can be used to change any supported field, such as the hour, minute or second.
     * If it is not possible to set the value, because the field is not supported or for
     * some other reason, an exception is thrown.
     * <p>
     * If the field is a {@link ChronoField} then the adjustment is implemented here.
     * The supported fields behave as follows:
     * <ul>
     * <li>{@link ChronoField.NANO_OF_SECOND} -
     *  Returns a {@link LocalTime} with the specified nano-of-second.
     *  The hour, minute and second will be unchanged.
     * <li>{@link ChronoField.NANO_OF_DAY} -
     *  Returns a {@link LocalTime} with the specified nano-of-day.
     *  This completely replaces the time and is equivalent to {@link #ofNanoOfDay(long)}.
     * <li>{@link ChronoField.MICRO_OF_SECOND} -
     *  Returns a {@link LocalTime} with the nano-of-second replaced by the specified
     *  micro-of-second multiplied by 1,000.
     *  The hour, minute and second will be unchanged.
     * <li>{@link ChronoField.MICRO_OF_DAY} -
     *  Returns a {@link LocalTime} with the specified micro-of-day.
     *  This completely replaces the time and is equivalent to using {@link #ofNanoOfDay(long)}
     *  with the micro-of-day multiplied by 1,000.
     * <li>{@link ChronoField.MILLI_OF_SECOND} -
     *  Returns a {@link LocalTime} with the nano-of-second replaced by the specified
     *  milli-of-second multiplied by 1,000,000.
     *  The hour, minute and second will be unchanged.
     * <li>{@link ChronoField.MILLI_OF_DAY} -
     *  Returns a {@link LocalTime} with the specified milli-of-day.
     *  This completely replaces the time and is equivalent to using {@link #ofNanoOfDay(long)}
     *  with the milli-of-day multiplied by 1,000,000.
     * <li>{@link ChronoField.SECOND_OF_MINUTE} -
     *  Returns a {@link LocalTime} with the specified second-of-minute.
     *  The hour, minute and nano-of-second will be unchanged.
     * <li>{@link ChronoField.SECOND_OF_DAY} -
     *  Returns a {@link LocalTime} with the specified second-of-day.
     *  The nano-of-second will be unchanged.
     * <li>{@link ChronoField.MINUTE_OF_HOUR} -
     *  Returns a {@link LocalTime} with the specified minute-of-hour.
     *  The hour, second-of-minute and nano-of-second will be unchanged.
     * <li>{@link ChronoField.MINUTE_OF_DAY} -
     *  Returns a {@link LocalTime} with the specified minute-of-day.
     *  The second-of-minute and nano-of-second will be unchanged.
     * <li>{@link ChronoField.HOUR_OF_AMPM} -
     *  Returns a {@link LocalTime} with the specified hour-of-am-pm.
     *  The AM/PM, minute-of-hour, second-of-minute and nano-of-second will be unchanged.
     * <li>{@link ChronoField.CLOCK_HOUR_OF_AMPM} -
     *  Returns a {@link LocalTime} with the specified clock-hour-of-am-pm.
     *  The AM/PM, minute-of-hour, second-of-minute and nano-of-second will be unchanged.
     * <li>{@link ChronoField.HOUR_OF_DAY} -
     *  Returns a {@link LocalTime} with the specified hour-of-day.
     *  The minute-of-hour, second-of-minute and nano-of-second will be unchanged.
     * <li>{@link ChronoField.CLOCK_HOUR_OF_DAY} -
     *  Returns a {@link LocalTime} with the specified clock-hour-of-day.
     *  The minute-of-hour, second-of-minute and nano-of-second will be unchanged.
     * <li>{@link ChronoField.AMPM_OF_DAY} -
     *  Returns a {@link LocalTime} with the specified AM/PM.
     *  The hour-of-am-pm, minute-of-hour, second-of-minute and nano-of-second will be unchanged.
     * </ul>
     * <p>
     * In all cases, if the new value is outside the valid range of values for the field
     * then a {@link DateTimeException} will be thrown.
     * <p>
     * All other {@link ChronoField} instances will throw a {@link DateTimeException}.
     * <p>
     * If the field is not a {@link ChronoField}, then the result of this method
     * is obtained by invoking {@link TemporalField.adjustInto}
     * passing this as the argument. In this case, the field determines
     * whether and how to adjust the instant.
     * <p>
     * This instance is immutable and unaffected by this method call.
     *
     * @param {!ChronoField} field - the field to set in the result, not null
     * @param {number} newValue - the new value of the field in the result
     * @return {LocalTime} a {@link LocalTime} based on this with the specified field set, not null
     * @throws {DateTimeException} if the field cannot be set
     * @throws {ArithmeticException} if numeric overflow occurs
     */
    with2(field, newValue) {
        requireNonNull(field, 'field');
        if (field instanceof ChronoField) {
            field.checkValidValue(newValue);
            switch (field) {
                case ChronoField.NANO_OF_SECOND: return this.withNano(newValue);
                case ChronoField.NANO_OF_DAY: return LocalTime.ofNanoOfDay(newValue);
                case ChronoField.MICRO_OF_SECOND: return this.withNano(newValue * 1000);
                case ChronoField.MICRO_OF_DAY: return LocalTime.ofNanoOfDay(newValue * 1000);
                case ChronoField.MILLI_OF_SECOND: return this.withNano( newValue * 1000000);
                case ChronoField.MILLI_OF_DAY: return LocalTime.ofNanoOfDay(newValue * 1000000);
                case ChronoField.SECOND_OF_MINUTE: return this.withSecond(newValue);
                case ChronoField.SECOND_OF_DAY: return this.plusSeconds(newValue - this.toSecondOfDay());
                case ChronoField.MINUTE_OF_HOUR: return this.withMinute(newValue);
                case ChronoField.MINUTE_OF_DAY: return this.plusMinutes(newValue - (this._hour * 60 + this._minute));
                case ChronoField.HOUR_OF_AMPM: return this.plusHours(newValue - MathUtil.intMod(this._hour, 12));
                case ChronoField.CLOCK_HOUR_OF_AMPM: return this.plusHours((newValue === 12 ? 0 : newValue) - MathUtil.intMod(this._hour, 12));
                case ChronoField.HOUR_OF_DAY: return this.withHour(newValue);
                case ChronoField.CLOCK_HOUR_OF_DAY: return this.withHour((newValue === 24 ? 0 : newValue));
                case ChronoField.AMPM_OF_DAY: return this.plusHours((newValue - MathUtil.intDiv(this._hour, 12)) * 12);
            }
            throw new UnsupportedTemporalTypeException('Unsupported field: ' + field);
        }
        return field.adjustInto(this, newValue);
    }

    //-----------------------------------------------------------------------
    /**
     * Returns a copy of this {@link LocalTime} with the hour-of-day value altered.
     * <p>
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} [hour=0] - the hour-of-day to set in the result, from 0 to 23
     * @return {LocalTime} a {@link LocalTime} based on this time with the requested hour, not null
     * @throws {DateTimeException} if the hour value is invalid
     */
    withHour(hour=0) {
        if (this._hour === hour) {
            return this;
        }
        return new LocalTime(hour, this._minute, this._second, this._nano);
    }

    /**
     * Returns a copy of this {@link LocalTime} with the minute-of-hour value altered.
     * <p>
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} [minute=0] - the minute-of-hour to set in the result, from 0 to 59
     * @return {LocalTime} a {@link LocalTime} based on this time with the requested minute, not null
     * @throws {DateTimeException} if the minute value is invalid
     */
    withMinute(minute=0) {
        if (this._minute === minute) {
            return this;
        }
        return new LocalTime(this._hour, minute, this._second, this._nano);
    }

    /**
     * Returns a copy of this {@link LocalTime} with the second-of-minute value altered.
     * <p>
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} [second=0] - the second-of-minute to set in the result, from 0 to 59
     * @return {LocalTime} a {@link LocalTime} based on this time with the requested second, not null
     * @throws {DateTimeException} if the second value is invalid
     */
    withSecond(second=0) {
        if (this._second === second) {
            return this;
        }
        return new LocalTime(this._hour, this._minute, second, this._nano);
    }

    /**
     * Returns a copy of this {@link LocalTime} with the nano-of-second value altered.
     * <p>
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} [nanoOfSecond=0] - the nano-of-second to set in the result, from 0 to 999,999,999
     * @return {LocalTime} a {@link LocalTime} based on this time with the requested nanosecond, not null
     * @throws {DateTimeException} if the nanos value is invalid
     */
    withNano(nanoOfSecond=0) {
        if (this._nano === nanoOfSecond) {
            return this;
        }
        return new LocalTime(this._hour, this._minute, this._second, nanoOfSecond);
    }

    //-----------------------------------------------------------------------
    /**
     * Returns a copy of this {@link LocalTime} with the time truncated.
     * <p>
     * Truncating the time returns a copy of the original time with fields
     * smaller than the specified unit set to zero.
     * For example, truncating with the {@link ChronoUnit.MINUTES} minutes unit
     * will set the second-of-minute and nano-of-second field to zero.
     * <p>
     * The unit must have a {@linkplain TemporalUnit#getDuration() duration}
     * that divides into the length of a standard day without remainder.
     * This includes all supplied time units on {@link ChronoUnit} and
     * {@link ChronoUnit.DAYS}. Other units throw an exception.
     * <p>
     * This instance is immutable and unaffected by this method call.
     *
     * @param {!ChronoUnit} unit - the unit to truncate to, not null
     * @return {LocalTime} a {@link LocalTime} based on this time with the time truncated, not null
     * @throws {DateTimeException} if unable to truncate
     */
    truncatedTo(unit) {
        requireNonNull(unit, 'unit');
        if (unit === ChronoUnit.NANOS) {
            return this;
        }
        var unitDur = unit.duration();
        if (unitDur.seconds() > LocalTime.SECONDS_PER_DAY) {
            throw new DateTimeException('Unit is too large to be used for truncation');
        }
        var dur = unitDur.toNanos();
        if (MathUtil.intMod(LocalTime.NANOS_PER_DAY, dur) !== 0) {
            throw new DateTimeException('Unit must divide into a standard day without remainder');
        }
        var nod = this.toNanoOfDay();
        return LocalTime.ofNanoOfDay(MathUtil.intDiv(nod, dur) * dur);
    }

    //-----------------------------------------------------------------------

    /**
     * function overloading for {@link LocalDate.plus}
     *
     * if called with 1 (or less) arguments {@link LocalTime.plus1} is called.
     * Otherwise {@link LocalTime.plus2} is called.
     *
     * @param {!(TemporalAmount|number)} amount
     * @param {ChronoUnit} unit - only required if called with 2 arguments
     * @return {LocalTime}
     */
    plus(amount, unit){
        if(arguments.length < 2){
            return this.plus1(amount);
        } else {
            return this.plus2(amount, unit);
        }
    }

    /**
     * Returns a copy of this date with the specified period added.
     * <p>
     * This method returns a new time based on this time with the specified period added.
     * The amount is typically {@link Period} but may be any other type implementing
     * the {@link TemporalAmount} interface.
     * The calculation is delegated to the specified adjuster, which typically calls
     * back to {@link #plus(long, TemporalUnit)}.
     * <p>
     * This instance is immutable and unaffected by this method call.
     *
     * @param {TemporalAmount} amount - the amount to add, not null
     * @return {LocalTime} a {@link LocalTime} based on this time with the addition made, not null
     * @throws {DateTimeException} if the addition cannot be made
     * @throws {ArithmeticException} if numeric overflow occurs
     */
    plus1(amount) {
        requireNonNull(amount, 'amount');
        return amount.addTo(this);
    }

    /**
     * Returns a copy of this time with the specified period added.
     * <p>
     * This method returns a new time based on this time with the specified period added.
     * This can be used to add any period that is defined by a unit, for example to add hours, minutes or seconds.
     * The unit is responsible for the details of the calculation, including the resolution
     * of any edge cases in the calculation.
     * <p>
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} amountToAdd - the amount of the unit to add to the result, may be negative
     * @param {ChronoUnit} unit - the unit of the period to add, not null
     * @return {LocalTime} a {@link LocalTime} based on this time with the specified period added, not null
     * @throws {DateTimeException} if the unit cannot be added to this type
     */
    plus2(amountToAdd, unit) {
        requireNonNull(unit, 'unit');
        if (unit instanceof ChronoUnit) {
            switch (unit) {
                case ChronoUnit.NANOS: return this.plusNanos(amountToAdd);
                case ChronoUnit.MICROS: return this.plusNanos(MathUtil.intMod(amountToAdd, LocalTime.MICROS_PER_DAY) * 1000);
                case ChronoUnit.MILLIS: return this.plusNanos(MathUtil.intMod(amountToAdd, LocalTime.MILLIS_PER_DAY) * 1000000);
                case ChronoUnit.SECONDS: return this.plusSeconds(amountToAdd);
                case ChronoUnit.MINUTES: return this.plusMinutes(amountToAdd);
                case ChronoUnit.HOURS: return this.plusHours(amountToAdd);
                case ChronoUnit.HALF_DAYS: return this.plusHours(MathUtil.intMod(amountToAdd, 2) * 12);
            }
            throw new UnsupportedTemporalTypeException('Unsupported unit: ' + unit);
        }
        return unit.addTo(this, amountToAdd);
    }

    //-----------------------------------------------------------------------
    /**
     * Returns a copy of this {@link LocalTime} with the specified period in hours added.
     * <p>
     * This adds the specified number of hours to this time, returning a new time.
     * The calculation wraps around midnight.
     * <p>
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} hoursToAdd - the hours to add, may be negative
     * @return {LocalTime} a {@link LocalTime} based on this time with the hours added, not null
     */
    plusHours(hoursToAdd) {
        if (hoursToAdd === 0) {
            return this;
        }

        var newHour = MathUtil.intMod(MathUtil.intMod(hoursToAdd, LocalTime.HOURS_PER_DAY) + this._hour + LocalTime.HOURS_PER_DAY, LocalTime.HOURS_PER_DAY);
        return new LocalTime(newHour, this._minute, this._second, this._nano);
    }

    /**
     * Returns a copy of this {@link LocalTime} with the specified period in minutes added.
     * <p>
     * This adds the specified number of minutes to this time, returning a new time.
     * The calculation wraps around midnight.
     * <p>
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} minutesToAdd - the minutes to add, may be negative
     * @return {LocalTime} a {@link LocalTime} based on this time with the minutes added, not null
     */
    plusMinutes(minutesToAdd) {
        if (minutesToAdd === 0) {
            return this;
        }
        var mofd = this._hour * LocalTime.MINUTES_PER_HOUR + this._minute;
        var newMofd = MathUtil.intMod(MathUtil.intMod(minutesToAdd, LocalTime.MINUTES_PER_DAY) + mofd + LocalTime.MINUTES_PER_DAY, LocalTime.MINUTES_PER_DAY);
        if (mofd === newMofd) {
            return this;
        }
        var newHour = MathUtil.intDiv(newMofd, LocalTime.MINUTES_PER_HOUR);
        var newMinute = MathUtil.intMod(newMofd, LocalTime.MINUTES_PER_HOUR);
        return new LocalTime(newHour, newMinute, this._second, this._nano);
    }

    /**
     * Returns a copy of this {@link LocalTime} with the specified period in seconds added.
     * <p>
     * This adds the specified number of seconds to this time, returning a new time.
     * The calculation wraps around midnight.
     * <p>
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} secondstoAdd - the seconds to add, may be negative
     * @return {LocalTime} a {@link LocalTime} based on this time with the seconds added, not null
     */
    plusSeconds(secondstoAdd) {
        if (secondstoAdd === 0) {
            return this;
        }
        var sofd = this._hour * LocalTime.SECONDS_PER_HOUR +
                    this._minute * LocalTime.SECONDS_PER_MINUTE + this._second;
        var newSofd = MathUtil.intMod((MathUtil.intMod(secondstoAdd, LocalTime.SECONDS_PER_DAY) + sofd + LocalTime.SECONDS_PER_DAY), LocalTime.SECONDS_PER_DAY);
        if (sofd === newSofd) {
            return this;
        }
        var newHour = MathUtil.intDiv(newSofd, LocalTime.SECONDS_PER_HOUR);
        var newMinute = MathUtil.intMod(MathUtil.intDiv(newSofd, LocalTime.SECONDS_PER_MINUTE), LocalTime.MINUTES_PER_HOUR);
        var newSecond = MathUtil.intMod(newSofd, LocalTime.SECONDS_PER_MINUTE);
        return new LocalTime(newHour, newMinute, newSecond, this._nano);
    }

    /**
     * Returns a copy of this {@link LocalTime} with the specified period in nanoseconds added.
     * <p>
     * This adds the specified number of nanoseconds to this time, returning a new time.
     * The calculation wraps around midnight.
     * <p>
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} nanosToAdd - the nanos to add, may be negative
     * @return {LocalTime} a {@link LocalTime} based on this time with the nanoseconds added, not null
     */
    plusNanos(nanosToAdd) {
        if (nanosToAdd === 0) {
            return this;
        }
        var nofd = this.toNanoOfDay();
        var newNofd = MathUtil.intMod((MathUtil.intMod(nanosToAdd, LocalTime.NANOS_PER_DAY) + nofd + LocalTime.NANOS_PER_DAY), LocalTime.NANOS_PER_DAY);
        if (nofd === newNofd) {
            return this;
        }
        var newHour = MathUtil.intDiv(newNofd, LocalTime.NANOS_PER_HOUR);
        var newMinute = MathUtil.intMod(MathUtil.intDiv(newNofd, LocalTime.NANOS_PER_MINUTE), LocalTime.MINUTES_PER_HOUR);
        var newSecond = MathUtil.intMod(MathUtil.intDiv(newNofd, LocalTime.NANOS_PER_SECOND), LocalTime.SECONDS_PER_MINUTE);
        var newNano = MathUtil.intMod(newNofd, LocalTime.NANOS_PER_SECOND);
        return new LocalTime(newHour, newMinute, newSecond, newNano);
    }

    //-----------------------------------------------------------------------
    /**
     * function overloading for {@link LocalDate.minus}
     *
     * if called with 1 (or less) arguments {@link LocalTime.minus1} is called.
     * Otherwise {@link LocalTime.minus2} is called.
     *
     * @param {!(TemporalAmount|number)} amount
     * @param {ChronoUnit} unit - only required if called with 2 arguments
     * @return {LocalTime}
     */
    minus(amount, unit){
        if(arguments.length < 2){
            return this.minus1(amount);
        } else {
            return this.minus2(amount, unit);
        }
    }

    /**
     * Returns a copy of this time with the specified period subtracted.
     * <p>
     * This method returns a new time based on this time with the specified period subtracted.
     * The amount is typically {@link Period} but may be any other type implementing
     * the {@link TemporalAmount} interface.
     * The calculation is delegated to the specified adjuster, which typically calls
     * back to {@link #minus(long, TemporalUnit)}.
     * <p>
     * This instance is immutable and unaffected by this method call.
     *
     * @param {TemporalAmount} amount - the amount to subtract, not null
     * @return {LocalTime} a {@link LocalTime} based on this time with the subtraction made, not null
     * @throws {DateTimeException} if the subtraction cannot be made
     * @throws {ArithmeticException} if numeric overflow occurs
     */

    minus1(amount) {
        requireNonNull(amount, 'amount');
        return amount.subtractFrom(this);
    }

    /**
     * Returns a copy of this time with the specified period subtracted.
     * <p>
     * This method returns a new time based on this time with the specified period subtracted.
     * This can be used to subtract any period that is defined by a unit, for example to subtract hours, minutes or seconds.
     * The unit is responsible for the details of the calculation, including the resolution
     * of any edge cases in the calculation.
     * <p>
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} amountToSubtract - the amount of the unit to subtract from the result, may be negative
     * @param {ChronoUnit} unit - the unit of the period to subtract, not null
     * @return {LocalTime} a {@link LocalTime} based on this time with the specified period subtracted, not null
     * @throws {DateTimeException} if the unit cannot be added to this type
     */
    minus2(amountToSubtract, unit) {
        requireNonNull(unit, 'unit');
        return this.plus2(-1 * amountToSubtract, unit);
    }

    //-----------------------------------------------------------------------
    /**
     * Returns a copy of this {@link LocalTime} with the specified period in hours subtracted.
     * <p>
     * This subtracts the specified number of hours from this time, returning a new time.
     * The calculation wraps around midnight.
     * <p>
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} hoursToSubtract - the hours to subtract, may be negative
     * @return {LocalTime} a {@link LocalTime} based on this time with the hours subtracted, not null
     */
    minusHours(hoursToSubtract) {
        return this.plusHours(-1 * MathUtil.intMod(hoursToSubtract, LocalTime.HOURS_PER_DAY));
    }

    /**
     * Returns a copy of this {@link LocalTime} with the specified period in minutes subtracted.
     * <p>
     * This subtracts the specified number of minutes from this time, returning a new time.
     * The calculation wraps around midnight.
     * <p>
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} minutesToSubtract - the minutes to subtract, may be negative
     * @return {LocalTime} a {@link LocalTime} based on this time with the minutes subtracted, not null
     */
    minusMinutes(minutesToSubtract) {
        return this.plusMinutes(-1 * MathUtil.intMod(minutesToSubtract, LocalTime.MINUTES_PER_DAY));
    }

    /**
     * Returns a copy of this {@link LocalTime} with the specified period in seconds subtracted.
     * <p>
     * This subtracts the specified number of seconds from this time, returning a new time.
     * The calculation wraps around midnight.
     * <p>
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} secondsToSubtract - the seconds to subtract, may be negative
     * @return {LocalTime} a {@link LocalTime} based on this time with the seconds subtracted, not null
     */
    minusSeconds(secondsToSubtract) {
        return this.plusSeconds(-1 * MathUtil.intMod(secondsToSubtract, LocalTime.SECONDS_PER_DAY));
    }

    /**
     * Returns a copy of this {@link LocalTime} with the specified period in nanoseconds subtracted.
     * <p>
     * This subtracts the specified number of nanoseconds from this time, returning a new time.
     * The calculation wraps around midnight.
     * <p>
     * This instance is immutable and unaffected by this method call.
     *
     * @param {number} nanosToSubtract - the nanos to subtract, may be negative
     * @return {LocalTime} a {@link LocalTime} based on this time with the nanoseconds subtracted, not null
     */
    minusNanos(nanosToSubtract) {
        return this.plusNanos(-1 * MathUtil.intMod(nanosToSubtract, LocalTime.NANOS_PER_DAY));
    }

    //-----------------------------------------------------------------------
    /**
     * Queries this time using the specified query.
     * <p>
     * This queries this time using the specified query strategy object.
     * The {@link TemporalQuery} object defines the logic to be used to
     * obtain the result. Read the documentation of the query to understand
     * what the result of this method will be.
     * <p>
     * The result of this method is obtained by invoking the
     * {@link TemporalQuery#queryFrom(TemporalAccessor)} method on the
     * specified query passing this as the argument.
     *
     * @param {TemporalQuery} query - the query to invoke, not null
     * @return {*} the query result, null may be returned (defined by the query)
     * @throws {DateTimeException} if unable to query (defined by the query)
     * @throws {ArithmeticException} if numeric overflow occurs (defined by the query)
     */
    query(query) {
        requireNonNull(query, 'query');
        if (query === TemporalQueries.precision()) {
            return ChronoUnit.NANOS;
        } else if (query === TemporalQueries.localTime()) {
            return this;
        }
        // inline TemporalAccessor.super.query(query) as an optimization
        if (query === TemporalQueries.chronology() || query === TemporalQueries.zoneId() ||
                query === TemporalQueries.zone() || query === TemporalQueries.offset() ||
                query === TemporalQueries.localDate()) {
            return null;
        }
        return query.queryFrom(this);
    }

    /**
     * Adjusts the specified temporal object to have the same time as this object.
     * <p>
     * This returns a temporal object of the same observable type as the input
     * with the time changed to be the same as this.
     * <p>
     * The adjustment is equivalent to using {@link Temporal.with}
     * passing {@link ChronoField.NANO_OF_DAY} as the field.
     * <p>
     * In most cases, it is clearer to reverse the calling pattern by using
     * {@link Temporal.with}:
     * <pre>
     *   // these two lines are equivalent, but the second approach is recommended
     *   temporal = thisLocalTime.adjustInto(temporal);
     *   temporal = temporal.with(thisLocalTime);
     * </pre>
     * <p>
     * This instance is immutable and unaffected by this method call.
     *
     * @param {TemporalAdjuster} temporal - the target object to be adjusted, not null
     * @return {Temporal} the adjusted object, not null
     * @throws {DateTimeException} if unable to make the adjustment
     * @throws {ArithmeticException} if numeric overflow occurs
     */
    adjustInto(temporal) {
        return temporal.with(LocalTime.NANO_OF_DAY, this.toNanoOfDay());
    }

    /**
     * Calculates the period between this time and another time in
     * terms of the specified unit.
     * <p>
     * This calculates the period between two times in terms of a single unit.
     * The start and end points are this and the specified time.
     * The result will be negative if the end is before the start.
     * The {@link Temporal} passed to this method must be a {@link LocalTime}.
     * For example, the period in hours between two times can be calculated
     * using {@code startTime.until(endTime, HOURS)}.
     * <p>
     * The calculation returns a whole number, representing the number of
     * complete units between the two times.
     * For example, the period in hours between 11:30 and 13:29 will only
     * be one hour as it is one minute short of two hours.
     * <p>
     * This method operates in association with {@link TemporalUnit.between}.
     * The result of this method is a {@code long} representing the amount of
     * the specified unit. By contrast, the result of {@code between} is an
     * object that can be used directly in addition/subtraction:
     * <pre>
     *   long period = start.until(end, HOURS);   // this method
     *   dateTime.plus(HOURS.between(start, end));      // use in plus/minus
     * </pre>
     * <p>
     * The calculation is implemented in this method for {@link ChronoUnit}.
     * The units {@link ChronoUnit.NANOS}, {@link ChronoUnit.MICROS}, {@link ChronoUnit.MILLIS}, {@link ChronoUnit.SECONDS},
     * {@link ChronoUnit.MINUTES}, {@link ChronoUnit.HOURS} and {@link ChronoUnit.HALF_DAYS} are supported.
     * Other {@link ChronoUnit} values will throw an exception.
     * <p>
     * If the unit is not a {@link ChronoUnit}, then the result of this method
     * is obtained by invoking {@link TemporalUnit.between}
     * passing this as the first argument and the input temporal as
     * the second argument.
     * <p>
     * This instance is immutable and unaffected by this method call.
     *
     * @param {TemporalAccessor} endExclusive - the end time, which is converted to a {@link LocalTime}, not null
     * @param {ChronoUnit} unit - the unit to measure the period in, not null
     * @return {number} the amount of the period between this time and the end time
     * @throws {DateTimeException} if the period cannot be calculated
     * @throws {ArithmeticException} if numeric overflow occurs
     */
    until(endExclusive, unit) {
        var end = LocalTime.from(endExclusive);
        if (unit instanceof ChronoUnit) {
            var nanosUntil = end.toNanoOfDay() - this.toNanoOfDay();  // no overflow
            switch (unit) {
                case ChronoUnit.NANOS: return nanosUntil;
                case ChronoUnit.MICROS: return MathUtil.intDiv(nanosUntil, 1000);
                case ChronoUnit.MILLIS: return MathUtil.intDiv(nanosUntil, 1000000);
                case ChronoUnit.SECONDS: return MathUtil.intDiv(nanosUntil, LocalTime.NANOS_PER_SECOND);
                case ChronoUnit.MINUTES: return MathUtil.intDiv(nanosUntil, LocalTime.NANOS_PER_MINUTE);
                case ChronoUnit.HOURS: return MathUtil.intDiv(nanosUntil, LocalTime.NANOS_PER_HOUR);
                case ChronoUnit.HALF_DAYS: return MathUtil.intDiv(nanosUntil, (12 * LocalTime.NANOS_PER_HOUR));
            }
            throw new UnsupportedTemporalTypeException('Unsupported unit: ' + unit);
        }
        return unit.between(this, end);
    }

    //-----------------------------------------------------------------------
    /**
     * Combines this time with a date to create a {@link LocalDateTime}.
     * <p>
     * This returns a {@link LocalDateTime} formed from this time at the specified date.
     * All possible combinations of date and time are valid.
     *
     * @param {LocalDate} date - the date to combine with, not null
     * @return {LocalDateTime} the local date-time formed from this time and the specified date, not null
     */
    atDate(date) {
        return LocalDateTime.of(date, this);
    }

    /**
     * Combines this time with an offset to create an {@link OffsetTime}.
     * <p>
     * This returns an {@link OffsetTime} formed from this time at the specified offset.
     * All possible combinations of time and offset are valid.
     *
     * @param {OffsetTime} offset - the offset to combine with, not null
     * @return {OffsetTime} the offset time formed from this time and the specified offset, not null
     */
/*
    atOffset(offset) {
        return OffsetTime.of(this, offset);
    }
*/

    //-----------------------------------------------------------------------
    /**
     * Extracts the time as seconds of day,
     * from {@code 0} to {@code 24 * 60 * 60 - 1}.
     *
     * @return {number} the second-of-day equivalent to this time
     */
    toSecondOfDay() {
        var total = this._hour * LocalTime.SECONDS_PER_HOUR;
        total += this._minute * LocalTime.SECONDS_PER_MINUTE;
        total += this._second;
        return total;
    }

    /**
     * Extracts the time as nanos of day,
     * from {@code 0} to {@code 24 * 60 * 60 * 1,000,000,000 - 1}.
     *
     * @return {number} the nano of day equivalent to this time
     */
    toNanoOfDay() {
        var total = this._hour * LocalTime.NANOS_PER_HOUR;
        total += this._minute * LocalTime.NANOS_PER_MINUTE;
        total += this._second * LocalTime.NANOS_PER_SECOND;
        total += this._nano;
        return total;
    }

    //-----------------------------------------------------------------------
    /**
     * Compares this {@link LocalTime} to another time.
     * <p>
     * The comparison is based on the time-line position of the local times within a day.
     * It is 'consistent with equals', as defined by {@link Comparable}.
     *
     * @param {LocalTime} other - the other time to compare to, not null
     * @return {number} the comparator value, negative if less, positive if greater
     * @throws {NullPointerException} if {@code other} is null
     */
    compareTo(other) {
        requireNonNull(other, 'other');
        requireInstance(other, LocalTime, 'other');
        var cmp = MathUtil.compareNumbers(this._hour, other._hour);
        if (cmp === 0) {
            cmp = MathUtil.compareNumbers(this._minute, other._minute);
            if (cmp === 0) {
                cmp = MathUtil.compareNumbers(this._second, other._second);
                if (cmp === 0) {
                    cmp = MathUtil.compareNumbers(this._nano, other._nano);
                }
            }
        }
        return cmp;
    }

    /**
     * Checks if this {@link LocalTime} is after the specified time.
     * <p>
     * The comparison is based on the time-line position of the time within a day.
     *
     * @param {LocalTime} other - the other time to compare to, not null
     * @return {boolean}true if this is after the specified time
     * @throws {NullPointerException} if {@code other} is null
     */
    isAfter(other) {
        return this.compareTo(other) > 0;
    }

    /**
     * Checks if this {@link LocalTime} is before the specified time.
     * <p>
     * The comparison is based on the time-line position of the time within a day.
     *
     * @param {LocalTime} other - the other time to compare to, not null
     * @return {boolean}true if this point is before the specified time
     * @throws {NullPointerException} if {@code other} is null
     */
    isBefore(other) {
        return this.compareTo(other) < 0;
    }

    //-----------------------------------------------------------------------
    /**
     * Checks if this time is equal to another time.
     * <p>
     * The comparison is based on the time-line position of the time within a day.
     * <p>
     * Only objects of type {@link LocalTime} are compared, other types return false.
     * To compare the date of two {@link TemporalAccessor} instances, use
     * {@link ChronoField#NANO_OF_DAY} as a comparator.
     *
     * @param {*} other - the object to check, null returns false
     * @return {boolean}true if this is equal to the other time
     */
    equals(other) {
        if (this === other) {
            return true;
        }
        if (other instanceof LocalTime) {
            return this._hour === other._hour && this._minute === other._minute &&
                this._second === other._second && this._nano === other._nano;
        }
        return false;
    }

    /**
     * A hash code for this time.
     *
     * @return {number} a suitable hash code
     */
    hashCode() {
        var nod = this.toNanoOfDay();
        return (nod ^ (nod >>> 24));
    }

    //-----------------------------------------------------------------------
    /**
     * Outputs this time as a {@link String}, such as {@code 10:15}.
     * <p>
     * The output will be one of the following ISO-8601 formats:
     * <p><ul>
     * <li>{@code HH:mm}</li>
     * <li>{@code HH:mm:ss}</li>
     * <li>{@code HH:mm:ss.SSS}</li>
     * <li>{@code HH:mm:ss.SSSSSS}</li>
     * <li>{@code HH:mm:ss.SSSSSSSSS}</li>
     * </ul><p>
     * The format used will be the shortest that outputs the full value of
     * the time where the omitted parts are implied to be zero.
     *
     * @return {string} a string representation of this time, not null
     */
    toString() {
        var buf = '';
        var hourValue = this._hour;
        var minuteValue = this._minute;
        var secondValue = this._second;
        var nanoValue = this._nano;
        buf += hourValue < 10 ? '0' : '';
        buf += hourValue;
        buf += minuteValue < 10 ? ':0' : ':';
        buf += minuteValue;
        if (secondValue > 0 || nanoValue > 0) {
            buf += secondValue < 10 ? ':0' : ':';
            buf += secondValue;
            if (nanoValue > 0) {
                buf += '.';
                if(MathUtil.intMod(nanoValue, 1000000) === 0) {
                    buf += ('' + (MathUtil.intDiv(nanoValue, 1000000) + 1000)).substring(1);
                } else if (MathUtil.intMod(nanoValue, 1000) === 0) {
                    buf += ('' + (MathUtil.intDiv(nanoValue, 1000) + 1000000)).substring(1);
                } else {
                    buf += ('' + (nanoValue + 1000000000)).substring(1);
                }
            }
        }
        return buf;
    }

    /**
     * Outputs this time as a {@link String} using the formatter.
     * <p>
     * This time will be passed to the formatter
     * {@link DateTimeFormatter#format(TemporalAccessor) print method}.
     *
     * @param {DateTineFormatter} formatter - the formatter to use, not null
     * @return {string} the formatted time string, not null
     * @throws {DateTimeException} if an error occurs during printing
     */
    format(formatter) {
        requireNonNull(formatter, 'formatter');
        return formatter.format(this);
    }
}

export function _init() {
    /**
     * Constants for the local time of each hour.
     */
    LocalTime.HOURS = [];
    for (let i = 0; i < 24; i++) {
        LocalTime.HOURS[i] = makeLocalTimeConst(i);
    }

    function makeLocalTimeConst(hour = 0, minute = 0, second = 0, nano = 0) {
        var localTime = Object.create(LocalTime.prototype);
        TemporalAccessor.call(localTime);
        localTime._hour = hour;
        localTime._minute = minute;
        localTime._second = second;
        localTime._nano = nano;
        return localTime;
    }

    /**
     * The minimum supported {@link LocalTime}, '00:00'.
     * This is the time of midnight at the start of the day.
     */
    LocalTime.MIN = LocalTime.HOURS[0];
    /**
     * The maximum supported {@link LocalTime}, '23:59:59.999999999'.
     * This is the time just before midnight at the end of the day.
     */
    LocalTime.MAX = makeLocalTimeConst(23, 59, 59, 999999999);
    /**
     * The time of midnight at the start of the day, '00:00'.
     */
    LocalTime.MIDNIGHT = LocalTime.HOURS[0];
    /**
     * The time of noon in the middle of the day, '12:00'.
     */
    LocalTime.NOON = LocalTime.HOURS[12];

    LocalTime.FROM = createTemporalQuery('LocalTime.FROM', (temporal) => {
        return LocalTime.from(temporal);
    });

    /**
     * Hours per day.
     */
    LocalTime.HOURS_PER_DAY = 24;
    /**
     * Minutes per hour.
     */
    LocalTime.MINUTES_PER_HOUR = 60;
    /**
     * Minutes per day.
     */
    LocalTime.MINUTES_PER_DAY = LocalTime.MINUTES_PER_HOUR * LocalTime.HOURS_PER_DAY;
    /**
     * Seconds per minute.
     */
    LocalTime.SECONDS_PER_MINUTE = 60;
    /**
     * Seconds per hour.
     */
    LocalTime.SECONDS_PER_HOUR = LocalTime.SECONDS_PER_MINUTE * LocalTime.MINUTES_PER_HOUR;
    /**
     * Seconds per day.
     */
    LocalTime.SECONDS_PER_DAY = LocalTime.SECONDS_PER_HOUR * LocalTime.HOURS_PER_DAY;
    /**
     * Milliseconds per day.
     */
    LocalTime.MILLIS_PER_DAY = LocalTime.SECONDS_PER_DAY * 1000;
    /**
     * Microseconds per day.
     */
    LocalTime.MICROS_PER_DAY = LocalTime.SECONDS_PER_DAY * 1000000;
    /**
     * Nanos per second.
     */
    LocalTime.NANOS_PER_SECOND = 1000000000;
    /**
     * Nanos per minute.
     */
    LocalTime.NANOS_PER_MINUTE = LocalTime.NANOS_PER_SECOND * LocalTime.SECONDS_PER_MINUTE;
    /**
     * Nanos per hour.
     */
    LocalTime.NANOS_PER_HOUR = LocalTime.NANOS_PER_MINUTE * LocalTime.MINUTES_PER_HOUR;
    /**
     * Nanos per day.
     */
    LocalTime.NANOS_PER_DAY = LocalTime.NANOS_PER_HOUR * LocalTime.HOURS_PER_DAY;
}