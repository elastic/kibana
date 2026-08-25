/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { HttpStart } from '@kbn/core-http-browser';
import type { TimeRange } from '@kbn/es-query';
import { ALERT_UUID } from '@kbn/rule-data-utils';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common';
import type {
  AlertEpisode,
  EpisodesFilterState,
  EpisodesSortState,
} from '../queries/episodes_query';
import type { HistogramEpisodeRow } from '../utils/histogram_utils';
import {
  buildClassicAlertsKpiAggs,
  buildClassicAlertsQuery,
  buildClassicAlertsSort,
  buildClassicAlertsTagsAggs,
  type ClassicAlertsTimeRange,
} from '../classic_alerts/query';
import {
  type ClassicAlertSource,
  mapClassicAlertToEpisode,
  mapClassicAlertToHistogramRow,
  CLASSIC_ALERT_EPISODE_SOURCE_FIELDS,
  CLASSIC_ALERT_HISTOGRAM_SOURCE_FIELDS,
} from '../classic_alerts/map_alert';
import {
  CLASSIC_ALERT_RULE_TYPE_IDS,
  CLASSIC_ALERTS_HISTOGRAM_LIMIT,
  CLASSIC_ALERTS_LIST_PAGE_SIZE,
  CLASSIC_ALERTS_TAGS_LIMIT,
} from '../classic_alerts/constants';

/**
 * Classic (v1) alert KPI counts that have a v2 equivalent, merged additively with
 * the v2 KPI counts on the client.
 */
export interface V1AlertsKpisRow {
  alerts_count: number;
  firing_rules: number;
  acknowledged: number;
  snoozed: number;
}

/** Raw `kibana.alert.*` fields (plus `_index` / `_id`) of a single classic (v1) alert. */
export type V1AlertFields = Record<string, unknown>;

/** Body accepted by the authorized RAC alerts find route (`POST /internal/rac/alerts/find`). */
interface RacFindBody {
  rule_type_ids: string[];
  query: estypes.QueryDslQueryContainer;
  size: number;
  track_total_hits?: boolean;
  sort?: estypes.SortOptions[];
  aggs?: Record<string, estypes.AggregationsAggregationContainer>;
  _source?: boolean | string[];
}

interface RacFindHit {
  _id?: string;
  _index?: string;
  _source?: Record<string, unknown>;
}

interface RacFindResponse<TAggs = undefined> {
  hits: {
    total?: number | { value?: number };
    hits: RacFindHit[];
  };
  aggregations?: TAggs;
}

interface ClassicKpiAggregations {
  firing_rules: { doc_count: number; rules: { value: number } };
  acknowledged: { doc_count: number };
  muted: { doc_count: number };
  snoozed: { doc_count: number };
}

interface ClassicTagsAggregations {
  tags: estypes.AggregationsStringTermsAggregate;
}

const toTimeRangeParam = (timeRange?: TimeRange | null): ClassicAlertsTimeRange | undefined =>
  timeRange ? { from: timeRange.from, to: timeRange.to } : undefined;

const getTotalHits = (total: RacFindResponse['hits']['total']): number => {
  if (typeof total === 'number') {
    return total;
  }
  return total?.value ?? 0;
};

/**
 * Reads classic (v1) observability + stack alerts through the authorized RAC
 * alerts API (so Kibana alerting RBAC is enforced) and returns the raw response.
 */
const findClassicAlerts = <TAggs = undefined>(
  http: HttpStart,
  body: RacFindBody,
  abortSignal?: AbortSignal
): Promise<RacFindResponse<TAggs>> =>
  http.post<RacFindResponse<TAggs>>(`${BASE_RAC_ALERTS_API_PATH}/find`, {
    body: JSON.stringify(body),
    signal: abortSignal,
  });

export interface FetchV1AlertsAsEpisodesOptions {
  pageSize: number;
  timeRange?: TimeRange | null;
  filterState?: EpisodesFilterState;
  sortState?: EpisodesSortState;
  abortSignal?: AbortSignal;
  services: { http: HttpStart };
}

/**
 * Reads classic (v1) observability + stack alerts (RBAC enforced by the RAC alerts
 * API) reshaped into the v2 `AlertEpisode` row shape, so they can be merged into
 * the v2 alerting (episodes) table.
 */
export const fetchV1AlertsAsEpisodes = async ({
  pageSize,
  timeRange,
  filterState,
  sortState,
  abortSignal,
  services: { http },
}: FetchV1AlertsAsEpisodesOptions): Promise<AlertEpisode[]> => {
  const response = await findClassicAlerts(
    http,
    {
      rule_type_ids: CLASSIC_ALERT_RULE_TYPE_IDS,
      query: buildClassicAlertsQuery(filterState, toTimeRangeParam(timeRange)),
      sort: buildClassicAlertsSort(sortState),
      size: Math.min(pageSize, CLASSIC_ALERTS_LIST_PAGE_SIZE),
      track_total_hits: false,
      _source: [...CLASSIC_ALERT_EPISODE_SOURCE_FIELDS],
    },
    abortSignal
  );

  return response.hits.hits.flatMap((hit) =>
    hit._source ? [mapClassicAlertToEpisode(hit._source as unknown as ClassicAlertSource)] : []
  );
};

