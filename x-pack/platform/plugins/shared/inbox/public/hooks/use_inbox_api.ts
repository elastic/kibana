/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS, INBOX_ACTIONS_URL, type ListInboxActionsResponse } from '@kbn/inbox-common';
import { queryKeys, type InboxActionsListFilters } from '../query_keys';

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
    retry: (_failureCount, error) => {
      if (isHttpFetchError(error)) {
        return !error.response?.status || error.response.status >= 500;
      }
      return true;
    },
  });
};
