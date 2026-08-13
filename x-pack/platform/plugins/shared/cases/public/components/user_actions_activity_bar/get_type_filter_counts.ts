/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseUserActionsStats } from '../../containers/types';

export interface UserActivityTypeFilterCounts {
  all: number;
  comments: number;
  history: number;
}

/**
 * Badge counts for the Activity Type filter (All / Comments / History).
 * History/All use visible-row totals so multi-field extended_fields expansions
 * match the timeline; Comments stay document-based. Pagination must keep using
 * document totals (`total` / `totalOtherActions`), not these values.
 */
export const getUserActivityTypeFilterCounts = (
  userActionsStats?: CaseUserActionsStats
): UserActivityTypeFilterCounts => {
  if (!userActionsStats) {
    return { all: 0, comments: 0, history: 0 };
  }

  const history = Math.max(userActionsStats.totalVisibleOtherActions, 0);
  const comments = Math.max(
    userActionsStats.totalCommentCreations - userActionsStats.totalCommentDeletions,
    0
  );

  if (userActionsStats.total <= 0) {
    return { all: 0, comments, history };
  }

  // Replace the document History portion of All with the visible History total.
  const documentAll =
    userActionsStats.total -
    userActionsStats.totalCommentDeletions -
    userActionsStats.totalHiddenCommentUpdates;
  const all = Math.max(
    documentAll - userActionsStats.totalOtherActions + userActionsStats.totalVisibleOtherActions,
    0
  );

  return { all, comments, history };
};
