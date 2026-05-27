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
  listAll: () => [...queryKeys.all, 'list'] as const,
  list: (
    spaceId: string,
    pageSize: number,
    filterState?: EpisodesFilterState,
    sortState?: EpisodesSortState,
    timeRange?: { from: string; to: string } | null
  ) => [...queryKeys.listAll(), spaceId, pageSize, filterState, sortState, timeRange] as const,
  episodeEventsAll: () => [...queryKeys.all, 'episode-events'] as const,
  episodeEvents: (spaceId: string, episodeId: string) =>
    [...queryKeys.episodeEventsAll(), spaceId, episodeId] as const,
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
  episodeEventDataAll: () => [...queryKeys.all, 'episode-event-data'] as const,
  episodeEventData: (spaceId: string, episodeId: string) =>
    [...queryKeys.episodeEventDataAll(), spaceId, episodeId] as const,
  tagOptionsAll: () => [...queryKeys.all, 'tag-options'] as const,
  tagOptions: (spaceId: string, timeRange?: { from: string; to: string } | null) =>
    [...queryKeys.tagOptionsAll(), spaceId, timeRange] as const,
  tagSuggestionsAll: () => [...queryKeys.all, 'tag-suggestions'] as const,
  tagSuggestions: (spaceId: string) => [...queryKeys.tagSuggestionsAll(), spaceId] as const,
  assigneeSuggestions: (searchTerm: string) =>
    [...queryKeys.all, 'assignee-suggestions', searchTerm] as const,
  bulkGetProfiles: (uids: string[]) => [...queryKeys.all, 'bulk-get-profiles', ...uids] as const,
};
