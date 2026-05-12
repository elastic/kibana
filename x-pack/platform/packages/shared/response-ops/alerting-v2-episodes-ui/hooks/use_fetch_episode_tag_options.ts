/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { fetchEpisodeTagOptions } from '../apis/fetch_episode_tag_options';
import type { EpisodeTagOptionRow } from '../queries/episode_tag_options_query';
import { queryKeys } from '../query_keys';

export interface UseFetchEpisodeTagOptionsParams {
  services: { expressions: ExpressionsStart };
  timeRange?: TimeRange | null;
}

export const useFetchEpisodeTagOptions = ({
  services,
  timeRange,
}: UseFetchEpisodeTagOptionsParams) =>
  useQuery({
    queryKey: queryKeys.tagOptions(timeRange ?? undefined),
    queryFn: ({ signal }) =>
      fetchEpisodeTagOptions({
        services,
        timeRange,
        abortSignal: signal,
      }),
    select: (rows: EpisodeTagOptionRow[]) => {
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
    },
  });
