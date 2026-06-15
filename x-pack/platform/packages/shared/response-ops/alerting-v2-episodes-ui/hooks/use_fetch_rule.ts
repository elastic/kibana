/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { HttpStart } from '@kbn/core-http-browser';
import { buildPath } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import { isRuleNotFoundError } from '../utils/is_rule_not_found_error';
import { FETCH_RULE_ERROR } from '../components/translations';
import { queryKeys } from '../query_keys';

export interface UseFetchRuleOptions {
  id: string | undefined;
  http: HttpStart;
  notifications?: NotificationsStart;
}

export const useFetchRule = ({ id, http, notifications }: UseFetchRuleOptions) => {
  const query = useQuery({
    queryKey: queryKeys.fetchRule(id ?? ''),
    queryFn: ({ signal }) =>
      http.get<RuleResponse>(buildPath(`${ALERTING_V2_RULE_API_PATH}/{id}`, { id }), { signal }),
    enabled: Boolean(id),
    retry: false,
    refetchOnWindowFocus: false,
    // Rule definitions change rarely and are not invalidated by episode actions;
    // 5 minutes prevents unnecessary refetches when flyout panes remount.
    staleTime: 5 * 60_000,
    onError: (error: unknown) => {
      if (isRuleNotFoundError(error)) {
        return;
      }
      notifications?.toasts.addDanger(FETCH_RULE_ERROR);
    },
  });

  const isRuleNotFound = query.isError && isRuleNotFoundError(query.error);
  const isRuleError = query.isError && !isRuleNotFoundError(query.error);

  return {
    ...query,
    rule: query.data,
    isRuleLoading: Boolean(id) && query.isLoading,
    isRuleNotFound,
    isRuleError,
  };
};
