/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

export const UnitStrings = {
  time: {
    getSecondsText: (seconds: number) =>
      i18n.translate('xpack.canvas.units.time.seconds', {
        defaultMessage: '{seconds, plural, one {# second} other {# seconds}}',
        values: { seconds },
      }),
    getMinutesText: (minutes: number) =>
      i18n.translate('xpack.canvas.units.time.minutes', {
        defaultMessage: '{minutes, plural, one {# minute} other {# minutes}}',
        values: { minutes },
      }),
    getHoursText: (hours: number) =>
      i18n.translate('xpack.canvas.units.time.hours', {
        defaultMessage: '{hours, plural, one {# hour} other {# hours}}',
        values: { hours },
      }),
    getDaysText: (days: number) =>
      i18n.translate('xpack.canvas.units.time.days', {
        defaultMessage: '{days, plural, one {# day} other {# days}}',
        values: { days },
      }),
    getCycleTimeText: (length: number, format: 'seconds' | 'days' | 'hours' | 'minutes') => {
      switch (format) {
        case 'seconds':
          return i18n.translate('xpack.canvas.workpadHeader.cycleIntervalSecondsText', {
            defaultMessage: 'Every {seconds} {seconds, plural, one {second} other {seconds}}',
            values: { seconds: length },
          });
        case 'minutes':
          return i18n.translate('xpack.canvas.workpadHeader.cycleIntervalMinutesText', {
            defaultMessage: 'Every {minutes} {minutes, plural, one {minute} other {minutes}}',
            values: { minutes: length },
          });
        case 'hours':
          return i18n.translate('xpack.canvas.workpadHeader.cycleIntervalHoursText', {
            defaultMessage: 'Every {hours} {hours, plural, one {hour} other {hours}}',
            values: { hours: length },
          });
        case 'days':
          return i18n.translate('xpack.canvas.workpadHeader.cycleIntervalDaysText', {
            defaultMessage: 'Every {days} {days, plural, one {day} other {days}}',
            values: { days: length },
          });
      }
    },
  },
};
