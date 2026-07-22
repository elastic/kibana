/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionGroup, AlertEpisode } from '../types';

export function getUnmatchedEpisodes(
  dispatchable: readonly AlertEpisode[],
  dispatch: readonly ActionGroup[],
  throttled: readonly ActionGroup[],
  suppressed: readonly AlertEpisode[] = []
): AlertEpisode[] {
  const handledEpisodeKeys = new Set<string>();
  for (const group of [...dispatch, ...throttled]) {
    for (const episode of group.episodes) {
      handledEpisodeKeys.add(episodeKey(episode));
    }
  }
  // Episodes moved to `suppressed` (e.g. rule-dependency suppression, which runs
  // after matching and leaves them in `dispatchable`) did match a policy — they
  // must not be double-counted as "unmatched".
  for (const episode of suppressed) {
    handledEpisodeKeys.add(episodeKey(episode));
  }
  return dispatchable.filter((ep) => !handledEpisodeKeys.has(episodeKey(ep)));
}

function episodeKey(episode: AlertEpisode): string {
  return `${episode.rule_id}:${episode.group_hash}:${episode.episode_id}`;
}
