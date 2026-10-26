/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import {
  buildEpisodesDataRequest,
  type EpisodesDataEsqlRow,
} from '@kbn/alerting-v2-common-queries';
import { executeEsqlQuery } from '../utils/execute_esql_query';

export interface FetchEpisodesDataOptions {
  spaceId: string;
  episodeIds: string[];
  abortSignal?: AbortSignal;
  expressions: ExpressionsStart;
}

/**
 * Fetches the latest `data` of each of the given episodes.
 */
export const fetchEpisodesData = ({
  spaceId,
  episodeIds,
  abortSignal,
  expressions,
}: FetchEpisodesDataOptions): Promise<EpisodesDataEsqlRow[]> => {
  const { query, filter } = buildEpisodesDataRequest(spaceId, episodeIds);
  const dataFilter: Filter = {
    meta: { alias: null, disabled: false, negate: false },
    query: filter,
  };
  return executeEsqlQuery<EpisodesDataEsqlRow>({
    expressions,
    query: query.print('basic'),
    input: { type: 'kibana_context', filters: [dataFilter] },
    abortSignal,
  });
};
