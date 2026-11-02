/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import {
  DEFAULT_EPISODE_FLAPPING_SETTINGS,
  isEpisodeFlapping,
  type FlappingSettings,
} from '../utils/is_episode_flapping';
import { useFetchEpisodeFlappingQuery } from './use_fetch_episode_flapping_query';

export interface UseEpisodeFlappingOptions {
  episodeId: string | undefined;
  services: { data: DataPublicPluginStart; spaces: SpacesPluginStart };
  settings?: FlappingSettings;
}

/**
 * Derives whether an episode is flapping from its most recent rule-event statuses.
 *
 * Uses {@link useFetchEpisodeFlappingQuery} (a dedicated newest-first query bounded
 * to the look-back window) rather than the unbounded oldest-first events query, so
 * the look-back reflects the genuinely latest events even for episodes with more
 * than ES|QL's implicit `LIMIT 1000` rows.
 */
export const useEpisodeFlapping = ({
  episodeId,
  services,
  settings = DEFAULT_EPISODE_FLAPPING_SETTINGS,
}: UseEpisodeFlappingOptions) => {
  const { data: events, isLoading } = useFetchEpisodeFlappingQuery({
    episodeId,
    services,
  });

  const isFlapping = useMemo(
    () =>
      isEpisodeFlapping(
        (events ?? []).map((row) => row['episode.status']),
        settings
      ),
    [events, settings]
  );

  return { isFlapping, isLoading };
};
