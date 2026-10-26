/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProfilesListQuery, ProfilesQueryContext } from '../../types/profiles';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;
const DEFAULT_SORT_FIELD = 'createdAt';
const DEFAULT_SORT_ORDER = 'desc';

interface NormalizedProfilesListQuery {
  filter: string;
  targetType: ProfilesListQuery['targetType'] | null;
  targetId: string;
  sortField: NonNullable<ProfilesListQuery['sortField']>;
  sortOrder: NonNullable<ProfilesListQuery['sortOrder']>;
  page: number;
  perPage: number;
}

const normalizeQuery = (query: ProfilesListQuery): NormalizedProfilesListQuery => ({
  filter: query.filter ?? '',
  targetType: query.targetType ?? null,
  targetId: query.targetId ?? '',
  sortField: query.sortField ?? DEFAULT_SORT_FIELD,
  sortOrder: query.sortOrder ?? DEFAULT_SORT_ORDER,
  page: query.page ?? DEFAULT_PAGE,
  perPage: query.perPage ?? DEFAULT_PER_PAGE,
});

export const profilesQueryKeys = {
  root: (context: ProfilesQueryContext) => ['anonymizationProfiles', context.spaceId] as const,

  list: (context: ProfilesQueryContext, query: ProfilesListQuery) =>
    [...profilesQueryKeys.root(context), 'list', normalizeQuery(query)] as const,

  detail: (context: ProfilesQueryContext, profileId: string) =>
    [...profilesQueryKeys.root(context), 'detail', profileId] as const,
};
