/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';

// moment.humanize() is intentionally avoided here: it rounds aggressively
// (e.g. "an hour", "2 hours") and loses the precision needed for query runtimes.
// A bare format string (e.g. moment.utc(ms).format('H[h] m[m]')) would hardcode
// English unit labels and skip pluralization. The explicit i18n calls below give
// exact values ("2 hours 15 mins") with proper pluralization across locales.
export function formatRuntime(startTime: number): string {
  const duration = moment.duration(Date.now() - startTime);
  const hours = Math.floor(duration.asHours());
  const minutes = duration.minutes();

  if (hours > 0) {
    return minutes > 0
      ? i18n.translate('xpack.runningQueries.flyout.runtimeHoursMinutes', {
          defaultMessage:
            '{hours} {hours, plural, one {hour} other {hours}} {minutes} {minutes, plural, one {min} other {mins}}',
          values: { hours, minutes },
        })
      : i18n.translate('xpack.runningQueries.flyout.runtimeHours', {
          defaultMessage: '{hours} {hours, plural, one {hour} other {hours}}',
          values: { hours },
        });
  }

  return i18n.translate('xpack.runningQueries.flyout.runtimeMinutes', {
    defaultMessage: '{minutes} {minutes, plural, one {min} other {mins}}',
    values: { minutes },
  });
}
