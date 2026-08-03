/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { HttpStart } from '@kbn/core-http-browser';
import type { TimeRange } from '@kbn/es-query';
import { fetchEpisodeTagOptions } from '../apis/fetch_episode_tag_options';
import { fetchV1AlertsTags } from '../apis/classic_alerts_api';
import type { EpisodeTagOptionRow } from '../queries/episode_tag_options_query';
import { queryKeys } from '../query_keys';
import { useSpaceId } from './use_space_id';

export interface UseFetchEpisodeTagOptionsParams {
  services: { expressions: ExpressionsStart; spaces: SpacesPluginStart; http: HttpStart };
  timeRange?: TimeRange | null;
}

export const useFetchEpisodeTagOptions = ({
  services,
  timeRange,
}: UseFetchEpisodeTagOptionsParams) => {
  const spaceId = useSpaceId(services.spaces);
  return useQuery({
    queryKey: queryKeys.tagOptions(spaceId, timeRange ?? undefined),
    queryFn: async ({ signal }) => {
      // Combine v2 tag actions with classic (v1) alert rule tags (RBAC enforced
      // server-side) so both appear in the filter. The v1 read is best-effort.
      const [v2Tags, v1Tags] = await Promise.all([
        fetchEpisodeTagOptions({ spaceId, services, timeRange, abortSignal: signal }),
        fetchV1AlertsTags({ services, timeRange, abortSignal: signal }).catch(() => [] as string[]),
      ]);

      return [...v2Tags, ...v1Tags.map((tag) => ({ tags: tag }))];
    },
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
};
