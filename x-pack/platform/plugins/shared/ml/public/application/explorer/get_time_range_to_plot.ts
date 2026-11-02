/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatDate } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import type { TimeRangeBounds } from '@kbn/ml-time-buckets';
import type { AppStateSelectedCells } from './explorer_utils';
import { getSelectionTimeRange } from './explorer_utils';

const ANOMALY_CHARTS_TIME_RANGE_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';

export function getTimeRangeToPlot({
  seriesToPlot,
  selectedCells,
  bounds,
  interval,
  globalTimeRange,
}: {
  seriesToPlot: Array<{ plotEarliest?: number; plotLatest?: number }>;
  selectedCells?: AppStateSelectedCells | null;
  bounds?: TimeRangeBounds;
  interval?: number;
  globalTimeRange: TimeRange;
}): TimeRange {
  const { plotEarliest, plotLatest } = seriesToPlot[0] ?? {};
  if (
    typeof plotEarliest === 'number' &&
    Number.isFinite(plotEarliest) &&
    typeof plotLatest === 'number' &&
    Number.isFinite(plotLatest)
  ) {
    return {
      from: formatDate(plotEarliest, ANOMALY_CHARTS_TIME_RANGE_FORMAT),
      to: formatDate(plotLatest, ANOMALY_CHARTS_TIME_RANGE_FORMAT),
    };
  }

  if (!!selectedCells && interval !== undefined && bounds !== undefined) {
    const { earliestMs, latestMs } = getSelectionTimeRange(selectedCells, bounds);
    return {
      from: formatDate(earliestMs, ANOMALY_CHARTS_TIME_RANGE_FORMAT),
      to: formatDate(latestMs, ANOMALY_CHARTS_TIME_RANGE_FORMAT),
      mode: 'absolute',
    };
  }

  return globalTimeRange;
}
