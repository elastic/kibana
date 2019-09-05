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
        defaultMessage: '{seconds} {seconds, plural, one {second} other {seconds}}',
        values: { seconds },
      }),
    getMinutesText: (minutes: number) =>
      i18n.translate('xpack.canvas.units.time.minutes', {
        defaultMessage: '{minutes} {minutes, plural, one {minute} other {minutes}}',
        values: { minutes },
      }),
    getHoursText: (hours: number) =>
      i18n.translate('xpack.canvas.units.time.hours', {
        defaultMessage: '{hours} {hours, plural, one {hour} other {hours}}',
        values: { hours },
      }),
    getDaysText: (days: number) =>
      i18n.translate('xpack.canvas.units.time.days', {
        defaultMessage: '{days} {days, plural, one {day} other {days}}',
        values: { days },
      }),
  },
};
