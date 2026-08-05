/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEpisode } from '../queries/episodes_query';

export const getEpisodesFromDocIds = (
  selectedDocIds: string[],
  episodesData: AlertEpisode[]
): AlertEpisode[] => {
  const selected = new Set(selectedDocIds);
  return episodesData.filter((ep) => selected.has(ep['episode.id']));
};

export const uniqueGroupEpisodes = (episodes: AlertEpisode[]): AlertEpisode[] => {
  const seen = new Set<string>();
  return episodes.filter((ep) => {
    if (!ep.group_hash || seen.has(ep.group_hash)) return false;
    seen.add(ep.group_hash);
    return true;
  });
};
