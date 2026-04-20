/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PreservedTimeUnit } from './time_unit_types';
import { formatMillisecondsInUnit } from './duration_utils';
import { getTimeSizeAndUnitLabel } from '../../helpers/format_size_units';

export const getBoundsHelpTextValues = ({
  lowerBoundMs,
  upperBoundMs,
  unit,
}: {
  lowerBoundMs: number;
  upperBoundMs: number | undefined;
  unit: PreservedTimeUnit;
}): { min: string; max: string | undefined } => {
  const minRaw = formatMillisecondsInUnit(lowerBoundMs, unit);
  const maxRaw =
    upperBoundMs === undefined ? undefined : formatMillisecondsInUnit(upperBoundMs, unit);

  const min = getTimeSizeAndUnitLabel(minRaw) ?? minRaw;
  const max = maxRaw === undefined ? undefined : getTimeSizeAndUnitLabel(maxRaw) ?? maxRaw;
  return { min, max };
};
