/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EpisodeDataSource } from '../types/episode_data_source';
import { fetchClassicAlertsAsEpisodes } from './apis/fetch_classic_episodes';
import { fetchClassicAlertsHistogram } from './apis/fetch_classic_histogram';
import { fetchClassicAlertsKpis } from './apis/fetch_classic_kpis';
import { fetchClassicAlertsTags } from './apis/fetch_classic_tags';
import { resolveClassicRules } from './apis/resolve_classic_rules';
import { CLASSIC_ALERTS_HISTOGRAM_LIMIT } from './constants';
import { classicAlertQueryKeys } from './query_keys';

export const CLASSIC_EPISODE_SOURCE_ID = 'classic-alerts';

export interface CreateClassicEpisodeSourceOptions {
  ruleTypeIds: string[];
}

export const createClassicEpisodeSource = ({
  ruleTypeIds,
}: CreateClassicEpisodeSourceOptions): EpisodeDataSource => ({
  id: CLASSIC_EPISODE_SOURCE_ID,
  queryKeyPrefix: classicAlertQueryKeys.all(),

  fetchEpisodes: ({ services, pageSize, filterState, sortState, timeRange, abortSignal }) =>
    fetchClassicAlertsAsEpisodes({
      ruleTypeIds,
      services,
      pageSize,
      filterState,
      sortState,
      timeRange,
      abortSignal,
    }),

  fetchKpis: async ({ services, filterState, timeRange, abortSignal }) => {
    const kpis = await fetchClassicAlertsKpis({
      ruleTypeIds,
      services,
      filterState,
      timeRange,
      abortSignal,
    });

    return {
      ...kpis,
      assigned_to_me: 0,
      unassigned: kpis.alerts_count,
    };
  },

  fetchHistogram: async ({ services, filterState, timeRange, breakdownField, abortSignal }) => {
    const rows = await fetchClassicAlertsHistogram({
      ruleTypeIds,
      services,
      filterState,
      timeRange,
      breakdownField,
      abortSignal,
    });

    return { rows, isCapHit: rows.length >= CLASSIC_ALERTS_HISTOGRAM_LIMIT };
  },

  fetchTagOptions: ({ services, timeRange, abortSignal }) =>
    fetchClassicAlertsTags({ ruleTypeIds, services, timeRange, abortSignal }),

  resolveRules: ({ services, ids }) => resolveClassicRules({ ids, services }),
});
