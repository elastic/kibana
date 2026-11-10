/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAdditionalEpisodesDataSource } from '../context/episode_data_source_context';
import type { CanWriteEpisode } from '../utils/episode_write_privilege';
import type { EpisodeWriteAccessServices } from '../types/episode_data_source';

const useNoSourceWriteAccess = (): CanWriteEpisode | undefined => undefined;

/**
 * Resolves which of the additional data source's alerts the user may modify. Returns `undefined`
 * when there is no source.
 */
export const useSourceWriteAccess = (
  services: EpisodeWriteAccessServices
): CanWriteEpisode | undefined => {
  const dataSource = useAdditionalEpisodesDataSource();
  const useWriteAccess: (services: EpisodeWriteAccessServices) => CanWriteEpisode | undefined =
    dataSource?.useWriteAccess ?? useNoSourceWriteAccess;

  return useWriteAccess(services);
};
