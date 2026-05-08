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
  timeRange?: TimeRange | null;
  abortSignal?: AbortSignal;
  services: { expressions: ExpressionsStart };
}

/**
 * Returns tag option rows from `.alert-actions` tag events in the given time range.
 */
export const fetchEpisodeTagOptions = ({
  abortSignal,
  timeRange,
  services: { expressions },
}: FetchEpisodeTagOptionsParams): Promise<EpisodeTagOptionRow[]> => {
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
  });
};
