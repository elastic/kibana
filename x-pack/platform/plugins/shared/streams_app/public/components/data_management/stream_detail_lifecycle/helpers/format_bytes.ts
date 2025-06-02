/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatNumber } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const formatBytes = (value: number) => formatNumber(value, '0.0 ib');

export const formatIngestionRate = (bytesPerDay: number, perDayOnly = false) => {
  const perDay = formatBytes(bytesPerDay);
  const perMonth = formatBytes(bytesPerDay * 30);
  if (perDayOnly)
    return i18n.translate('xpack.streams.streamDetailOverview.ingestionRatePerDay', {
      defaultMessage: '{perDay} / Day',
      values: { perDay },
    });
  return i18n.translate('xpack.streams.streamDetailOverview.ingestionRatePerDayPerMonth', {
    defaultMessage: '{perDay} / Day ({perMonth} / Month)',
    values: { perDay, perMonth },
  });
};
