/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLControlVariable } from '@kbn/esql-types';
import { ESQLVariableType } from '@kbn/esql-types';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { TimeRange, Filter } from '@kbn/es-query';
import {
  buildEpisodesPaginatedQuery,
  type EpisodesFilterState,
  type EpisodesSortState,
} from '../utils/build_episodes_esql_query';
import { buildEpisodesFilters } from '../utils/build_episodes_filters';
import { LAST_EPISODE_TIMESTAMP_ESQL_VARIABLE, PAGE_SIZE_ESQL_VARIABLE } from '../constants';
import { executeEsqlQuery } from '../utils/execute_esql_query';

export interface FetchAlertingEpisodesOptions {
  abortSignal?: AbortSignal;
  beforeTimestamp?: string | null;
  pageSize: number;
  services: { expressions: ExpressionsStart };
  filterState?: EpisodesFilterState;
  sortState?: EpisodesSortState;
  timeRange?: TimeRange | null;
  dataView: DataView;
}

/**
 * Executes an ES|QL query to fetch alerting episodes.
 * Uses the timestamp of the last episode from the previous page as a cursor for pagination.
 */
export const fetchAlertingEpisodes = ({
  abortSignal,
  pageSize,
  beforeTimestamp = null,
  services: { expressions },
  filterState,
  sortState = { sortField: '@timestamp', sortDirection: 'desc' },
  timeRange,
  dataView,
}: FetchAlertingEpisodesOptions) => {
  const query = buildEpisodesPaginatedQuery(sortState);
  const filters = buildEpisodesFilters(filterState, dataView);

  const input: {
    type: 'kibana_context';
    esqlVariables: ESQLControlVariable[];
    timeRange?: TimeRange;
    filters?: Filter[];
  } = {
    type: 'kibana_context',
    esqlVariables: [
      {
        key: LAST_EPISODE_TIMESTAMP_ESQL_VARIABLE,
        value: beforeTimestamp as ESQLControlVariable['value'],
        type: ESQLVariableType.VALUES,
      },
      { key: PAGE_SIZE_ESQL_VARIABLE, value: pageSize, type: ESQLVariableType.VALUES },
    ],
  };

  if (timeRange) {
    input.timeRange = timeRange;
  }

  if (filters.length > 0) {
    input.filters = filters;
  }

  return executeEsqlQuery({
    expressions,
    query: query.print('basic'),
    input,
    abortSignal,
  });
};
