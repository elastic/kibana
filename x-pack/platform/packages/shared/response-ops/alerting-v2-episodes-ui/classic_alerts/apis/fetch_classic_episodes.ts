/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { TimeRange } from '@kbn/es-query';
import type {
  AlertEpisode,
  EpisodesFilterState,
  EpisodesSortState,
} from '../../queries/episodes_query';
import { buildClassicAlertsQuery, buildClassicAlertsSort } from '../utils/query';
import {
  type ClassicAlertSource,
  mapClassicAlertToEpisode,
  CLASSIC_ALERT_EPISODE_SOURCE_FIELDS,
} from '../utils/map_alert';
import { CLASSIC_ALERTS_LIST_PAGE_SIZE } from '../constants';
import { type BaseRacOptions, findClassicAlerts, toTimeRangeParam } from './rac_find';

export interface FetchClassicAlertsAsEpisodesOptions extends BaseRacOptions {
  pageSize: number;
  timeRange?: TimeRange | null;
  filterState?: EpisodesFilterState;
  sortState?: EpisodesSortState;
  abortSignal?: AbortSignal;
  services: { http: HttpStart };
}

/**
 * Reads classic observability + stack alerts (RBAC enforced by the RAC alerts
 * API) reshaped into the v2 `AlertEpisode` row shape, so they can be merged into
 * the v2 alerting (episodes) table.
 */
export const fetchClassicAlertsAsEpisodes = async ({
  ruleTypeIds,
  pageSize,
  timeRange,
  filterState,
  sortState,
  abortSignal,
  services: { http },
}: FetchClassicAlertsAsEpisodesOptions): Promise<AlertEpisode[]> => {
  const response = await findClassicAlerts(
    http,
    {
      rule_type_ids: ruleTypeIds,
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
