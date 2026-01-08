/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useLastPage } from './use_last_page';
import type { UserActivityParams } from '../user_actions_activity_bar/types';
import type { CaseUserActionsStats } from '../../containers/types';

const userActivityQueryParams: UserActivityParams = {
  type: 'all',
  sortOrder: 'asc',
  page: 1,
  perPage: 10,
};

const userActionsStats: CaseUserActionsStats = {
  total: 5,
  totalDeletions: 0,
  totalComments: 2,
  totalCommentDeletions: 0,
  totalCommentCreations: 10,
  totalHiddenCommentUpdates: 0,
  totalOtherActions: 3,
  totalOtherActionDeletions: 0,
};

jest.mock('../../common/lib/kibana');

describe('useLastPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns correctly', async () => {
    const { result } = renderHook(() =>
      useLastPage({
        userActionsStats,
        userActivityQueryParams,
      })
    );

    expect(result.current).toEqual({
      lastPage: 1,
    });
  });

  it('returns 1 when actions stats are 0', async () => {
    const { result } = renderHook(() =>
      useLastPage({
        userActionsStats: {
          total: 0,
          totalDeletions: 0,
          totalComments: 0,
          totalCommentDeletions: 0,
          totalHiddenCommentUpdates: 0,
          totalCommentCreations: 10,
          totalOtherActions: 0,
          totalOtherActionDeletions: 0,
        },
        userActivityQueryParams,
      })
    );

    expect(result.current).toEqual({
      lastPage: 1,
    });
  });

  it('returns correct last page when filter type is all', async () => {
    const { result } = renderHook(() =>
      useLastPage({
        userActionsStats: {
          total: 38,
          totalDeletions: 0,
          totalHiddenCommentUpdates: 0,
          totalComments: 17,
          totalCommentDeletions: 0,
          totalCommentCreations: 10,
          totalOtherActions: 21,
          totalOtherActionDeletions: 0,
        },
        userActivityQueryParams,
      })
    );

    expect(result.current).toEqual({
      lastPage: 4,
    });
  });

  it('returns correct last page when filter type is user', async () => {
    const { result } = renderHook(() =>
      useLastPage({
        userActionsStats: {
          total: 38,
          totalDeletions: 0,
          totalComments: 17,
          totalHiddenCommentUpdates: 0,
          totalCommentDeletions: 0,
          totalCommentCreations: 11,
          totalOtherActions: 21,
          totalOtherActionDeletions: 0,
        },
        userActivityQueryParams: {
          ...userActivityQueryParams,
          type: 'user',
        },
      })
    );

    expect(result.current).toEqual({
      lastPage: 2,
    });
  });

  it('returns correct last page when filter type is action', async () => {
    const { result } = renderHook(() =>
      useLastPage({
        userActionsStats: {
          total: 38,
          totalDeletions: 0,
          totalHiddenCommentUpdates: 0,
          totalComments: 17,
          totalCommentDeletions: 0,
          totalCommentCreations: 10,
          totalOtherActions: 21,
          totalOtherActionDeletions: 0,
        },
        userActivityQueryParams: {
          ...userActivityQueryParams,
          type: 'action',
        },
      })
    );

    expect(result.current).toEqual({
      lastPage: 3,
    });
  });
});
