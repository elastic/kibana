/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseUserActionsStats } from '../../containers/types';
import { getUserActivityTypeFilterCounts } from './get_type_filter_counts';

const baseStats: CaseUserActionsStats = {
  total: 20,
  totalDeletions: 0,
  totalComments: 10,
  totalCommentCreations: 10,
  totalCommentDeletions: 0,
  totalHiddenCommentUpdates: 0,
  totalOtherActions: 10,
  totalOtherActionDeletions: 0,
  totalVisibleOtherActions: 10,
};

describe('getUserActivityTypeFilterCounts', () => {
  it('returns zeros when stats are missing', () => {
    expect(getUserActivityTypeFilterCounts()).toEqual({ all: 0, comments: 0, history: 0 });
  });

  it('uses document totals when there is no extended_fields expansion', () => {
    expect(getUserActivityTypeFilterCounts(baseStats)).toEqual({
      all: 20,
      comments: 10,
      history: 10,
    });
  });

  it('inflates History and All when visible other-actions exceed document other-actions', () => {
    expect(
      getUserActivityTypeFilterCounts({
        ...baseStats,
        totalVisibleOtherActions: 17,
      })
    ).toEqual({
      all: 27,
      comments: 10,
      history: 17,
    });
  });

  it('applies comment deletion and hidden-update adjustments to All', () => {
    expect(
      getUserActivityTypeFilterCounts({
        ...baseStats,
        totalCommentDeletions: 2,
        totalCommentCreations: 10,
        totalHiddenCommentUpdates: 1,
        totalVisibleOtherActions: 12,
      })
    ).toEqual({
      all: 19, // 20 - 2 - 1 - 10 + 12
      comments: 8,
      history: 12,
    });
  });
});
