/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQueries } from '@kbn/react-query';
import { useService } from '@kbn/core-di-browser';
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../common/saved_object_types';
import { RulesApi } from '../services/rules_api';

const INSTALLED_COUNT_STALE_TIME = 30_000;

export const installedCountKeys = {
  all: ['installedRuleCount'] as const,
  template: (templateId: string) => [...installedCountKeys.all, templateId] as const,
};

export const useInstalledRuleCounts = (
  templateIds: string[]
): { counts: Map<string, number>; isLoading: boolean } => {
  const rulesApi = useService(RulesApi);

  const queries = useQueries({
    queries: templateIds.map((templateId) => ({
      queryKey: installedCountKeys.template(templateId),
      queryFn: async () => {
        const response = await rulesApi.listRules({
          per_page: 1,
          has_reference_type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
          has_reference_id: templateId,
        });
        return { templateId, total: response.total };
      },
      staleTime: INSTALLED_COUNT_STALE_TIME,
    })),
  });

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const query of queries) {
      if (query.data) {
        map.set(query.data.templateId, query.data.total);
      }
    }
    return map;
  }, [queries]);

  const isLoading = queries.some((q) => q.isLoading);

  return { counts, isLoading };
};
