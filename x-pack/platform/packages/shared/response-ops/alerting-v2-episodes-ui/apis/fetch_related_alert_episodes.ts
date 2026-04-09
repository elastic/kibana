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
import { buildRelatedAlertEpisodesEsqlQuery } from '../queries/related_episodes_query';
import { executeEsqlQuery } from '../utils/execute_esql_query';

export interface FetchRelatedAlertEpisodesOptions {
  abortSignal?: AbortSignal;
  pageSize: number;
  ruleId: string;
  excludeEpisodeId: string;
  services: { expressions: ExpressionsStart };
}

/**
 * Executes an ES|QL query to fetch episodes related to the current one (excluded).
 */
export const fetchRelatedAlertEpisodes = ({
  abortSignal,
  pageSize,
  ruleId,
  excludeEpisodeId,
  services: { expressions },
}: FetchRelatedAlertEpisodesOptions): Promise<AlertEpisode[]> => {
  return executeEsqlQuery<AlertEpisode>({
    expressions,
    query: buildRelatedAlertEpisodesEsqlQuery(ruleId, excludeEpisodeId).print('basic'),
    input: {
      type: 'kibana_context',
      esqlVariables: [
        { key: PAGE_SIZE_ESQL_VARIABLE, value: pageSize, type: ESQLVariableType.VALUES },
      ] satisfies ESQLControlVariable[],
    },
    abortSignal,
  });
};
