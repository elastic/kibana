/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type {
  Actor,
  CommentItem,
  FindItemsRequest,
  InvestigationRecord,
} from '../../../../common/investigations/types';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import { useItems } from '../../hooks';

export interface TeamThread {
  message: CommentItem;
  replies: CommentItem[];
}

export interface TeamDiscussionData {
  threads: TeamThread[];
  /** Messages and replies together. */
  messageCount: number;
  total: number;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

const isComment = (item: { kind: string }): item is CommentItem => item.kind === 'comment';

const getParentId = (comment: CommentItem): string | null => comment.comment.parent_id ?? null;

/** Record-level comments grouped into threads: replies sit under their parent message. */
export const useTeamDiscussion = (record: InvestigationRecord): TeamDiscussionData => {
  const request: FindItemsRequest = {
    kind: ['comment'],
    target_id: record.id,
    per_page: INVESTIGATION_LIMITS.maxPerPage,
    sort_field: 'created_at',
    sort_order: 'asc',
  };
  const { data, isLoading, error, refetch } = useItems(record.id, request);

  const threads = useMemo(() => {
    const comments = (data?.items ?? []).filter(isComment);
    const repliesByParent = new Map<string, CommentItem[]>();
    comments.forEach((comment) => {
      const parentId = getParentId(comment);
      if (parentId) {
        repliesByParent.set(parentId, [...(repliesByParent.get(parentId) ?? []), comment]);
      }
    });
    const ids = new Set(comments.map(({ id }) => id));
    return comments
      .filter((comment) => {
        const parentId = getParentId(comment);
        // A reply whose parent is not in the loaded page is shown as a message of its own.
        return !parentId || !ids.has(parentId);
      })
      .map((message) => ({ message, replies: repliesByParent.get(message.id) ?? [] }));
  }, [data]);

  return {
    threads,
    messageCount: threads.reduce((sum, { replies }) => sum + 1 + replies.length, 0),
    total: data?.total ?? 0,
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
