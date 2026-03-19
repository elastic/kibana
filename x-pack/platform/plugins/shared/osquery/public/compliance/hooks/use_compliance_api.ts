/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useMutation, useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type {
  ComplianceRuleMetadata,
  ComplianceBenchmarkInfo,
  ComplianceDashboardStats,
  ComplianceFinding,
} from '../../../common/compliance';

const API_BASE = '/api/endpoint_compliance';
const QUERY_KEY = 'endpointCompliance';

const useFetch = <T>(path: string, params?: Record<string, unknown>, enabled = true) => {
  const { http } = useKibana().services;

  return useQuery<T>({
    queryKey: [QUERY_KEY, path, params],
    queryFn: () => http!.get<T>(path, { query: params as Record<string, string>, version: '1' }),
    enabled,
  });
};

export const useBenchmarks = () =>
  useFetch<{ benchmarks: ComplianceBenchmarkInfo[] }>(`${API_BASE}/benchmarks`);

export const useComplianceRules = (params?: Record<string, unknown>) =>
  useFetch<{
    total: number;
    page: number;
    per_page: number;
    rules: Array<ComplianceRuleMetadata & { id: string }>;
  }>(`${API_BASE}/rules/_find`, params);

export const useComplianceRule = (id: string) =>
  useFetch<ComplianceRuleMetadata & { id: string }>(`${API_BASE}/rules/${id}`, undefined, !!id);

export const useDashboardStats = (benchmarkId: string, timeRange?: string) =>
  useFetch<ComplianceDashboardStats & { trend: Array<{ timestamp: string; score: number }> }>(
    `${API_BASE}/stats/${benchmarkId}`,
    timeRange ? { time_range: timeRange } : undefined,
    !!benchmarkId
  );

export const useComplianceFindings = (params?: Record<string, unknown>) =>
  useFetch<{ total: number; findings: Array<ComplianceFinding & { id: string }> }>(
    `${API_BASE}/findings`,
    params
  );

export const useBulkAction = () => {
  const { http } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ action, ruleIds }: { action: string; ruleIds: string[] }) =>
      http!.post(`${API_BASE}/rules/_bulk_action`, {
        body: JSON.stringify({ action, rule_ids: ruleIds }),
        version: '1',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
};
