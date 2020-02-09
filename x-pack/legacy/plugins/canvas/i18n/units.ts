/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

export const UnitStrings = {
  time: {
    getCycleTimeText: (length: number, format: 'seconds' | 'days' | 'hours' | 'minutes') => {
      switch (format) {
        case 'seconds':
          return i18n.translate('xpack.canvas.workpadHeader.cycleIntervalSecondsText', {
            defaultMessage: 'Every {seconds} {seconds, plural, one {second} other {seconds}}',
            values: {
              seconds: length,
            },
          });

        case 'minutes':
          return i18n.translate('xpack.canvas.workpadHeader.cycleIntervalMinutesText', {
            defaultMessage: 'Every {minutes} {minutes, plural, one {minute} other {minutes}}',
            values: {
              minutes: length,
            },
          });

        case 'hours':
          return i18n.translate('xpack.canvas.workpadHeader.cycleIntervalHoursText', {
            defaultMessage: 'Every {hours} {hours, plural, one {hour} other {hours}}',
            values: {
              hours: length,
            },
          });

        case 'days':
          return i18n.translate('xpack.canvas.workpadHeader.cycleIntervalDaysText', {
            defaultMessage: 'Every {days} {days, plural, one {day} other {days}}',
            values: {
              days: length,
            },
          });
      }
    },
    getDaysText: (days: number) =>
      i18n.translate('xpack.canvas.units.time.days', {
        defaultMessage: '{days, plural, one {# day} other {# days}}',
        values: {
          days,
        },
      }),
    getHoursText: (hours: number) =>
      i18n.translate('xpack.canvas.units.time.hours', {
        defaultMessage: '{hours, plural, one {# hour} other {# hours}}',
        values: {
          hours,
        },
      }),
    getMinutesText: (minutes: number) =>
      i18n.translate('xpack.canvas.units.time.minutes', {
        defaultMessage: '{minutes, plural, one {# minute} other {# minutes}}',
        values: {
          minutes,
        },
      }),
    getSecondsText: (seconds: number) =>
      i18n.translate('xpack.canvas.units.time.seconds', {
        defaultMessage: '{seconds, plural, one {# second} other {# seconds}}',
        values: {
          seconds,
        },
      }),
  },
  quickRanges: {
    getTodayLabel: () =>
      i18n.translate('xpack.canvas.units.quickRange.today', {
        defaultMessage: 'Today',
      }),
    getLast24HoursLabel: () =>
      i18n.translate('xpack.canvas.units.quickRange.last24Hours', {
        defaultMessage: 'Last 24 hours',
      }),
    getLast7DaysLabel: () =>
      i18n.translate('xpack.canvas.units.quickRange.last7Days', {
        defaultMessage: 'Last 7 days',
      }),
    getLast2WeeksLabel: () =>
      i18n.translate('xpack.canvas.units.quickRange.last2Weeks', {
        defaultMessage: 'Last 2 weeks',
      }),
    getLast30DaysLabel: () =>
      i18n.translate('xpack.canvas.units.quickRange.last30Days', {
        defaultMessage: 'Last 30 days',
      }),
    getLast90DaysLabel: () =>
      i18n.translate('xpack.canvas.units.quickRange.last90Days', {
        defaultMessage: 'Last 90 days',
      }),
    getLast1YearLabel: () =>
      i18n.translate('xpack.canvas.units.quickRange.last1Year', {
        defaultMessage: 'Last 1 year',
      }),
    getThisWeekLabel: () =>
      i18n.translate('xpack.canvas.units.quickRange.thisWeek', {
        defaultMessage: 'This week',
      }),
    getThisMonthLabel: () =>
      i18n.translate('xpack.canvas.units.quickRange.thisMonth', {
        defaultMessage: 'This month',
      }),
    getThisYearLabel: () =>
      i18n.translate('xpack.canvas.units.quickRange.thisYear', {
        defaultMessage: 'This year',
      }),
    getTheDaySoFarLabel: () =>
      i18n.translate('xpack.canvas.units.quickRange.theDaySoFar', {
        defaultMessage: 'The day so far',
      }),
    getWeekToDateLabel: () =>
      i18n.translate('xpack.canvas.units.quickRange.weekToDate', {
        defaultMessage: 'Week to date',
      }),
    getMonthToDateLabel: () =>
      i18n.translate('xpack.canvas.units.quickRange.monthToDate', {
        defaultMessage: 'Month to date',
      }),
    getYearToDateLabel: () =>
      i18n.translate('xpack.canvas.units.quickRange.yearToDate', {
        defaultMessage: 'Year to date',
      }),
    getYesterdayLabel: () =>
      i18n.translate('xpack.canvas.units.quickRange.yesterday', {
        defaultMessage: 'Yesterday',
      }),
    getDayBeforeYesterdayLabel: () =>
      i18n.translate('xpack.canvas.units.quickRange.dayBeforeYesterday', {
        defaultMessage: 'Day before yesterday',
      }),
    getThisDayLastWeek: () =>
      i18n.translate('xpack.canvas.units.quickRange.thisDayLastWeek', {
        defaultMessage: 'This day last week',
      }),
    getPreviousWeekLabel: () =>
      i18n.translate('xpack.canvas.units.quickRange.previousWeek', {
        defaultMessage: 'Previous week',
      }),
    getPreviousMonthLabel: () =>
      i18n.translate('xpack.canvas.units.quickRange.previousMonth', {
        defaultMessage: 'Previous month',
      }),
    getPreviousYearLabel: () =>
      i18n.translate('xpack.canvas.units.quickRange.previousYear', {
        defaultMessage: 'Previous year',
      }),
    getLast15MinutesLabel: () =>
      i18n.translate('xpack.canvas.units.quickRange.last15Minutes', {
        defaultMessage: 'Last 15 minutes',
      }),
    getLast30MinutesLabel: () =>
      i18n.translate('xpack.canvas.units.quickRange.last30Minutes', {
        defaultMessage: 'Last 30 minutes',
      }),
    getLast1HourLabel: () =>
      i18n.translate('xpack.canvas.units.quickRange.last1Hour', {
        defaultMessage: 'Last 1 hour',
      }),
    getLast4HoursLabel: () =>
      i18n.translate('xpack.canvas.units.quickRange.last4Hours', {
        defaultMessage: 'Last 4 hours',
      }),
    getLast12HoursLabel: () =>
      i18n.translate('xpack.canvas.units.quickRange.last12Hours', {
        defaultMessage: 'Last 12 hours',
      }),
    getLast60DaysLabel: () =>
      i18n.translate('xpack.canvas.units.quickRange.last60Days', {
        defaultMessage: 'Last 60 days',
      }),
    getLast6MonthsLabel: () =>
      i18n.translate('xpack.canvas.units.quickRange.last6Months', {
        defaultMessage: 'Last 6 months',
      }),
    getLast2YearsLabel: () =>
      i18n.translate('xpack.canvas.units.quickRange.last2Years', {
        defaultMessage: 'Last 2 years',
      }),
    getLast5YearsLabel: () =>
      i18n.translate('xpack.canvas.units.quickRange.last5Years', {
        defaultMessage: 'Last 5 years',
      }),
  },
};
