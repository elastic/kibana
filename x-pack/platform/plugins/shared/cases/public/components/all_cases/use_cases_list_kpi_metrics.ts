/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { omit } from 'lodash';
import { isAnalyticsPredefinedKpiMetric } from '../../../common/constants';
import type { KpiMetricConfiguration, KpiTilesDisplay } from '../../../common/types/domain';
import type { KpiMetricResult } from '../../../common/types/api';
import type { FilterOptions } from '../../../common/ui/types';
import { useCasesConfig } from '../../common/lib/kibana';
import { buildCasesSearchFilters, getCasesSearchOverrides } from '../../containers/utils';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import { useGetKpiMetrics } from '../../containers/use_get_kpi_metrics';

interface UseCasesListKpiMetricsResult {
  kpiMetrics?: KpiMetricConfiguration[];
  kpiTilesDisplay?: KpiTilesDisplay;
  kpiResults?: KpiMetricResult[];
  isLoadingKpiResults: boolean;
  isAnalyticsEnabled: boolean;
}

/**
 * Reads the case list metrics from the configuration and fetches the values of the custom metrics
 * for the same filters as the case list.
 */
export const useCasesListKpiMetrics = ({
  filterOptions,
  enabled,
}: {
  filterOptions: FilterOptions;
  enabled: boolean;
}): UseCasesListKpiMetricsResult => {
  const { analyticsV2Enabled } = useCasesConfig();
  const { data: configuration } = useGetCaseConfiguration();
  const kpiMetrics = configuration?.metrics?.casesList;
  const hasAnalyticsMetrics =
    kpiMetrics?.some(
      (metric) => metric.kind === 'custom' || isAnalyticsPredefinedKpiMetric(metric.predefinedId)
    ) ?? false;
  const filters = useMemo(
    () =>
      omit(
        buildCasesSearchFilters({ ...filterOptions, ...getCasesSearchOverrides(filterOptions) }),
        'owner'
      ),
    [filterOptions]
  );
  const { data, isFetching } = useGetKpiMetrics({
    from: filterOptions.from,
    to: filterOptions.to,
    filters,
    enabled: hasAnalyticsMetrics && enabled,
  });

  return {
    kpiMetrics,
    kpiTilesDisplay: configuration?.metrics?.casesListDisplay,
    kpiResults: data?.metrics,
    isLoadingKpiResults: isFetching,
    isAnalyticsEnabled: analyticsV2Enabled && data?.enabled !== false,
  };
};
