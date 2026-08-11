/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggDescriptor } from '../descriptor_types';
import { AGG_TYPE, DEFAULT_PERCENTILE } from '../constants';

function getAggType(metricAgg: string): AGG_TYPE | undefined {
  return (Object.values(AGG_TYPE) as string[]).includes(metricAgg)
    ? (metricAgg as AGG_TYPE)
    : undefined;
}

function isMetricCountable(aggType: AGG_TYPE): boolean {
  return [AGG_TYPE.COUNT, AGG_TYPE.SUM, AGG_TYPE.UNIQUE_COUNT].includes(aggType);
}

export function createTileMapAggDescriptor(
  mapType: string,
  metricAgg: string,
  metricFieldName?: string
): AggDescriptor {
  const aggType = getAggType(metricAgg);
  if (
    !aggType ||
    aggType === AGG_TYPE.COUNT ||
    !metricFieldName ||
    (mapType.toLowerCase() === 'heatmap' && !isMetricCountable(aggType))
  ) {
    return { type: AGG_TYPE.COUNT };
  }

  return aggType === AGG_TYPE.PERCENTILE
    ? { type: aggType, field: metricFieldName, percentile: DEFAULT_PERCENTILE }
    : { type: aggType, field: metricFieldName };
}

export function createRegionMapAggDescriptor(
  metricAgg: string,
  metricFieldName?: string
): AggDescriptor {
  const aggType = getAggType(metricAgg);
  if (!aggType || aggType === AGG_TYPE.COUNT || !metricFieldName) {
    return { type: AGG_TYPE.COUNT };
  }

  return aggType === AGG_TYPE.PERCENTILE
    ? { type: aggType, field: metricFieldName, percentile: 50 }
    : { type: aggType, field: metricFieldName };
}
