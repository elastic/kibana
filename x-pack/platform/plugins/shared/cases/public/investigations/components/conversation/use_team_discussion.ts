/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type {
  Actor,
  InvestigationRecord,
  RecordComment,
} from '../../../../common/investigations/types';
import { useComments } from '../../hooks';

export interface TeamDiscussionData {
  /** Loaded comments, oldest first, so the newest sits at the bottom. */
  comments: RecordComment[];
  total: number;
  /** The number of comments in the discussion (same as `total`). */
  messageCount: number;
  /** Older comments that are not loaded yet. */
  hasOlder: boolean;
  isFetchingOlder: boolean;
  fetchOlder: () => void;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/** The record's discussion: Cases comments on its case, paged from the newest backwards. */
export const useTeamDiscussion = (record: InvestigationRecord): TeamDiscussionData => {
  const { data, isLoading, error, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useComments(record.id);

  const comments = useMemo(
    () => (data?.pages ?? []).flatMap((page) => page.comments).reverse(),
    [data]
  );

  const total = data?.pages[0]?.total ?? 0;

  return {
    comments,
    total,
    messageCount: total,
    hasOlder: Boolean(hasNextPage),
    isFetchingOlder: isFetchingNextPage,
    fetchOlder: () => void fetchNextPage(),
    isLoading,
    error,
    refetch: () => void refetch(),
  };
};

/** People who can be mentioned in the discussion: the record's participants and owner who are people. */
export const getMentionableActors = (record: InvestigationRecord): Actor[] => {
  const seen = new Set<string>();
  return [...record.participants, ...(record.owner ? [record.owner] : [])].filter((actor) => {
    if (actor.type !== 'user' || seen.has(actor.id)) {
      return false;
    }
    seen.add(actor.id);
    return true;
  });
};
