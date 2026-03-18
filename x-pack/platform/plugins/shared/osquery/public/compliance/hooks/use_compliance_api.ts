/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';

const API_BASE = '/api/endpoint_compliance';

const useFetch = <T>(path: string, params?: Record<string, unknown>) => {
  const { http } = useKibana().services;

  return useQuery<T>({
    queryKey: ['endpointCompliance', path, params],
    queryFn: async () => {
      const response = await http!.get<T>(path, { query: params as Record<string, string> });

      return response;
    },
  });
};

export const useBenchmarks = () => useFetch<{ benchmarks: any[] }>(`${API_BASE}/benchmarks`);

export const useComplianceRules = (params?: Record<string, unknown>) =>
  useFetch<{ total: number; rules: any[] }>(`${API_BASE}/rules/_find`, params);

export const useComplianceRule = (id: string) => useFetch<any>(`${API_BASE}/rules/${id}`);

export const useDashboardStats = (benchmarkId: string, timeRange?: string) =>
  useFetch<any>(
    `${API_BASE}/stats/${benchmarkId}`,
    timeRange ? { time_range: timeRange } : undefined
  );

export const useComplianceFindings = (params?: Record<string, unknown>) =>
  useFetch<{ total: number; findings: any[] }>(`${API_BASE}/findings`, params);

export const useBulkAction = () => {
  const { http } = useKibana().services;

  return async (action: string, ruleIds: string[]) => {
    const response = await http!.post(`${API_BASE}/rules/_bulk_action`, {
      body: JSON.stringify({ action, rule_ids: ruleIds }),
    });

    return response;
  };
};
