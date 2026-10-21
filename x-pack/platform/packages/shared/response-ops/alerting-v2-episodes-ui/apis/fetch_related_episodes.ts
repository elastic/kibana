/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLControlVariable } from '@kbn/esql-types';
import { ESQLVariableType } from '@kbn/esql-types';
import type { Filter } from '@kbn/es-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import {
  buildEpisodesDataRequest,
  PAGE_SIZE_ESQL_VARIABLE,
  type EpisodesDataEsqlRow,
} from '@kbn/alerting-v2-common-queries';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import { executeEsqlQuery } from '../utils/execute_esql_query';

export interface FetchRelatedEpisodesOptions {
  spaceId: string;
  /** Pre-built related-episodes ES|QL (e.g. from `build*RelatedAlertEpisodesEsqlQuery(…).print('basic')`). */
  query: string;
  pageSize: number;
  abortSignal?: AbortSignal;
  expressions: ExpressionsStart;
}

/**
 * Runs a related-episodes ES|QL string through the expressions `esql` function with a page size
 * variable, then adds the latest `data` of the returned episodes with a second, small query.
 */
export const fetchRelatedEpisodes = async ({
  spaceId,
  abortSignal,
  pageSize,
  query,
  expressions,
}: FetchRelatedEpisodesOptions): Promise<AlertEpisode[]> => {
  const episodes = await executeEsqlQuery<AlertEpisode>({
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
  if (episodes.length === 0) {
    return episodes;
  }

  const dataRequest = buildEpisodesDataRequest(
    spaceId,
    episodes.map((episode) => episode['episode.id'])
  );
  const dataFilter: Filter = {
    meta: { alias: null, disabled: false, negate: false },
    query: dataRequest.filter,
  };
  const dataRows = await executeEsqlQuery<EpisodesDataEsqlRow>({
    expressions,
    query: dataRequest.query.print('basic'),
    input: { type: 'kibana_context', filters: [dataFilter] },
    abortSignal,
  });
  const dataByEpisodeId = new Map(dataRows.map((row) => [row['episode.id'], row.episode_data]));

  return episodes.map((episode) => ({
    ...episode,
    episode_data: dataByEpisodeId.get(episode['episode.id']) ?? null,
  }));
};
