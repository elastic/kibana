/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

type DurationUnit = 's' | 'm' | 'h' | 'd';

const isDurationUnit = (c: string): c is DurationUnit => ['s', 'm', 'h', 'd'].includes(c);

/** Humanizes a duration string (e.g. `'5m'`) to a localized phrase (e.g. `'5 minutes'`). Returns an empty string for empty input and the raw string for unrecognized formats. */
export const formatInterval = (raw: string): string => {
  if (!raw) return '';
  const unit = raw.charAt(raw.length - 1);
  const value = parseInt(raw, 10);
  if (Number.isNaN(value) || !isDurationUnit(unit)) return raw;
  switch (unit) {
    case 's':
      return i18n.translate(
        'xpack.alertingV2.actionPolicy.form.notificationSummary.duration.seconds',
        {
          defaultMessage: '{value, plural, one {# second} other {# seconds}}',
          values: { value },
        }
      );
    case 'm':
      return i18n.translate(
        'xpack.alertingV2.actionPolicy.form.notificationSummary.duration.minutes',
        {
          defaultMessage: '{value, plural, one {# minute} other {# minutes}}',
          values: { value },
        }
      );
    case 'h':
      return i18n.translate(
        'xpack.alertingV2.actionPolicy.form.notificationSummary.duration.hours',
        {
          defaultMessage: '{value, plural, one {# hour} other {# hours}}',
          values: { value },
        }
      );
    case 'd':
      return i18n.translate(
        'xpack.alertingV2.actionPolicy.form.notificationSummary.duration.days',
        {
          defaultMessage: '{value, plural, one {# day} other {# days}}',
          values: { value },
        }
      );
  }
};