export interface FetchV1AlertsKpisOptions {
  timeRange?: TimeRange | null;
  filterState?: EpisodesFilterState;
  abortSignal?: AbortSignal;
  services: { http: HttpStart };
}

/** Computes the classic (v1) alert KPI counts (RBAC enforced by the RAC alerts API). */
export const fetchV1AlertsKpis = async ({
  timeRange,
  filterState,
  abortSignal,
  services: { http },
}: FetchV1AlertsKpisOptions): Promise<V1AlertsKpisRow> => {
  const response = await findClassicAlerts<ClassicKpiAggregations>(
    http,
    {
      rule_type_ids: CLASSIC_ALERT_RULE_TYPE_IDS,
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

export interface FetchV1AlertsHistogramOptions {
  timeRange?: TimeRange | null;
  filterState?: EpisodesFilterState;
  breakdownField?: string;
  abortSignal?: AbortSignal;
  services: { http: HttpStart };
}

/** Returns classic (v1) alert histogram rows (RBAC enforced by the RAC alerts API). */
export const fetchV1AlertsHistogram = async ({
  timeRange,
  filterState,
  breakdownField,
  abortSignal,
  services: { http },
}: FetchV1AlertsHistogramOptions): Promise<HistogramEpisodeRow[]> => {
  const response = await findClassicAlerts(
    http,
    {
      rule_type_ids: CLASSIC_ALERT_RULE_TYPE_IDS,
      query: buildClassicAlertsQuery(filterState, toTimeRangeParam(timeRange)),
      size: CLASSIC_ALERTS_HISTOGRAM_LIMIT,
      track_total_hits: false,
      _source: [...CLASSIC_ALERT_HISTOGRAM_SOURCE_FIELDS],
    },
    abortSignal
  );

  return response.hits.hits.flatMap((hit) =>
    hit._source
      ? [
          mapClassicAlertToHistogramRow(
            hit._source as unknown as ClassicAlertSource,
            breakdownField
          ),
        ]
      : []
  );
};

export interface FetchV1AlertsTagsOptions {
  timeRange?: TimeRange | null;
  abortSignal?: AbortSignal;
  services: { http: HttpStart };
}

/** Returns distinct classic (v1) alert rule tags (RBAC enforced by the RAC alerts API). */
export const fetchV1AlertsTags = async ({
  timeRange,
  abortSignal,
  services: { http },
}: FetchV1AlertsTagsOptions): Promise<string[]> => {
  const response = await findClassicAlerts<ClassicTagsAggregations>(
    http,
    {
      rule_type_ids: CLASSIC_ALERT_RULE_TYPE_IDS,
      query: buildClassicAlertsQuery(undefined, toTimeRangeParam(timeRange)),
      aggs: buildClassicAlertsTagsAggs(CLASSIC_ALERTS_TAGS_LIMIT),
      size: 0,
      track_total_hits: false,
      _source: false,
    },
    abortSignal
  );

  const buckets = response.aggregations?.tags.buckets;
  if (!Array.isArray(buckets)) {
    return [];
  }

  return buckets
    .map((bucket) => bucket.key)
    .filter((key): key is string => typeof key === 'string');
};

export interface FetchV1AlertByIdOptions {
  id: string;
  abortSignal?: AbortSignal;
  services: { http: HttpStart };
}

/**
 * Reads a single classic (v1) alert document by its alert uuid (RBAC enforced by
 * the RAC alerts API) so the classic alert fields flyout can be rendered from the
 * v2 episodes table. Returns the raw `kibana.alert.*` fields plus `_index` (used
 * to decide whether an observability details-page deep link applies).
 */
export const fetchV1AlertById = async ({
  id,
  abortSignal,
  services: { http },
}: FetchV1AlertByIdOptions): Promise<V1AlertFields> => {
  const response = await findClassicAlerts(
    http,
    {
      rule_type_ids: CLASSIC_ALERT_RULE_TYPE_IDS,
      query: { bool: { filter: [{ term: { [ALERT_UUID]: id } }] } },
      size: 1,
      track_total_hits: false,
    },
    abortSignal
  );

  const hit = response.hits.hits[0];
  if (!hit?._source) {
    throw new Error(`Classic alert not found: ${id}`);
  }

  return { ...hit._source, _index: hit._index ?? '', _id: hit._id ?? '' } as V1AlertFields;
};
