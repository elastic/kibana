/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useCasesToast } from '../common/use_cases_toast';
import { useCasesConfig } from '../common/lib/kibana';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import type { ServerError } from '../types';
import { getKpiMetrics } from './api';
import type { KpiMetricsCaseFiltersBody } from './utils';
import { casesQueriesKeys } from './constants';
import * as i18n from './translations';

interface UseGetKpiMetricsParams {
  from?: string;
  to?: string;
  /**
   * The case list filters. The metrics count only the documents of the matching cases.
   */
  filters?: KpiMetricsCaseFiltersBody;
  /**
   * False when the saved list has no metric that reads the analytics indices.
   */
  enabled: boolean;
}

/**
 * Fetches the values of the case list metrics that read the analytics indices.
 */
export const useGetKpiMetrics = ({ from, to, filters, enabled }: UseGetKpiMetricsParams) => {
  const { showErrorToast } = useCasesToast();
  const { owner } = useCasesContext();
  const { analyticsV2Enabled } = useCasesConfig();
  const [firstOwner] = owner;

  return useQuery(
    casesQueriesKeys.kpiMetrics({ owner: firstOwner, from, to, filters }),
    ({ signal }) => getKpiMetrics({ owner: firstOwner, from, to, filters, signal }),
    {
      enabled: enabled && analyticsV2Enabled && firstOwner != null,
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.KPI_METRICS_ERROR_TITLE });
      },
      keepPreviousData: true,
    }
  );
};
