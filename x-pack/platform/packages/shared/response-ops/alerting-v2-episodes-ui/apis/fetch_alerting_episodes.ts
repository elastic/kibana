/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLControlVariable } from '@kbn/esql-types';
import { ESQLVariableType } from '@kbn/esql-types';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import {
  ALERTING_EPISODES_PAGINATED_QUERY,
  LAST_EPISODE_TIMESTAMP_VARIABLE,
  PAGE_SIZE_VARIABLE,
} from '../constants';
import { executeEsqlQuery } from '../utils/execute_esql_query';

export interface FetchAlertingEpisodesOptions {
  abortSignal?: AbortSignal;
  beforeTimestamp?: string | null;
  pageSize: number;
  services: { expressions: ExpressionsStart };
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
}: FetchAlertingEpisodesOptions) => {
  // With ES|QL, we can only paginate using a @timestamp cursor, so we use the timestamp
  // of the last episode from the previous page as the cursor for the next page.
  // For the first page, we use null to disable the condition.
  return executeEsqlQuery({
    expressions,
    query: ALERTING_EPISODES_PAGINATED_QUERY,
    input: {
      type: 'kibana_context',
      esqlVariables: [
        {
          key: LAST_EPISODE_TIMESTAMP_VARIABLE,
          // null is not a valid type but works in practice
          value: beforeTimestamp as ESQLControlVariable['value'],
          type: ESQLVariableType.VALUES,
        },
        { key: PAGE_SIZE_VARIABLE, value: pageSize, type: ESQLVariableType.VALUES },
      ] satisfies ESQLControlVariable[],
    },
    abortSignal,
  });
};
