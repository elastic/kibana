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
import type { EpisodeDataSource } from '../types/episode_data_source';
import { fetchFromSources } from '../utils/fetch_from_sources';
import { mergeTagOptions } from '../utils/merge_tag_options';
import { queryKeys } from '../query_keys';
import { useSpaceId } from './use_space_id';

export interface UseFetchEpisodeTagOptionsParams {
  services: { expressions: ExpressionsStart; spaces: SpacesPluginStart; http: HttpStart };
  timeRange?: TimeRange | null;
  additionalEpisodesDataSource?: EpisodeDataSource;
}

export const useFetchEpisodeTagOptions = ({
  services,
  timeRange,
  additionalEpisodesDataSource,
}: UseFetchEpisodeTagOptionsParams) => {
  const spaceId = useSpaceId(services.spaces);
  return useQuery({
    queryKey: queryKeys.tagOptions(
      spaceId,
      timeRange ?? undefined,
      additionalEpisodesDataSource?.id
    ),
    queryFn: async ({ signal }) => {
      const [v2Tags, sourceTags] = await Promise.all([
        fetchEpisodeTagOptions({ spaceId, services, timeRange, abortSignal: signal }),
        fetchFromSources(
          additionalEpisodesDataSource ? [additionalEpisodesDataSource] : [],
          (source) => source.fetchTagOptions?.({ services, timeRange, abortSignal: signal })
        ),
      ]);

      return [...v2Tags.map(({ tags }) => tags), ...sourceTags.results.flat()];
    },
    select: mergeTagOptions,
  });
};
