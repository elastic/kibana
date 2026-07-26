/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLControlVariable } from '@kbn/esql-types';
import { ESQLVariableType } from '@kbn/esql-types';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { PAGE_SIZE_ESQL_VARIABLE } from '../constants';
import type { AlertEpisode } from '../queries/episodes_query';
import { executeEsqlQuery } from '../utils/execute_esql_query';

export interface FetchRelatedEpisodesOptions {
  /** Pre-built related-episodes ES|QL (e.g. from `build*RelatedAlertEpisodesEsqlQuery(…).print('basic')`). */
  query: string;
  pageSize: number;
  abortSignal?: AbortSignal;
  expressions: ExpressionsStart;
}

/**
 * Runs a related-episodes ES|QL string through the expressions `esql` function with a page size variable.
 */
export const fetchRelatedEpisodes = ({
  abortSignal,
  pageSize,
  query,
  expressions,
}: FetchRelatedEpisodesOptions): Promise<AlertEpisode[]> =>
  executeEsqlQuery<AlertEpisode>({
    expressions,
    query,
    input: {
      type: 'kibana_context',
      esqlVariables: [
        { key: PAGE_SIZE_ESQL_VARIABLE, value: pageSize, type: ESQLVariableType.VALUES },
      ] satisfies ESQLControlVariable[],
    },
    abortSignal,
  });
