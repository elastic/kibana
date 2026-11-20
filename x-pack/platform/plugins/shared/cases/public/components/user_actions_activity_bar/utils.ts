/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseUserActionsStats } from '../../containers/types';
import type { UserActivityParams } from './types';

/**
 * Counts of the rows the feed shows. Comment edits and thread replies are left out of the feed,
 * so they are left out of the counts too.
 */
export const getVisibleUserActionCounts = (
  stats?: CaseUserActionsStats
): { total: number; comments: number; history: number } => {
  const total = Math.max(
    (stats?.total ?? 0) - (stats?.totalCommentUpdates ?? 0) - (stats?.totalReplies ?? 0),
    0
  );
  const comments = Math.max(
    (stats?.totalCommentCreations ?? 0) - (stats?.totalReplyCreations ?? 0),
    0
  );

  return { total, comments, history: Math.max(total - comments, 0) };
};

/**
 * True when type, author, search, or source is applied. Uses committed params.
 */
export const hasActiveUserActivityFilter = (params: UserActivityParams): boolean =>
  Boolean(
    params.type !== 'all' || params.authors?.length || params.search || params.sources?.length
  );

/**
 * True when search, authors, or sources are set. Excludes type so stats can still page.
 */
export const hasNonTypeActivityFilter = (
  params: Pick<UserActivityParams, 'search' | 'authors' | 'sources'>
): boolean => Boolean(params.search || params.authors?.length || params.sources?.length);
