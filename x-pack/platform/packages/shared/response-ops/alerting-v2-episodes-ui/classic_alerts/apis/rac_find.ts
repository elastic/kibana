/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { HttpStart } from '@kbn/core-http-browser';
import type { TimeRange } from '@kbn/es-query';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common';
import type { ClassicAlertsTimeRange } from '../utils/query';

/** Base options shared by all RAC-backed classic alert fetch functions. */
export interface BaseRacOptions {
  ruleTypeIds: string[];
}

/** Body accepted by the authorized RAC alerts find route (`POST /internal/rac/alerts/find`). */
export interface RacFindBody {
  rule_type_ids: string[];
  query: estypes.QueryDslQueryContainer;
  size: number;
  track_total_hits?: boolean;
  sort?: estypes.SortOptions[];
  aggs?: Record<string, estypes.AggregationsAggregationContainer>;
  _source?: boolean | string[];
}

export interface RacFindHit {
  _id?: string;
  _index?: string;
  _source?: Record<string, unknown>;
}

export interface RacFindResponse<TAggs = undefined> {
  hits: {
    total?: number | { value?: number };
    hits: RacFindHit[];
  };
  aggregations?: TAggs;
}

export interface ClassicKpiAggregations {
  firing_rules: { doc_count: number; rules: { value: number } };
  acknowledged: { doc_count: number };
  muted: { doc_count: number };
  snoozed: { doc_count: number };
}

export interface ClassicTagsAggregations {
  tags: estypes.AggregationsStringTermsAggregate;
}

export const toTimeRangeParam = (
  timeRange?: TimeRange | null
): ClassicAlertsTimeRange | undefined =>
  timeRange ? { from: timeRange.from, to: timeRange.to } : undefined;

export const getTotalHits = (total: RacFindResponse['hits']['total']): number => {
  if (typeof total === 'number') {
    return total;
  }
  return total?.value ?? 0;
};

/**
 * Reads classic observability + stack alerts through the authorized RAC
 * alerts API (so Kibana alerting RBAC is enforced) and returns the raw response.
 */
export const findClassicAlerts = <TAggs = undefined>(
  http: HttpStart,
  body: RacFindBody,
  abortSignal?: AbortSignal
): Promise<RacFindResponse<TAggs>> =>
  http.post<RacFindResponse<TAggs>>(`${BASE_RAC_ALERTS_API_PATH}/find`, {
    body: JSON.stringify(body),
    signal: abortSignal,
  });
