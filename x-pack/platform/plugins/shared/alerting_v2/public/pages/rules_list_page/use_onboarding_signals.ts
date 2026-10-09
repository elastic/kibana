/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { PluginStart } from '@kbn/core-di';
import { CoreStart, useService } from '@kbn/core-di-browser';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';

export interface OnboardingSignals {
  hasData: boolean;
  hasClassicRules: boolean;
  classicRulesCount: number;
  isLoading: boolean;
}

/**
 * Lightweight signals for Universal Alerting onboarding personalization.
 * Data proxy: any non-empty data view list. Classic rules: public find total.
 */
export const useOnboardingSignals = (): OnboardingSignals => {
  const http = useService(CoreStart('http'));
  const dataViews = useService(PluginStart('dataViews')) as DataViewsPublicPluginStart;

  const dataQuery = useQuery({
    queryKey: ['alertingV2', 'onboarding', 'hasDataViews'],
    queryFn: async () => {
      const ids = await dataViews.getIdsWithTitle();
      return ids.length > 0;
    },
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const classicRulesQuery = useQuery({
    queryKey: ['alertingV2', 'onboarding', 'classicRulesCount'],
    queryFn: async () => {
      const response = await http.get<{ total: number }>('/api/alerting/rules/_find', {
        query: { page: 1, per_page: 1 },
      });
      return response.total ?? 0;
    },
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const classicRulesCount = classicRulesQuery.data ?? 0;

  return {
    hasData: dataQuery.data === true,
    hasClassicRules: classicRulesCount > 0,
    classicRulesCount,
    isLoading: dataQuery.isLoading || classicRulesQuery.isLoading,
  };
};
