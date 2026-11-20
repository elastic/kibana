/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KpiMetricConfiguration } from '../../../common/types/domain';
import type { KpiMetricResult } from '../../../common/types/api';
import { useCasesConfig } from '../../common/lib/kibana';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import { useGetKpiMetrics } from '../../containers/use_get_kpi_metrics';

interface UseCasesListKpiMetricsResult {
  kpiMetrics?: KpiMetricConfiguration[];
  kpiResults?: KpiMetricResult[];
  isLoadingKpiResults: boolean;
  isAnalyticsEnabled: boolean;
}

/**
 * Reads the case list metrics from the configuration and fetches the values of the custom metrics.
 */
export const useCasesListKpiMetrics = ({
  from,
  to,
  enabled,
}: {
  from?: string;
  to?: string;
  enabled: boolean;
}): UseCasesListKpiMetricsResult => {
  const { analyticsV2Enabled } = useCasesConfig();
  const { data: configuration } = useGetCaseConfiguration();
  const kpiMetrics = configuration?.metrics?.casesList;
  const hasAnalyticsMetrics = kpiMetrics?.some(({ kind }) => kind === 'custom') ?? false;
  const { data, isFetching } = useGetKpiMetrics({
    from,
    to,
    enabled: hasAnalyticsMetrics && enabled,
  });

  return {
    kpiMetrics,
    kpiResults: data?.metrics,
    isLoadingKpiResults: isFetching,
    isAnalyticsEnabled: analyticsV2Enabled && data?.enabled !== false,
  };
};
