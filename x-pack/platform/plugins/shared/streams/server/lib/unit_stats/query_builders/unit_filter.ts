/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import {
  CONFIG_HASH_FIELD,
  START_TIMESTAMP_FIELD,
  TIMESTAMP_FIELD,
  UNIT_ID_FIELD,
  UNIT_STATS_QUERY_TIMEOUT,
  UNIT_STATS_STREAM,
} from '../constants';

export interface StatsWindow {
  start: string;
  end: string;
}

/** Search params every unit stats search shares. */
export const baseSearchParams = {
  index: UNIT_STATS_STREAM,
  ignore_unavailable: false,
  allow_no_indices: false,
  track_total_hits: false,
  timeout: UNIT_STATS_QUERY_TIMEOUT,
} as const;

const configHashFilter = (configHash?: string): estypes.QueryDslQueryContainer[] =>
  configHash ? [{ term: { [CONFIG_HASH_FIELD]: configHash } }] : [];

/** Unit, window and, only when the request pins one, the config hash. */
export const buildUnitFilter = ({
  unitId,
  window,
  configHash,
}: {
  unitId: string;
  window: StatsWindow;
  configHash?: string;
}): estypes.QueryDslQueryContainer[] => [
  { term: { [UNIT_ID_FIELD]: unitId } },
  { range: { [TIMESTAMP_FIELD]: { gte: window.start, lt: window.end } } },
  ...configHashFilter(configHash),
];

/**
 * The earliest `start_timestamp` for this unit over all time, limited to the pinned hash
 * when there is one. A rate divides by the time the data covers, so a config change
 * inside the window does not shorten it.
 */
export const buildEarliestStartRequest = ({
  unitId,
  configHash,
}: {
  unitId: string;
  configHash?: string;
}): estypes.SearchRequest => ({
  ...baseSearchParams,
  size: 0,
  query: {
    bool: { filter: [{ term: { [UNIT_ID_FIELD]: unitId } }, ...configHashFilter(configHash)] },
  },
  aggs: { earliest: { min: { field: START_TIMESTAMP_FIELD } } },
});

/** Epoch ms of the earliest start, or undefined when no document matches. */
export const readEarliestStartMs = (response: estypes.SearchResponse): number | undefined => {
  const earliest = response.aggregations?.earliest as { value: number | null } | undefined;
  return typeof earliest?.value === 'number' ? earliest.value : undefined;
};
