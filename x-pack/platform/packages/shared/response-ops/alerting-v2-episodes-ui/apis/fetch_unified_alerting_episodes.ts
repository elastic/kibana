/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { TimeRange } from '@kbn/es-query';
import { ALERTING_V2_INTERNAL_EPISODES_LIST_API_PATH } from '@kbn/alerting-v2-constants';
import type {
  AlertEpisodeEsqlRow,
  EpisodesFilterState,
  EpisodesSortState,
} from '../queries/episodes_query';

export interface FetchUnifiedAlertingEpisodesOptions {
  pageSize: number;
  timeRange?: TimeRange | null;
  filterState?: EpisodesFilterState;
  sortState?: EpisodesSortState;
  abortSignal?: AbortSignal;
  services: { http: HttpStart };
}

interface UnifiedEpisodesResponse {
  episodes: AlertEpisodeEsqlRow[];
}

/**
 * Fetches v2 + classic (v1) alert episodes from the unified server list route
 * (`POST /internal/alerting/v2/episodes/_find`).
 */
export const fetchUnifiedAlertingEpisodes = async ({
  pageSize,
  timeRange,
  filterState,
  sortState = { sortField: '@timestamp', sortDirection: 'desc' },
  abortSignal,
  services: { http },
}: FetchUnifiedAlertingEpisodesOptions): Promise<AlertEpisodeEsqlRow[]> => {
  const response = await http.post<UnifiedEpisodesResponse>(
    ALERTING_V2_INTERNAL_EPISODES_LIST_API_PATH,
    {
      body: JSON.stringify({
        pageSize,
        sortField: sortState.sortField,
        sortDirection: sortState.sortDirection,
        filterState,
        ...(timeRange?.from && timeRange?.to
          ? { timeRange: { from: timeRange.from, to: timeRange.to } }
          : {}),
      }),
      signal: abortSignal,
    }
  );

  return response.episodes ?? [];
};
