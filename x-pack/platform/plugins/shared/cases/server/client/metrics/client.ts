/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CasesStatusRequest,
  CasesStatusResponse,
  SingleCaseMetricsResponse,
  CasesMetricsRequest,
  CasesMetricsResponse,
  KpiMetricsRequest,
  KpiMetricsResponse,
  KpiMetricPreviewRequest,
  KpiMetricPreviewResponse,
} from '../../../common/types/api';
import type { CasesClient } from '../client';

import type { CasesClientArgs } from '../types';
import { getStatusTotalsByType } from './get_status_totals';
import { getCaseMetrics } from './get_case_metrics';
import { getCasesMetrics } from './get_cases_metrics';
import { getKpiMetrics } from './get_kpi_metrics';
import { previewKpiMetric } from './preview_kpi_metric';
import type { GetCaseMetricsParams } from './types';

/**
 * API for interacting with the metrics.
 */
export interface MetricsSubClient {
  getCaseMetrics(params: GetCaseMetricsParams): Promise<SingleCaseMetricsResponse>;
  getCasesMetrics(params: CasesMetricsRequest): Promise<CasesMetricsResponse>;
  /**
   * Retrieves the total number of open, closed, and in-progress cases.
   */
  getStatusTotalsByType(params: CasesStatusRequest): Promise<CasesStatusResponse>;
  /**
   * Retrieves the values of the case list KPI metrics that read the analytics indices.
   */
  getKpiMetrics(params: KpiMetricsRequest): Promise<KpiMetricsResponse>;
  /**
   * Retrieves the value of one unsaved custom KPI metric.
   */
  previewKpiMetric(params: KpiMetricPreviewRequest): Promise<KpiMetricPreviewResponse>;
}

/**
 * Creates the interface for retrieving metrics for cases.
 *
 * @ignore
 */
export const createMetricsSubClient = (
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): MetricsSubClient => {
  const casesSubClient: MetricsSubClient = {
    getCaseMetrics: (params: GetCaseMetricsParams) =>
      getCaseMetrics(params, casesClient, clientArgs),
    getCasesMetrics: (params: CasesMetricsRequest) =>
      getCasesMetrics(params, casesClient, clientArgs),
    getStatusTotalsByType: (params: CasesStatusRequest) =>
      getStatusTotalsByType(params, clientArgs),
    getKpiMetrics: (params: KpiMetricsRequest) => getKpiMetrics(params, clientArgs),
    previewKpiMetric: (params: KpiMetricPreviewRequest) => previewKpiMetric(params, clientArgs),
  };

  return Object.freeze(casesSubClient);
};
