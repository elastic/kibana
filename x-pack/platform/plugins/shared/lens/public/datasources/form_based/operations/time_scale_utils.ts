/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { unitSuffixesLong } from '../../../../common/suffix_formatter';
import type { TimeScaleUnit } from '../../../../common/expressions';

export const DEFAULT_TIME_SCALE = 's' as TimeScaleUnit;

function getSuffix(
  scale: TimeScaleUnit | undefined,
  shift: string | undefined,
  reducedTimeRange: string | undefined
) {
  return (
    (shift || scale ? ' ' : '') +
    (scale ? unitSuffixesLong[scale] : '') +
    (shift && scale ? ' ' : '') +
    (shift ? `-${shift}` : '') +
    (reducedTimeRange ? ' ' : '') +
    (reducedTimeRange
      ? i18n.translate('xpack.lens.reducedTimeRangeSuffix', {
          defaultMessage: 'last {reducedTimeRange}',
          values: { reducedTimeRange },
        })
      : '')
  );
}

export function adjustTimeScaleLabelSuffix(
  oldLabel: string,
  previousTimeScale: TimeScaleUnit | undefined,
  newTimeScale: TimeScaleUnit | undefined,
  previousShift: string | undefined,
  newShift: string | undefined,
  previousReducedTimeRange: string | undefined,
  newReducedTimeRange: string | undefined
) {
  let cleanedLabel = oldLabel;
  // remove added suffix if column had a time scale previously
  if (previousTimeScale || previousShift || previousReducedTimeRange) {
    const suffix = getSuffix(previousTimeScale, previousShift, previousReducedTimeRange);
    const suffixPosition = oldLabel.lastIndexOf(suffix);
    if (suffixPosition !== -1) {
      cleanedLabel = oldLabel.substring(0, suffixPosition);
    }
  }
  if (!newTimeScale && !newShift && !newReducedTimeRange) {
    return cleanedLabel;
  }
  // add new suffix if column has a time scale now
  return `${cleanedLabel}${getSuffix(newTimeScale, newShift, newReducedTimeRange)}`;
}
