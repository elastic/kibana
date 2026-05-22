/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MatcherContext } from '@kbn/alerting-v2-schemas';
import type { AlertEpisode, Rule } from '../../types';

export function createMatcherContext(episode: AlertEpisode, rule: Rule): MatcherContext {
  return {
    last_event_timestamp: episode.last_event_timestamp,
    group_hash: episode.group_hash,
    episode_id: episode.episode_id,
    episode_status: episode.episode_status,
    ...(episode.data ? { data: episode.data } : {}),
    rule: {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      tags: rule.tags,
      enabled: rule.enabled,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    },
  };
}
