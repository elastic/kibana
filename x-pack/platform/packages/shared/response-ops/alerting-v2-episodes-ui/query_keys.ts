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
  actions: (spaceId: string, episodeIds: string[]) =>
    [...queryKeys.actionsAll(), spaceId, ...episodeIds] as const,
  groupActionsAll: () => [...queryKeys.all, 'group-actions'] as const,
  groupActions: (spaceId: string, groupHashes: string[]) =>
    [...queryKeys.groupActionsAll(), spaceId, ...groupHashes] as const,
  list: (
    spaceId: string,
    pageSize: number,
    filterState?: EpisodesFilterState,
    sortState?: EpisodesSortState,
    timeRange?: { from: string; to: string } | null
  ) => [...queryKeys.all, 'list', spaceId, pageSize, filterState, sortState, timeRange] as const,
  episodeEvents: (spaceId: string, episodeId: string) =>
    [...queryKeys.all, 'episode-events', spaceId, episodeId] as const,
  relatedSameGroupEpisodes: (
    spaceId: string,
    ruleId: string,
    groupHash: string,
    pageSize: number
  ) =>
    [
      ...queryKeys.all,
      'related-episodes-same-group',
      spaceId,
      ruleId,
      groupHash,
      pageSize,
    ] as const,
  relatedOtherEpisodes: (
    spaceId: string,
    ruleId: string,
    pageSize: number,
    currentGroupKey: string,
    excludeEpisodeId: string
  ) =>
    [
      ...queryKeys.all,
      'related-episodes-other',
      spaceId,
      ruleId,
      pageSize,
      currentGroupKey,
      excludeEpisodeId,
    ] as const,
  episodeEventData: (spaceId: string, episodeId: string) =>
    [...queryKeys.all, 'episode-event-data', spaceId, episodeId] as const,
  relatedEpisodes: (spaceId: string, ruleId: string, excludeEpisodeId: string, pageSize: number) =>
    [...queryKeys.all, 'related-episodes', spaceId, ruleId, excludeEpisodeId, pageSize] as const,
  tagOptionsAll: () => [...queryKeys.all, 'tag-options'] as const,
  tagOptions: (spaceId: string, timeRange?: { from: string; to: string } | null) =>
    [...queryKeys.tagOptionsAll(), spaceId, timeRange] as const,
  tagSuggestions: (spaceId: string) => [...queryKeys.all, 'tag-suggestions', spaceId] as const,
  assigneeSuggestions: (searchTerm: string) =>
    [...queryKeys.all, 'assignee-suggestions', searchTerm] as const,
  bulkGetProfiles: (uids: string[]) => [...queryKeys.all, 'bulk-get-profiles', ...uids] as const,
};
