/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { isEpisodeFlapping } from '../utils/is_episode_flapping';
import { useFetchEpisodeEventsQuery } from './use_fetch_episode_events_query';

export interface UseEpisodeFlappingOptions {
  episodeId: string | undefined;
  services: { data: DataPublicPluginStart; spaces: SpacesPluginStart };
}

/**
 * Derives whether an episode is flapping from its rule-event status history.
 * Composes {@link useFetchEpisodeEventsQuery} so callers share the same React Query cache.
 */
export const useEpisodeFlapping = ({ episodeId, services }: UseEpisodeFlappingOptions) => {
  const { data: events, isLoading } = useFetchEpisodeEventsQuery({ episodeId, services });

  const isFlapping = useMemo(
    () => isEpisodeFlapping((events ?? []).map((row) => row['episode.status'])),
    [events]
  );

  return { isFlapping, isLoading };
};
