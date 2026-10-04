/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getRuleDetailsRoute,
  STACK_MANAGEMENT_RULES_HOST,
  type LocatorHost,
} from '@kbn/rule-data-utils';
import type { EpisodeDataSource, SeverityExtension } from '../types/episode_data_source';
import { classicActionExtensions } from './action_extensions';
import {
  EPISODE_SEVERITY_WARNING_LABEL,
  EPISODE_SEVERITY_MINOR_LABEL,
  EPISODE_SEVERITY_MAJOR_LABEL,
} from '../components/severity/translations';
import { fetchClassicAlertsAsEpisodes } from './apis/fetch_classic_episodes';
import { fetchClassicAlertsHistogram } from './apis/fetch_classic_histogram';
import { fetchClassicAlertsKpis } from './apis/fetch_classic_kpis';
import { fetchClassicAlertsTags } from './apis/fetch_classic_tags';
import { resolveClassicRules } from './apis/resolve_classic_rules';
import { fetchClassicSearchFields } from './apis/fetch_classic_search_fields';
import { CLASSIC_ALERTS_HISTOGRAM_LIMIT, CLASSIC_EPISODE_SOURCE_ID } from './constants';
import { classicAlertQueryKeys } from './query_keys';

export const CLASSIC_SEVERITY_EXTENSIONS: SeverityExtension[] = [
  {
    value: 'warning',
    label: EPISODE_SEVERITY_WARNING_LABEL,
    color: 'warning',
    sortRank: 1,
    filterDotColor: 'textWarning',
  },
  {
    value: 'minor',
    label: EPISODE_SEVERITY_MINOR_LABEL,
    color: '#94D8EB',
    sortRank: 2,
    filterDotColor: 'textPrimary',
  },
  {
    value: 'major',
    label: EPISODE_SEVERITY_MAJOR_LABEL,
    color: 'risk',
    sortRank: 3,
    filterDotColor: 'textRisk',
  },
];

export interface CreateClassicEpisodeSourceOptions {
  ruleTypeIds: string[];
  host?: LocatorHost;
}

export const createClassicEpisodeSource = ({
  ruleTypeIds,
  host = STACK_MANAGEMENT_RULES_HOST,
}: CreateClassicEpisodeSourceOptions): EpisodeDataSource => ({
  id: CLASSIC_EPISODE_SOURCE_ID,
  queryKeyPrefix: classicAlertQueryKeys.all(),

  severityExtensions: CLASSIC_SEVERITY_EXTENSIONS,

  fetchEpisodes: ({ services, pageSize, filterState, sortState, timeRange, abortSignal }) =>
    fetchClassicAlertsAsEpisodes({
      ruleTypeIds,
      services,
      pageSize,
      filterState,
      sortState,
      severityExtensions: CLASSIC_SEVERITY_EXTENSIONS,
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

  fetchSearchFields: ({ services, abortSignal }) =>
    fetchClassicSearchFields({ ruleTypeIds, services, abortSignal }),

  actionExtensions: classicActionExtensions,

  getRuleDetailsHref: (ruleId) =>
    `${host.appBasePath ?? `/app/${host.app}`}${host.pathPrefix}${getRuleDetailsRoute(ruleId)}`,
});
