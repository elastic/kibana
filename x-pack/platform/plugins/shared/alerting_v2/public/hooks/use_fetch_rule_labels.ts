/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { RulesApi } from '../services/rules_api';
import { ruleKeys } from './query_key_factory';

export const useFetchRuleLabels = () => {
  const rulesApi = useService(RulesApi);
  const { toasts } = useService(CoreStart('notifications'));

  return useQuery({
    queryKey: [...ruleKeys.all, 'labels'] as const,
    queryFn: async () => {
      const labels = new Set<string>();
      let page = 1;
      const perPage = 1000;

      for (;;) {
        const res = await rulesApi.listRules({ page, perPage, search: undefined });
        for (const item of res.items) {
          item.metadata.labels?.forEach((l) => labels.add(l));
        }
        if (page * perPage >= res.total || res.items.length === 0) {
          break;
        }
        page += 1;
      }

      return Array.from(labels).sort((a, b) => a.localeCompare(b));
    },
    onError: () => {
      toasts.addDanger(
        i18n.translate('xpack.alertingV2.hooks.useFetchRuleLabels.errorMessage', {
          defaultMessage: 'Failed to load rule tags',
        })
      );
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
};
