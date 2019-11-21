/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getEmptyValue } from '../empty_value';
import {
  getFormattedDurationString,
  getHumanizedDuration,
  ONE_DAY,
  ONE_HOUR,
  ONE_MILLISECOND_AS_NANOSECONDS,
  ONE_MINUTE,
  ONE_MONTH,
  ONE_SECOND,
  ONE_YEAR,
} from './helpers';
import * as i18n from './translations';

describe('FormattedDurationHelpers', () => {
  describe('#getFormattedDurationString', () => {
    test('it returns a placeholder when the input is undefined', () => {
      expect(getFormattedDurationString(undefined)).toEqual(getEmptyValue());
    });

    test('it returns a placeholder when the input is null', () => {
      expect(getFormattedDurationString(null)).toEqual(getEmptyValue());
    });

    test('it echos back the input as a string when the input is not a number', () => {
      expect(getFormattedDurationString('invalid duration')).toEqual('invalid duration');
    });

    test('it returns the original input (with no formatting) when the input is negative', () => {
      expect(getFormattedDurationString(-1)).toEqual('-1');
    });

    test('it returns the duration formatted as 0 nanoseconds when the input is 0 nanoseconds', () => {
      expect(getFormattedDurationString(0)).toEqual('0ns');
    });

    test('it returns 1 nanosecond when the input is 1 nanosecond', () => {
      expect(getFormattedDurationString(1)).toEqual('1ns');
    });

    test('it returns 1000 nanoseconds when the input is 1000 nanoseconds', () => {
      expect(getFormattedDurationString(1000)).toEqual('1000ns');
    });

    test('it returns 1000 nanoseconds when the input is a string ("1000") instead of a number', () => {
      expect(getFormattedDurationString('1000')).toEqual('1000ns');
    });

    test('it returns the largest value that would be represented as nanoseconds when the input is 1 millisecond - 1 nanosecond', () => {
      expect(getFormattedDurationString(ONE_MILLISECOND_AS_NANOSECONDS - 1)).toEqual('999999ns');
    });

    test('it returns exactly 1 millisecond (with no fractional component) when the input is exactly one millisecond', () => {
      expect(getFormattedDurationString(ONE_MILLISECOND_AS_NANOSECONDS)).toEqual('1ms');
    });

    test('it returns 1 millisecond with a fractional component when the input is 1 millisecond + 1 nanosecond', () => {
      expect(getFormattedDurationString(ONE_MILLISECOND_AS_NANOSECONDS + 1)).toEqual('1.000001ms');
    });

    test('it returns the largest value (in milliseconds) that would be represented as milliseconds with a fractional component when the input is 1 second - 1 nanosecond', () => {
      expect(getFormattedDurationString(ONE_SECOND * ONE_MILLISECOND_AS_NANOSECONDS - 1)).toEqual(
        '999.999999ms'
      );
    });

    test('it returns exactly one second (with no millisecond component) when the input is exactly one second', () => {
      expect(getFormattedDurationString(ONE_SECOND * ONE_MILLISECOND_AS_NANOSECONDS)).toEqual('1s');
    });

    test('it returns one second with fractional milliseconds when the input is one second + 1 nanosecond', () => {
      expect(getFormattedDurationString(ONE_SECOND * ONE_MILLISECOND_AS_NANOSECONDS + 1)).toEqual(
        '1s 0.000001ms'
      );
    });

    test('it returns one second with fractional milliseconds when the input is 1 second + 1 millisecond - 1 nanosecond', () => {
      expect(
        getFormattedDurationString(
          ONE_SECOND * ONE_MILLISECOND_AS_NANOSECONDS + ONE_MILLISECOND_AS_NANOSECONDS - 1
        )
      ).toEqual('1s 0.999999ms');
    });

    test('it returns 1 second, 1 non-fractional millisecond when the input is 1 second + 1 millisecond', () => {
      expect(
        getFormattedDurationString(
          ONE_SECOND * ONE_MILLISECOND_AS_NANOSECONDS + ONE_MILLISECOND_AS_NANOSECONDS
        )
      ).toEqual('1s 1ms');
    });

    test('it returns 1 seconds with fractional milliseconds when the input is 1 second + 1 millisecond + 1 nanosecond', () => {
      expect(
        getFormattedDurationString(
          ONE_SECOND * ONE_MILLISECOND_AS_NANOSECONDS + ONE_MILLISECOND_AS_NANOSECONDS + 1
        )
      ).toEqual('1s 1.000001ms');
    });

    test('it returns 1 seconds with fractional milliseconds when the input is 1 second + 2 milliseconds - 1 nanosecond', () => {
      expect(
        getFormattedDurationString(
          ONE_SECOND * ONE_MILLISECOND_AS_NANOSECONDS + 2 * ONE_MILLISECOND_AS_NANOSECONDS - 1
        )
      ).toEqual('1s 1.999999ms');
    });

    test('it returns 59 seconds with fractional milliseconds when the input is 1 minute - 1 nanosecond', () => {
      expect(getFormattedDurationString(ONE_MINUTE * ONE_MILLISECOND_AS_NANOSECONDS - 1)).toEqual(
        '59s 999.999999ms'
      );
    });

    test('it returns 1 minute with 0 non-fractional seconds (and no milliseconds) when the input is exactly 1 minute', () => {
      expect(getFormattedDurationString(ONE_MINUTE * ONE_MILLISECOND_AS_NANOSECONDS)).toEqual(
        '1m 0s'
      );
    });

    test('it returns 1 minute, 0 seconds, and fractional milliseconds when the input is 1 minute + 1 nanosecond', () => {
      expect(getFormattedDurationString(ONE_MINUTE * ONE_MILLISECOND_AS_NANOSECONDS + 1)).toEqual(
        '1m 0s 0.000001ms'
      );
    });

    test('it returns the duration formatted as 1 minute, 59 seconds and fractional milliseconds when the input is 2 minutes - 1 nanosecond', () => {
      expect(
        getFormattedDurationString(2 * ONE_MINUTE * ONE_MILLISECOND_AS_NANOSECONDS - 1)
      ).toEqual('1m 59s 999.999999ms');
    });

    test('it returns the duration formatted as 59 minutes, 59 seconds and fractional milliseconds when the input is one hour - 1 nanosecond', () => {
      expect(getFormattedDurationString(ONE_HOUR * ONE_MILLISECOND_AS_NANOSECONDS - 1)).toEqual(
        '59m 59s 999.999999ms'
      );
    });

    test('it returns the duration formatted as 1 hour, 0 minutes, 0 seconds, (and no milliseconds) when the duration is exactly one hour', () => {
      expect(getFormattedDurationString(ONE_HOUR * ONE_MILLISECOND_AS_NANOSECONDS)).toEqual(
        '1h 0m 0s'
      );
    });

    test('it returns the duration formatted as 1 hour, 0 minutes and seconds, and fractional milliseconds when the duration is exactly 1 hour + 1 nanosecond', () => {
      expect(getFormattedDurationString(ONE_HOUR * ONE_MILLISECOND_AS_NANOSECONDS + 1)).toEqual(
        '1h 0m 0s 0.000001ms'
      );
    });

    test('it returns the duration formatted as 23 hours, 59 minutes, 59 seconds, and fractional milliseconds when the duration is one day - 1 nanosecond', () => {
      expect(getFormattedDurationString(ONE_DAY * ONE_MILLISECOND_AS_NANOSECONDS - 1)).toEqual(
        '23h 59m 59s 999.999999ms'
      );
    });

    test('it returns the duration formatted as 1 day, 0 hours, 0 minutes, and 0 seconds, (and no milliseconds) when the duration is exactly one day', () => {
      expect(getFormattedDurationString(ONE_DAY * ONE_MILLISECOND_AS_NANOSECONDS)).toEqual(
        '1d 0h 0m 0s'
      );
    });

    test('it returns the duration formatted as one day, with zero hours, minutes, seconds, and fractional milliseconds when the duration is one day + 1 nanosecond', () => {
      expect(getFormattedDurationString(ONE_DAY * ONE_MILLISECOND_AS_NANOSECONDS + 1)).toEqual(
        '1d 0h 0m 0s 0.000001ms'
      );
    });

    test('it returns the duration formatted as 29 days, 23 hours, 59 minutes, 59 seconds, and with fractional milliseconds when the duration is one month - 1 nanosecond', () => {
      expect(getFormattedDurationString(ONE_MONTH * ONE_MILLISECOND_AS_NANOSECONDS - 1)).toEqual(
        '29d 23h 59m 59s 999.999999ms'
      );
    });

    test('it returns 30 days, zero hours, minutes, seconds, (and no millieconds) when the duration is exactly one month, as is the current behavior of moment', () => {
      expect(getFormattedDurationString(ONE_MONTH * ONE_MILLISECOND_AS_NANOSECONDS)).toEqual(
        '30d 0h 0m 0s' // see https://github.com/moment/moment/issues/3653
      );
    });

    test('it returns the duration as 29 days, 23 hours, 59 minutes, 59 seconds, and fractional milliseconds when the duration is 1 month - 1 nanosecond', () => {
      expect(getFormattedDurationString(ONE_MONTH * ONE_MILLISECOND_AS_NANOSECONDS - 1)).toEqual(
        '29d 23h 59m 59s 999.999999ms' // see https://github.com/moment/moment/issues/3653
      );
    });

    test('it returns 1 month, zero days, hours, minutes, seconds (and no milliseconds) month when the duration is exactly 1 month + 1 day, as is the current behavior of moment', () => {
      expect(
        getFormattedDurationString((ONE_MONTH + ONE_DAY) * ONE_MILLISECOND_AS_NANOSECONDS)
      ).toEqual(
        '1m 0d 0h 0m 0s' // see https://github.com/moment/moment/issues/3653
      );
    });

    test('it returns the 1 month with 0 days, hours, minutes, seconds, and fractional milliseconds when the duration is exactly 1 month + 1 day + 1 nanosecond, ', () => {
      expect(
        getFormattedDurationString((ONE_MONTH + ONE_DAY) * ONE_MILLISECOND_AS_NANOSECONDS + 1)
      ).toEqual(
        '1m 0d 0h 0m 0s 0.000001ms' // see https://github.com/moment/moment/issues/3653
      );
    });

    test('it returns 11 months, 30 days (with 0 hours, minutes, and non-fractional seconds) when the duration is exactly one year, as is the current behavior of moment', () => {
      expect(getFormattedDurationString(ONE_YEAR * ONE_MILLISECOND_AS_NANOSECONDS)).toEqual(
        '11m 30d 0h 0m 0s' // see https://github.com/moment/moment/issues/3209
      );
    });

    test('it returns one year when the duration is exactly 1 year + 1 day, as is the current behavior of moment', () => {
      expect(
        getFormattedDurationString((ONE_YEAR + ONE_DAY) * ONE_MILLISECOND_AS_NANOSECONDS)
      ).toEqual(
        '1y 0m 0d 0h 0m 0s' // see https://github.com/moment/moment/issues/3209
      );
    });

    test('it returns less than 6 months when input is 1 year + 6 months, as is the current behavior of moment', () => {
      expect(
        getFormattedDurationString((ONE_YEAR + 6 * ONE_MONTH) * ONE_MILLISECOND_AS_NANOSECONDS)
      ).toEqual('1y 5m 27d 0h 0m 0s'); // see https://github.com/moment/moment/issues/3209
    });
  });

  describe('#getHumanizedDuration', () => {
    test('it returns "no duration" when the input is undefined', () => {
      expect(getHumanizedDuration(undefined)).toEqual(i18n.NO_DURATION);
    });

    test('it returns "no duration" when the input is null', () => {
      expect(getHumanizedDuration(null)).toEqual(i18n.NO_DURATION);
    });

    test('it returns "invalid duration" when the input is not a number', () => {
      expect(getHumanizedDuration('an invalid duration')).toEqual(i18n.INVALID_DURATION);
    });

    test('it returns the original "invalid duration" when the input is negative', () => {
      expect(getHumanizedDuration(-1)).toEqual(i18n.INVALID_DURATION);
    });

    test('it returns "zero nanoseconds" when the input is 0 nanoseconds', () => {
      expect(getHumanizedDuration(0)).toEqual(i18n.ZERO_NANOSECONDS);
    });

    test('it returns "a nanosecond" nanosecond when the input is 1 nanosecond', () => {
      expect(getHumanizedDuration(1)).toEqual(i18n.A_NANOSECOND);
    });

    test('it returns "a few nanoseconds" when the input is 1000 nanoseconds', () => {
      expect(getHumanizedDuration(1000)).toEqual(i18n.A_FEW_NANOSECONDS);
    });

    test('it returns 1000 nanoseconds when the input is a string ("1000") instead of a number', () => {
      expect(getHumanizedDuration('1000')).toEqual(i18n.A_FEW_NANOSECONDS);
    });

    test('it returns "a few nanoseconds" given the largest value that would be represented as nanoseconds', () => {
      expect(getHumanizedDuration(ONE_MILLISECOND_AS_NANOSECONDS - 1)).toEqual(
        i18n.A_FEW_NANOSECONDS
      );
    });

    test('it returns "a millisecond" when the input is exactly one millisecond', () => {
      expect(getHumanizedDuration(ONE_MILLISECOND_AS_NANOSECONDS)).toEqual(i18n.A_MILLISECOND);
    });

    test('it returns "a few milliseconds" when the input is 1 millisecond + 1 nanosecond', () => {
      expect(getHumanizedDuration(ONE_MILLISECOND_AS_NANOSECONDS + 1)).toEqual(
        i18n.A_FEW_MILLISECONDS
      );
    });

    test('it returns "a few milliseconds" when the input is the maximum value for milliseconds', () => {
      expect(getHumanizedDuration(ONE_SECOND * ONE_MILLISECOND_AS_NANOSECONDS - 1)).toEqual(
        i18n.A_FEW_MILLISECONDS
      );
    });

    test('it returns "a second" when the input is exactly one second', () => {
      expect(getHumanizedDuration(ONE_SECOND * ONE_MILLISECOND_AS_NANOSECONDS)).toEqual(
        i18n.A_SECOND
      );
    });

    test('it returns "a few seconds" when the input is one second + 1 nanosecond', () => {
      expect(getHumanizedDuration(ONE_SECOND * ONE_MILLISECOND_AS_NANOSECONDS + 1)).toEqual(
        'a few seconds' // <-- note for this and the rest of the tests in this 'describe', this value is coming from moment, which has it's own i18n
      );
    });

    test('it rounds to "a minute" when the input is 45 seconds', () => {
      expect(getHumanizedDuration(45 * ONE_SECOND * ONE_MILLISECOND_AS_NANOSECONDS)).toEqual(
        'a minute' // <-- debatable, but thats' how moment describes this
      );
    });

    test('it rounds to "a minute" when the input is 1 minute - 1 nanosecond', () => {
      expect(getHumanizedDuration(ONE_MINUTE * ONE_MILLISECOND_AS_NANOSECONDS - 1)).toEqual(
        'a minute'
      );
    });

    test('it returns "a minute" when the input is exactly 1 minute', () => {
      expect(getHumanizedDuration(ONE_MINUTE * ONE_MILLISECOND_AS_NANOSECONDS)).toEqual('a minute');
    });

    test('it rounds to "a minute" when the input is 1 minute + 1 nanosecond', () => {
      expect(getHumanizedDuration(ONE_MINUTE * ONE_MILLISECOND_AS_NANOSECONDS + 1)).toEqual(
        'a minute'
      );
    });

    test('it rounds to "two minutes" when the input is 2 minutes - 1 nanosecond', () => {
      expect(getHumanizedDuration(2 * ONE_MINUTE * ONE_MILLISECOND_AS_NANOSECONDS - 1)).toEqual(
        '2 minutes'
      );
    });

    test('it rounds to "an hour" when the input is one hour - 1 nanosecond', () => {
      expect(getHumanizedDuration(ONE_HOUR * ONE_MILLISECOND_AS_NANOSECONDS - 1)).toEqual(
        'an hour'
      );
    });

    test('it returns "an hour" when the input is exactly one hour', () => {
      expect(getHumanizedDuration(ONE_HOUR * ONE_MILLISECOND_AS_NANOSECONDS)).toEqual('an hour');
    });

    test('it rounds to "an hour" when the input 1 hour + 1 nanosecond', () => {
      expect(getHumanizedDuration(ONE_HOUR * ONE_MILLISECOND_AS_NANOSECONDS + 1)).toEqual(
        'an hour'
      );
    });

    test('it returns "2 hours" when the input is exactly 2 hours', () => {
      expect(getHumanizedDuration(2 * ONE_HOUR * ONE_MILLISECOND_AS_NANOSECONDS)).toEqual(
        '2 hours'
      );
    });

    test('it rounds to "a day" when the input is one day - 1 nanosecond', () => {
      expect(getHumanizedDuration(ONE_DAY * ONE_MILLISECOND_AS_NANOSECONDS - 1)).toEqual('a day');
    });

    test('it returns "a day" when the input is exactly one day', () => {
      expect(getHumanizedDuration(ONE_DAY * ONE_MILLISECOND_AS_NANOSECONDS)).toEqual('a day');
    });

    test('it rounds to "a day" when the input is one day + 1 nanosecond', () => {
      expect(getHumanizedDuration(ONE_DAY * ONE_MILLISECOND_AS_NANOSECONDS + 1)).toEqual('a day');
    });

    test('it returns "2 days" when the input is exactly two days', () => {
      expect(getHumanizedDuration(2 * ONE_DAY * ONE_MILLISECOND_AS_NANOSECONDS)).toEqual('2 days');
    });

    test('it rounds to "a month" when the input is one month - 1 nanosecond', () => {
      expect(getHumanizedDuration(ONE_MONTH * ONE_MILLISECOND_AS_NANOSECONDS - 1)).toEqual(
        'a month'
      );
    });

    test('it returns "a month" when the input is exactly one month', () => {
      expect(getHumanizedDuration(ONE_MONTH * ONE_MILLISECOND_AS_NANOSECONDS)).toEqual('a month');
    });

    test('it rounds to "a month" when the input is 1 month + 1 day', () => {
      expect(getHumanizedDuration((ONE_MONTH + ONE_DAY) * ONE_MILLISECOND_AS_NANOSECONDS)).toEqual(
        'a month'
      );
    });

    test('it returns "2 months" when the input is 2 months', () => {
      expect(getHumanizedDuration(2 * ONE_MONTH * ONE_MILLISECOND_AS_NANOSECONDS)).toEqual(
        '2 months'
      );
    });

    test('it returns "a year" when the input is exactly one year', () => {
      expect(getHumanizedDuration(ONE_YEAR * ONE_MILLISECOND_AS_NANOSECONDS)).toEqual('a year');
    });

    test('it rounds down to "a year" when the input is 1 year + 6 months, as is the current behavior of moment', () => {
      expect(
        getHumanizedDuration((ONE_YEAR + 6 * ONE_MONTH) * ONE_MILLISECOND_AS_NANOSECONDS)
      ).toEqual('a year'); // <-- as a user, you may not expect this
    });

    test('it returns "2 years" when the duration is exactly 2 years', () => {
      expect(getHumanizedDuration(2 * ONE_YEAR * ONE_MILLISECOND_AS_NANOSECONDS)).toEqual(
        '2 years'
      );
    });
  });
});
