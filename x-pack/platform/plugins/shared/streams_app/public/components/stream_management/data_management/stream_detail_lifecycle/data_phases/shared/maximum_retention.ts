/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { PreservedTimeUnit } from './time_unit_types';
import { parseInterval, toMilliseconds } from './duration_utils';

export const getMaximumRetentionMessage = (maximumRetentionPeriod: string): string =>
  i18n.translate('xpack.streams.dataPhases.maximumRetentionMessage', {
    defaultMessage: 'Must occur before the maximum retention ({maximumRetentionPeriod}).',
    values: { maximumRetentionPeriod },
  });

export const getMaximumRetentionPeriodMs = (
  maximumRetentionPeriod: string | undefined
): number | undefined => {
  const parsedMaximumRetention = parseInterval(maximumRetentionPeriod);
  if (!parsedMaximumRetention) return;

  const maximumRetentionMs = toMilliseconds(
    parsedMaximumRetention.value,
    parsedMaximumRetention.unit
  );
  return maximumRetentionMs > 0 ? maximumRetentionMs : undefined;
};

export const exceedsMaximumRetentionPeriod = ({
  value,
  unit,
  maximumRetentionPeriod,
}: {
  value: string;
  unit: PreservedTimeUnit;
  maximumRetentionPeriod?: string;
}): boolean => {
  const maximumRetentionMs = getMaximumRetentionPeriodMs(maximumRetentionPeriod);
  if (maximumRetentionMs === undefined) return false;

  return toMilliseconds(value, unit) > maximumRetentionMs;
};
