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
  IncidentTimelineAlertsResponse,
} from '../../../common/types/api';
import type { CasesClient } from '../client';

import type { CasesClientArgs } from '../types';
import { getStatusTotalsByType } from './get_status_totals';
import { getCaseMetrics } from './get_case_metrics';
import { getCasesMetrics } from './get_cases_metrics';
import { getIncidentTimelineAlerts } from './get_incident_timeline_alerts';
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
   * Retrieves the attached alert documents of a case for the incident timeline.
   */
  getIncidentTimelineAlerts(params: { caseId: string }): Promise<IncidentTimelineAlertsResponse>;
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
    getIncidentTimelineAlerts: (params: { caseId: string }) =>
      getIncidentTimelineAlerts(params, casesClient, clientArgs),
  };

  return Object.freeze(casesSubClient);
};
