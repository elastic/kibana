/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EpisodesFilterState, EpisodesSortState } from './queries/episodes_query';

export const queryKeys = {
  all: ['alert-episodes'] as const,
  actionsAll: () => [...queryKeys.all, 'actions'] as const,
  actions: (episodeIds: string[]) => [...queryKeys.actionsAll(), ...episodeIds] as const,
  groupActionsAll: () => [...queryKeys.all, 'group-actions'] as const,
  groupActions: (groupHashes: string[]) =>
    [...queryKeys.groupActionsAll(), ...groupHashes] as const,
  list: (
    pageSize: number,
    filterState?: EpisodesFilterState,
    sortState?: EpisodesSortState,
    timeRange?: { from: string; to: string } | null
  ) => [...queryKeys.all, 'list', pageSize, filterState, sortState, timeRange] as const,
  episodeEvents: (episodeId: string) => [...queryKeys.all, 'episode-events', episodeId] as const,
  relatedEpisodes: (ruleId: string, excludeEpisodeId: string, pageSize: number) =>
    [...queryKeys.all, 'related-episodes', ruleId, excludeEpisodeId, pageSize] as const,
  tagOptionsAll: () => [...queryKeys.all, 'tag-options'] as const,
  tagOptions: (timeRange?: { from: string; to: string } | null) =>
    [...queryKeys.tagOptionsAll(), timeRange] as const,
  tagSuggestions: () => [...queryKeys.all, 'tag-suggestions'] as const,
  assigneeSuggestions: (searchTerm: string) =>
    [...queryKeys.all, 'assignee-suggestions', searchTerm] as const,
  bulkGetProfiles: (uids: string[]) => [...queryKeys.all, 'bulk-get-profiles', ...uids] as const,
};
