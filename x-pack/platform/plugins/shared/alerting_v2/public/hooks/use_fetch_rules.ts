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

/**
 * No `staleTime` is set here on purpose: `useQueryClient()`'s context
 * resolution means rule mutation hooks (e.g. `useBulkEnableRules`) can end
 * up invalidating a different `QueryClient` instance than the one this hook
 * reads from — e.g. when the mutation is triggered from a component nested
 * under the rules list's `ContentListProvider`, which nests its own
 * `QueryClient` (see `invalidate_rules_content_list.ts`). Relying on the
 * default `staleTime: 0` (always refetch on mount) papers over that gap. If
 * you add a `staleTime` here, first make invalidation reach this hook's
 * cache reliably regardless of where the mutation was triggered from.
 */
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
    queryFn: () => rulesApi.listRules({ page, perPage, filter, search, sortField, sortOrder }),
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
