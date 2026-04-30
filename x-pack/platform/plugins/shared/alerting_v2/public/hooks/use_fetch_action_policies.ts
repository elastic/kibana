/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import type { FindActionPoliciesResponse } from '../services/action_policies_api';
import { ActionPoliciesApi } from '../services/action_policies_api';
import { actionPolicyKeys } from './query_key_factory';

interface UseFetchActionPoliciesParams {
  page: number;
  perPage: number;
  search?: string;
  tags?: string[];
  enabled?: boolean;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export const useFetchActionPolicies = ({
  page,
  perPage,
  search,
  tags,
  enabled,
  sortField,
  sortOrder,
}: UseFetchActionPoliciesParams) => {
  const actionPoliciesApi = useService(ActionPoliciesApi);
  const { toasts } = useService(CoreStart('notifications'));

  return useQuery<FindActionPoliciesResponse, Error>({
    queryKey: actionPolicyKeys.list({
      page,
      perPage,
      search,
      tags,
      enabled,
      sortField,
      sortOrder,
    }),
    queryFn: () =>
      actionPoliciesApi.listActionPolicies({
        page,
        perPage,
        search,
        tags,
        enabled,
        sortField,
        sortOrder,
      }),
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    onError: (error: Error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.alertingV2.actionPolicies.fetchError', {
          defaultMessage: 'Failed to load action policies',
        }),
      });
    },
  });
};
