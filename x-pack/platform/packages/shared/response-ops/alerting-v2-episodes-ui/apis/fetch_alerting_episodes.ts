/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLControlVariable } from '@kbn/esql-types';
import { ESQLVariableType } from '@kbn/esql-types';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import {
  buildEpisodesQuery,
  type AlertEpisodeEsqlRow,
  type EpisodesFilterState,
  type EpisodesSortState,
} from '../queries/episodes_query';
import { PAGE_SIZE_ESQL_VARIABLE } from '../constants';
import { executeEsqlQuery } from '../utils/execute_esql_query';

export interface FetchAlertingEpisodesOptions {
  pageSize: number;
  timeRange?: TimeRange | null;
  filterState?: EpisodesFilterState;
  sortState?: EpisodesSortState;
  abortSignal?: AbortSignal;
  services: { expressions: ExpressionsStart };
}

/**
 * Executes an ES|QL query to fetch alerting episodes.
 * Uses the timestamp of the last episode from the previous page as a cursor for pagination.
 */
export const fetchAlertingEpisodes = ({
  abortSignal,
  pageSize,
  services: { expressions },
  filterState,
  sortState = { sortField: '@timestamp', sortDirection: 'desc' },
  timeRange,
}: FetchAlertingEpisodesOptions): Promise<AlertEpisodeEsqlRow[]> => {
  const query = buildEpisodesQuery(sortState, filterState);

  const input: {
    type: 'kibana_context';
    esqlVariables: ESQLControlVariable[];
    timeRange?: TimeRange;
  } = {
    type: 'kibana_context',
    esqlVariables: [
      { key: PAGE_SIZE_ESQL_VARIABLE, value: pageSize, type: ESQLVariableType.VALUES },
    ],
  };

  if (timeRange) {
    input.timeRange = timeRange;
  }

  return executeEsqlQuery<AlertEpisodeEsqlRow>({
    expressions,
    query: query.print('basic'),
    input,
    abortSignal,
  });
};
