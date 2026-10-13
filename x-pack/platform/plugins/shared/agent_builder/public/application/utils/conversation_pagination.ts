/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_RESULT_WINDOW } from '../../../common/constants';
import type {
  ListConversationsResponse,
  ListConversationsResponseItem,
} from '../../../common/http_api/conversations';

/**
 * Deduplicates an array of conversations by id, keeping the first occurrence.
 * Offset pagination can return a duplicate if a document's sort position shifts
 * between two page fetches; keeping the lower-page copy is the safe tie-break.
 */
export const dedupeById = (
  conversations: ListConversationsResponseItem[]
): ListConversationsResponseItem[] => {
  const seen = new Set<string>();
  return conversations.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
};

/**
 * Shared `getNextPageParam` for any conversation list/search infinite query: no more pages
 * once every result has been fetched, or once the next offset would exceed the ES window
 * that offset pagination can reach.
 */
export const getNextConversationPageParam = (
  lastPage: ListConversationsResponse
): number | undefined => {
  const { page, per_page: pp, total } = lastPage.pagination;
  const next = page + 1;
  return page * pp < total && next * pp <= MAX_RESULT_WINDOW ? next : undefined;
};
