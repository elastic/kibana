/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEpisode } from '../queries/episodes_query';
import { normalizeEpisodeEventDataPayload } from './resolve_episode_event_data';

/**
 * Builds the `data.*` field options for the conditional-snooze `field_change` dropdown from the
 * selected episodes' data. Only scalar fields are included, since those are the only ones the
 * dispatcher can evaluate (see `parseDataJson`).
 */
export const getEpisodeDataFieldOptions = (
  episodes: ReadonlyArray<Pick<AlertEpisode, 'episode_data'>>
): string[] => {
  const fields = new Set<string>();

  for (const episode of episodes) {
    const data = normalizeEpisodeEventDataPayload(episode.episode_data);
    if (!data) {
      continue;
    }
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        fields.add(`data.${key}`);
      }
    }
  }

  return [...fields].sort();
};
