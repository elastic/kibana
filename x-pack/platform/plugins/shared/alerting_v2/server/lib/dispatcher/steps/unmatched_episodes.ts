/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionGroup, AlertEpisode } from '../types';
import { suppressionEpisodeKey } from './utils/suppression_key';

export function getUnmatchedEpisodes(
  dispatchable: readonly AlertEpisode[],
  dispatch: readonly ActionGroup[],
  throttled: readonly ActionGroup[]
): AlertEpisode[] {
  const handledEpisodeKeys = new Set<string>();
  for (const group of [...dispatch, ...throttled]) {
    for (const episode of group.episodes) {
      handledEpisodeKeys.add(suppressionEpisodeKey(episode));
    }
  }
  return dispatchable.filter((ep) => !handledEpisodeKeys.has(suppressionEpisodeKey(ep)));
}
