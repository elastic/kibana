/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { profilesQueryKeys } from './cache_keys';

describe('profilesQueryKeys', () => {
  const context = { spaceId: 'space-a' };

  it('builds stable root/list/detail keys', () => {
    expect(profilesQueryKeys.root(context)).toEqual(['anonymizationProfiles', 'space-a']);
    expect(profilesQueryKeys.detail(context, 'profile-1')).toEqual([
      'anonymizationProfiles',
      'space-a',
      'detail',
      'profile-1',
    ]);
  });

  it('normalizes omitted query fields with explicit defaults', () => {
    expect(profilesQueryKeys.list(context, {})).toEqual([
      'anonymizationProfiles',
      'space-a',
      'list',
      {
        filter: '',
        targetType: null,
        targetId: '',
        sortField: 'createdAt',
        sortOrder: 'desc',
        page: 1,
        perPage: 20,
      },
    ]);
  });

  it('preserves provided query dimensions', () => {
    expect(
      profilesQueryKeys.list(context, {
        filter: 'email',
        targetType: 'data_view',
        targetId: 'logs-*',
        sortField: 'updatedAt',
        sortOrder: 'asc',
        page: 3,
        perPage: 50,
      })
    ).toEqual([
      'anonymizationProfiles',
      'space-a',
      'list',
      {
        filter: 'email',
        targetType: 'data_view',
        targetId: 'logs-*',
        sortField: 'updatedAt',
        sortOrder: 'asc',
        page: 3,
        perPage: 50,
      },
    ]);
  });
});
