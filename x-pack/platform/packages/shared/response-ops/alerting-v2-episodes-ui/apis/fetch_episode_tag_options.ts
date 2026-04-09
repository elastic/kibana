/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import {
  buildEpisodeTagOptionsQuery,
  type EpisodeTagOptionRow,
} from '../queries/episode_tag_options_query';
import { executeEsqlQuery } from '../utils/execute_esql_query';

export interface FetchEpisodeTagOptionsParams {
  services: { expressions: ExpressionsStart };
  timeRange?: TimeRange | null;
  abortSignal?: AbortSignal;
}

/**
 * Returns distinct tag strings from `.alert-actions` tag events in the given time range.
 */
export const fetchEpisodeTagOptions = ({
  abortSignal,
  services: { expressions },
  timeRange,
}: FetchEpisodeTagOptionsParams): Promise<string[]> => {
  const query = buildEpisodeTagOptionsQuery().print('basic');

  const input: {
    type: 'kibana_context';
    esqlVariables: ESQLControlVariable[];
    timeRange?: TimeRange;
  } = {
    type: 'kibana_context',
    esqlVariables: [],
  };

  if (timeRange) {
    input.timeRange = timeRange;
  }

  return executeEsqlQuery<EpisodeTagOptionRow>({
    expressions,
    query,
    input,
    abortSignal,
  }).then((rows) => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const row of rows) {
      const t = row.tags;
      if (t && !seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
    return out;
  });
};
