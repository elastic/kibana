/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { RRuleFrequency } from '../../../../../../types';
import {
  buildCustomRecurrenceSchedulerState,
  generateNthByweekday,
  getInitialByweekday,
  getWeekdayInfo,
  recurrenceSummary,
  rRuleWeekdayToWeekdayName,
} from './helpers';

describe('Recurrence scheduler helper', () => {
  describe('getWeekdayInfo', () => {
    test('should return the fourth tuesday of the month for 11/23/2021', () => {
      expect(getWeekdayInfo(moment('11/23/2021'))).toEqual({
        dayOfWeek: 'Tuesday',
        isLastOfMonth: false,
        nthWeekdayOfMonth: 4,
      });
    });

    test('should return the third Tuesday of the month 11/16/2021', () => {
      expect(getWeekdayInfo(moment('11/16/2021'))).toEqual({
        dayOfWeek: 'Tuesday',
        isLastOfMonth: false,
        nthWeekdayOfMonth: 3,
      });
    });

    test('should return the last Friday of the month 12/25/2020', () => {
      expect(getWeekdayInfo(moment('12/25/2020'))).toEqual({
        dayOfWeek: 'Friday',
        isLastOfMonth: true,
        nthWeekdayOfMonth: 4,
      });
    });

    test('should return expected invalid props for a null date', () => {
      expect(getWeekdayInfo(moment(null))).toEqual({
        dayOfWeek: 'Invalid date',
        isLastOfMonth: true,
        nthWeekdayOfMonth: NaN,
      });
    });
  });

  describe('getInitialByweekday', () => {
    test('when passed empty recurrence params, should return the day of the week of the passed in startDate', () => {
      expect(getInitialByweekday([], moment('11/23/2021'))).toEqual({
        '1': false,
        '2': true,
        '3': false,
        '4': false,
        '5': false,
        '6': false,
        '7': false,
      });
    });

    test('when passed recurrence params, should return the passed in days of the week and ignore the startDate', () => {
      expect(getInitialByweekday(['+2MO', '-1FR'], moment('11/23/2021'))).toEqual({
        '1': true,
        '2': false,
        '3': false,
        '4': false,
        '5': true,
        '6': false,
        '7': false,
      });
    });

    test('when passed a null date, should return only Monday', () => {
      expect(getInitialByweekday([], null)).toEqual({
        '1': true,
        '2': false,
        '3': false,
        '4': false,
        '5': false,
        '6': false,
        '7': false,
      });
    });
  });

  describe('generateNthByweekday', () => {
    test('should parse the 4th tuesday', () => {
      expect(generateNthByweekday(moment('11/23/2021'))).toEqual(['+4TU']);
    });

    test('should parse the 3rd tuesday', () => {
      expect(generateNthByweekday(moment('11/16/2021'))).toEqual(['+3TU']);
    });
  });

  describe('recurrenceSummary', () => {
    test('should give a detailed msg with the until', () => {
      expect(
        recurrenceSummary({
          freq: RRuleFrequency.MONTHLY,
          interval: 1,
          until: moment('11/23/1979'),
          count: 5,
          byweekday: ['+4TU'],
        })
      ).toEqual('every month on the 4th Tuesday until November 23, 1979');
    });

    test('should give a detailed msg with the occurrences', () => {
      expect(
        recurrenceSummary({
          freq: RRuleFrequency.MONTHLY,
          interval: 1,
          count: 5,
          byweekday: ['+4TU'],
        })
      ).toEqual('every month on the 4th Tuesday for 5 occurrences');
    });

    test('should give a detailed msg with the recurrence', () => {
      expect(
        recurrenceSummary({
          freq: RRuleFrequency.MONTHLY,
          interval: 1,
          byweekday: ['+4TU'],
        })
      ).toEqual('every month on the 4th Tuesday');
    });

    test('should give a basic msg', () => {
      expect(
        recurrenceSummary({
          freq: RRuleFrequency.MONTHLY,
          interval: 1,
        })
      ).toEqual('every month');
    });
  });

  describe('rRuleWeekdayToWeekdayName', () => {
    test('parses 2nd Monday', () => {
      expect(rRuleWeekdayToWeekdayName('+2MO')).toEqual('Monday');
    });

    test('parses 3rd Tuesday', () => {
      expect(rRuleWeekdayToWeekdayName('+3TU')).toEqual('Tuesday');
    });

    test('parses last Friday', () => {
      expect(rRuleWeekdayToWeekdayName('-1FR')).toEqual('Friday');
    });
  });

  describe('buildCustomRecurrenceSchedulerState', () => {
    test('Daily frequency ', () => {
      expect(
        buildCustomRecurrenceSchedulerState({
          frequency: RRuleFrequency.DAILY,
          interval: 2,
          byweekday: {
            '1': false,
            '2': true,
            '3': false,
            '4': false,
            '5': false,
            '6': false,
            '7': false,
          },
          monthlyRecurDay: 'day',
          startDate: moment('11/23/2021'),
        })
      ).toEqual({
        bymonth: [],
        bymonthday: [],
        byweekday: [],
        freq: 3,
        interval: 2,
      });
    });

    test('Weekly frequency ', () => {
      expect(
        buildCustomRecurrenceSchedulerState({
          frequency: RRuleFrequency.WEEKLY,
          interval: 2,
          byweekday: {
            '1': false,
            '2': true,
            '3': false,
            '4': false,
            '5': false,
            '6': false,
            '7': false,
          },
          monthlyRecurDay: 'day',
          startDate: moment('11/23/2021'),
        })
      ).toEqual({
        bymonth: [],
        bymonthday: [],
        byweekday: ['TU'],
        freq: 2,
        interval: 2,
      });
    });

    test('Monthly frequency ', () => {
      expect(
        buildCustomRecurrenceSchedulerState({
          frequency: RRuleFrequency.MONTHLY,
          interval: 2,
          byweekday: {
            '1': false,
            '2': true,
            '3': false,
            '4': false,
            '5': false,
            '6': false,
            '7': false,
          },
          monthlyRecurDay: 'day',
          startDate: moment('11/23/2021'),
        })
      ).toEqual({
        bymonth: [],
        bymonthday: [23],
        byweekday: [],
        freq: 1,
        interval: 2,
      });
    });

    test('Monthly frequency by weekday ', () => {
      expect(
        buildCustomRecurrenceSchedulerState({
          frequency: RRuleFrequency.MONTHLY,
          interval: 2,
          byweekday: {
            '1': false,
            '2': true,
            '3': false,
            '4': false,
            '5': false,
            '6': false,
            '7': false,
          },
          monthlyRecurDay: 'weekday',
          startDate: moment('11/23/2021'),
        })
      ).toEqual({
        bymonth: [],
        bymonthday: [],
        byweekday: ['+4TU'],
        freq: 1,
        interval: 2,
      });
    });

    test('Yearly frequency ', () => {
      expect(
        buildCustomRecurrenceSchedulerState({
          frequency: RRuleFrequency.YEARLY,
          interval: 2,
          byweekday: {
            '1': false,
            '2': true,
            '3': false,
            '4': false,
            '5': false,
            '6': false,
            '7': false,
          },
          monthlyRecurDay: 'day',
          startDate: moment('11/23/2021'),
        })
      ).toEqual({
        bymonth: [10],
        bymonthday: [23],
        byweekday: [],
        freq: 0,
        interval: 2,
      });
    });
  });
});
