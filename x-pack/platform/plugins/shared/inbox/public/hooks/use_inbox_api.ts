/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  API_VERSIONS,
  INBOX_ACTIONS_HISTORY_URL,
  INBOX_ACTIONS_URL,
  type ListInboxActionsHistoryResponse,
  type ListInboxActionsResponse,
} from '@kbn/inbox-common';
import {
  queryKeys,
  type InboxActionsHistoryFilters,
  type InboxActionsListFilters,
} from '../query_keys';

const retryOnTransientError = (_failureCount: number, error: unknown): boolean => {
  if (isHttpFetchError(error)) {
    return !error.response?.status || error.response.status >= 500;
  }
  return true;
};

/**
 * Background poll cadence for both the pending and history listings.
 *
 * The HITL flow has two server-side write windows after a respond:
 *   1. `markStepAsResponded` (synchronous, `refresh: 'wait_for'`) —
 *      visible on the next list call after the mutation settles.
 *   2. The engine's resume task fires through Task Manager
 *      (~3s default cadence), which writes `finishedAt` + the response
 *      payload onto the step doc.
 *
 * The first transition is reconciled by the `onSettled` invalidate on
 * `useRespondToInboxAction`. The second is what this poll catches: the
 * "Processing…" badge in the history feed flips off once the engine
 * finalises the step. 5s is a comfortable upper bound on Task Manager
 * latency without being chatty for the common idle case. React Query's
 * `refetchIntervalInBackground: false` (the default) keeps us off the
 * server when the tab is hidden.
 */
const INBOX_BACKGROUND_REFETCH_MS = 5_000;

export const useInboxActions = (filters: InboxActionsListFilters = {}) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.actions.list(filters),
    queryFn: async (): Promise<ListInboxActionsResponse> => {
      const query: Record<string, string | number> = {};
      if (filters.status) query.status = filters.status;
      if (filters.sourceApp) query.source_app = filters.sourceApp;
      if (filters.page) query.page = filters.page;
      if (filters.perPage) query.per_page = filters.perPage;

      return services.http!.get<ListInboxActionsResponse>(INBOX_ACTIONS_URL, {
        query,
        version: API_VERSIONS.internal.v1,
      });
    },
    keepPreviousData: true,
    retry: retryOnTransientError,
    refetchInterval: INBOX_BACKGROUND_REFETCH_MS,
  });
};

export const useInboxActionsHistory = (filters: InboxActionsHistoryFilters = {}) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.history.list(filters),
    queryFn: async (): Promise<ListInboxActionsHistoryResponse> => {
      const query: Record<string, string | number> = {};
      if (filters.sourceApp) query.source_app = filters.sourceApp;
      if (filters.page) query.page = filters.page;
      if (filters.perPage) query.per_page = filters.perPage;

      return services.http!.get<ListInboxActionsHistoryResponse>(INBOX_ACTIONS_HISTORY_URL, {
        query,
        version: API_VERSIONS.internal.v1,
      });
    },
    keepPreviousData: true,
    retry: retryOnTransientError,
    refetchInterval: INBOX_BACKGROUND_REFETCH_MS,
  });
};
