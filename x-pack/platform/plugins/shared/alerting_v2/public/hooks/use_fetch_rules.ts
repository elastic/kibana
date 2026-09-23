/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useService, CoreStart } from '@kbn/core-di-browser';
import type { FindRulesRequest, FindRulesSortField } from '@kbn/alerting-v2-schemas';
import { RulesApi } from '../services/rules_api';
import { assertAllFieldsMapped, type Complete } from '../mapper_types';
import { ruleKeys } from './query_key_factory';

export interface FindRulesUiParams {
  page?: number;
  perPage?: number;
  filter?: string;
  search?: string;
  sortField?: FindRulesSortField;
  sortOrder?: 'asc' | 'desc';
}

export const toFindRulesRequest = ({
  page,
  perPage,
  filter,
  search,
  sortField,
  sortOrder,
  ...rest
}: FindRulesUiParams): Complete<FindRulesRequest> => {
  assertAllFieldsMapped(rest);
  return {
    page,
    per_page: perPage,
    filter,
    search,
    sort_field: sortField,
    sort_order: sortOrder,
  };
};

export const useFetchRules = ({
  page,
  perPage,
  filter,
  search,
  sortField,
  sortOrder,
  enabled = true,
}: {
  page: number;
  perPage: number;
  filter?: string;
  search?: string;
  sortField?: FindRulesSortField;
  sortOrder?: 'asc' | 'desc';
  enabled?: boolean;
}) => {
  const rulesApi = useService(RulesApi);
  const { toasts } = useService(CoreStart('notifications'));

  return useQuery({
    queryKey: ruleKeys.list({ page, perPage, filter, search, sortField, sortOrder }),
    queryFn: () =>
      rulesApi.listRules(
        toFindRulesRequest({ page, perPage, filter, search, sortField, sortOrder })
      ),
    onError: () => {
      toasts.addDanger(
        i18n.translate('xpack.alertingV2.hooks.useFetchRules.errorMessage', {
          defaultMessage: 'Failed to load rules',
        })
      );
    },
    enabled,
    keepPreviousData: true,
    retry: false,
    refetchOnWindowFocus: false,
  });
};
