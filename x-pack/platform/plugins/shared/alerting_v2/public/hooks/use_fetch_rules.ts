/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useService, CoreStart } from '@kbn/core-di-browser';
import type { FindRulesSortField } from '@kbn/alerting-v2-schemas';
import { RulesApi } from '../services/rules_api';
import { ruleKeys } from './query_key_factory';

export const useFetchRules = ({
  page,
  perPage,
  filter,
  search,
  sortField,
  sortOrder,
}: {
  page: number;
  perPage: number;
  filter?: string;
  search?: string;
  sortField?: FindRulesSortField;
  sortOrder?: 'asc' | 'desc';
}) => {
  const rulesApi = useService(RulesApi);
  const { toasts } = useService(CoreStart('notifications'));

  return useQuery({
    queryKey: ruleKeys.list({ page, perPage, filter, search, sortField, sortOrder }),
    queryFn: () => rulesApi.listRules({ page, perPage, filter, search, sortField, sortOrder }),
    onError: () => {
      toasts.addDanger(
        i18n.translate('xpack.alertingV2.hooks.useFetchRules.errorMessage', {
          defaultMessage: 'Failed to load rules',
        })
      );
    },
    keepPreviousData: true,
    retry: false,
    refetchOnWindowFocus: false,
  });
};
