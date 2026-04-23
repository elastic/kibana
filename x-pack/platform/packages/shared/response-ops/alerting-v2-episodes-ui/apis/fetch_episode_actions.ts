/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import {
  buildEpisodeActionsQuery,
  type AlertEpisodeAction,
} from '../queries/episode_actions_query';
import { executeEsqlQuery } from '../utils/execute_esql_query';

export interface FetchEpisodeActionsOptions {
  episodeIds: string[];
  abortSignal?: AbortSignal;
  services: { expressions: ExpressionsStart };
}

/**
 * Executes an ES|QL query to fetch latest acknowledge action and assignee by episode.
 */
export const fetchEpisodeActions = ({
  episodeIds,
  abortSignal,
  services: { expressions },
}: FetchEpisodeActionsOptions): Promise<AlertEpisodeAction[]> => {
  return executeEsqlQuery<AlertEpisodeAction>({
    expressions,
    query: buildEpisodeActionsQuery(episodeIds).print('basic'),
    input: null,
    abortSignal,
    noCache: true,
  });
};
