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
export function formatRuntime(durationMs: number): string {
  durationMs = Math.max(0, durationMs);
  const duration = moment.duration(durationMs);
  const hours = Math.floor(duration.asHours());
  const totalMinutes = Math.floor(duration.asMinutes());

  if (hours > 0) {
    const minutes = totalMinutes - hours * 60;
    return minutes > 0
      ? i18n.translate('xpack.queryActivity.flyout.runtimeHoursMinutes', {
          defaultMessage:
            '{hours} {hours, plural, one {hour} other {hours}} {minutes} {minutes, plural, one {min} other {mins}}',
          values: { hours, minutes },
        })
      : i18n.translate('xpack.queryActivity.flyout.runtimeHours', {
          defaultMessage: '{hours} {hours, plural, one {hour} other {hours}}',
          values: { hours },
        });
  }

  if (totalMinutes > 0) {
    return i18n.translate('xpack.queryActivity.flyout.runtimeMinutes', {
      defaultMessage: '{minutes} {minutes, plural, one {min} other {mins}}',
      values: { minutes: totalMinutes },
    });
  }

  const seconds =
    durationMs > 0
      ? Math.max(1, Math.floor(duration.asSeconds()))
      : Math.floor(duration.asSeconds());

  return i18n.translate('xpack.queryActivity.flyout.runtimeSeconds', {
    defaultMessage: '{seconds} {seconds, plural, one {sec} other {secs}}',
    values: { seconds },
  });
}
