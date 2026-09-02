/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { HttpStart } from '@kbn/core-http-browser';
import type { TimeRange } from '@kbn/es-query';
import { ALERT_RULE_UUID, ALERT_STATUS_ACTIVE, ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import type { EpisodesFilterState } from '../../queries/episodes_query';
import { buildClassicAlertsQuery } from '../utils/query';
import { CLASSIC_ALERT_MUTED_FIELD, CLASSIC_ALERT_SNOOZED_FIELD } from '../constants';
import type { ClassicAlertsKpisRow } from '../types';
import {
  type BaseRacOptions,
  type ClassicKpiAggregations,
  findClassicAlerts,
  getTotalHits,
  toTimeRangeParam,
} from './rac_find';

export interface FetchClassicAlertsKpisOptions extends BaseRacOptions {
  timeRange?: TimeRange | null;
  filterState?: EpisodesFilterState;
  abortSignal?: AbortSignal;
  services: { http: HttpStart };
}

/**
 * Aggregations that compute the classic KPI counts with a v2 equivalent.
 *
 * Shaped to satisfy the `/internal/rac/alerts/find` route's aggregation schema,
 * whose `filter` aggregation only accepts a single `term` (no `bool`). Because of
 * that, "snoozed OR muted" is expressed as two separate `term` filter counts
 * (`snoozed` + `muted`) that the client sums — see `parseClassicAlertsKpis`. That
 * sum can slightly overcount alerts that are both muted and snoozed, which is rare
 * in practice.
 */
export const buildClassicAlertsKpiAggs = (): Record<
  string,
  estypes.AggregationsAggregationContainer
> => ({
  firing_rules: {
    filter: { term: { 'kibana.alert.status': ALERT_STATUS_ACTIVE } },
    aggs: {
      rules: { cardinality: { field: ALERT_RULE_UUID } },
    },
  },
  acknowledged: {
    filter: { term: { [ALERT_WORKFLOW_STATUS]: 'acknowledged' } },
  },
  muted: {
    filter: { term: { [CLASSIC_ALERT_MUTED_FIELD]: true } },
  },
  snoozed: {
    filter: { term: { [CLASSIC_ALERT_SNOOZED_FIELD]: true } },
  },
});

/** Computes the classic alert KPI counts (RBAC enforced by the RAC alerts API). */
export const fetchClassicAlertsKpis = async ({
  ruleTypeIds,
  timeRange,
  filterState,
  abortSignal,
  services: { http },
}: FetchClassicAlertsKpisOptions): Promise<ClassicAlertsKpisRow> => {
  const response = await findClassicAlerts<ClassicKpiAggregations>(
    http,
    {
      rule_type_ids: ruleTypeIds,
      query: buildClassicAlertsQuery(filterState, toTimeRangeParam(timeRange)),
      aggs: buildClassicAlertsKpiAggs(),
      size: 0,
      track_total_hits: true,
      _source: false,
    },
    abortSignal
  );

  const aggs = response.aggregations;

  return {
    alerts_count: getTotalHits(response.hits.total),
    firing_rules: aggs?.firing_rules.rules.value ?? 0,
    acknowledged: aggs?.acknowledged.doc_count ?? 0,
    snoozed: (aggs?.muted.doc_count ?? 0) + (aggs?.snoozed.doc_count ?? 0),
  };
};
