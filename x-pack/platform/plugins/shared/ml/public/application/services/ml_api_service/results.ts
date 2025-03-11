/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Service for obtaining data for the ML Results dashboards.

import { useMemo } from 'react';
import type { ESSearchRequest, ESSearchResponse } from '@kbn/es-types';
import type { MlEntityField, ML_JOB_ID, ML_PARTITION_FIELD_VALUE } from '@kbn/ml-anomaly-utils';
import { type InfluencersFilterQuery, type MlAnomalyRecordDoc } from '@kbn/ml-anomaly-utils';

import { ML_INTERNAL_BASE_PATH } from '../../../../common/constants/app';
import type {
  GetStoppedPartitionResult,
  GetDatafeedResultsChartDataResult,
} from '../../../../common/types/results';
import type { JobId } from '../../../../common/types/anomaly_detection_jobs';
import type { PartitionFieldsConfig } from '../../../../common/types/storage';
import type { ExplorerChartsData } from '../../../../common/types/results';

import { useMlKibana } from '../../contexts/kibana';
import type { HttpService } from '../http_service';
import type { CriteriaField } from '../results_service';
import type { PartitionFieldsDefinition } from '../results_service/result_service_rx';

export interface CategoryDefinition {
  categoryId: number;
  terms: string;
  regex: string;
  examples: string[];
}

export const resultsApiProvider = (httpService: HttpService) => ({
  getAnomaliesTableData(
    jobIds: string[],
    criteriaFields: string[],
    influencers: MlEntityField[],
    aggregationInterval: string,
    threshold: number,
    earliestMs: number,
    latestMs: number,
    dateFormatTz: string,
    maxRecords: number,
    maxExamples?: number,
    influencersFilterQuery?: any,
    functionDescription?: string
  ) {
    const body = JSON.stringify({
      jobIds,
      criteriaFields,
      influencers,
      aggregationInterval,
      threshold,
      earliestMs,
      latestMs,
      dateFormatTz,
      maxRecords,
      maxExamples,
      influencersFilterQuery,
      functionDescription,
    });

    return httpService.http$<any>({
      path: `${ML_INTERNAL_BASE_PATH}/results/anomalies_table_data`,
      method: 'POST',
      body,
      version: '1',
    });
  },

  getMaxAnomalyScore(jobIds: string[], earliestMs: number, latestMs: number) {
    const body = JSON.stringify({
      jobIds,
      earliestMs,
      latestMs,
    });
    return httpService.http<any>({
      path: `${ML_INTERNAL_BASE_PATH}/results/max_anomaly_score`,
      method: 'POST',
      body,
      version: '1',
    });
  },

  getCategoryDefinition(jobId: string, categoryId: string) {
    const body = JSON.stringify({ jobId, categoryId });
    return httpService.http<CategoryDefinition>({
      path: `${ML_INTERNAL_BASE_PATH}/results/category_definition`,
      method: 'POST',
      body,
      version: '1',
    });
  },

  getCategoryExamples(jobId: string, categoryIds: string[], maxExamples: number) {
    const body = JSON.stringify({
      jobId,
      categoryIds,
      maxExamples,
    });
    return httpService.http<any>({
      path: `${ML_INTERNAL_BASE_PATH}/results/category_examples`,
      method: 'POST',
      body,
      version: '1',
    });
  },

  fetchPartitionFieldsValues(
    jobId: JobId,
    searchTerm: Record<string, string>,
    criteriaFields: Array<{ fieldName: string; fieldValue: any }>,
    earliestMs: number,
    latestMs: number,
    fieldsConfig?: PartitionFieldsConfig
  ) {
    const body = JSON.stringify({
      jobId,
      searchTerm,
      criteriaFields,
      earliestMs,
      latestMs,
      fieldsConfig,
    });
    return httpService.http$<PartitionFieldsDefinition>({
      path: `${ML_INTERNAL_BASE_PATH}/results/partition_fields_values`,
      method: 'POST',
      body,
      version: '1',
    });
  },

  anomalySearch(query: ESSearchRequest, jobIds: string[]) {
    const body = JSON.stringify({ query, jobIds });
    return httpService.http<ESSearchResponse<MlAnomalyRecordDoc>>({
      path: `${ML_INTERNAL_BASE_PATH}/results/anomaly_search`,
      method: 'POST',
      body,
      version: '1',
    });
  },

  anomalySearch$(query: ESSearchRequest, jobIds: string[]) {
    const body = JSON.stringify({ query, jobIds });
    return httpService.http$<ESSearchResponse<MlAnomalyRecordDoc>>({
      path: `${ML_INTERNAL_BASE_PATH}/results/anomaly_search`,
      method: 'POST',
      body,
      version: '1',
    });
  },

  getCategoryStoppedPartitions(
    jobIds: string[],
    fieldToBucket?: typeof ML_JOB_ID | typeof ML_PARTITION_FIELD_VALUE
  ) {
    const body = JSON.stringify({
      jobIds,
      fieldToBucket,
    });
    return httpService.http<GetStoppedPartitionResult>({
      path: `${ML_INTERNAL_BASE_PATH}/results/category_stopped_partitions`,
      method: 'POST',
      body,
      version: '1',
    });
  },

  getDatafeedResultChartData(jobId: string, start: number, end: number) {
    const body = JSON.stringify({
      jobId,
      start,
      end,
    });
    return httpService.http<GetDatafeedResultsChartDataResult>({
      path: `${ML_INTERNAL_BASE_PATH}/results/datafeed_results_chart`,
      method: 'POST',
      body,
      version: '1',
    });
  },

  getAnomalyCharts$(
    jobIds: string[],
    influencers: MlEntityField[],
    threshold: number,
    earliestMs: number,
    latestMs: number,
    timeBounds: { min?: number; max?: number },
    maxResults: number,
    numberOfPoints: number,
    influencersFilterQuery?: InfluencersFilterQuery
  ) {
    const body = JSON.stringify({
      jobIds,
      influencers,
      threshold,
      earliestMs,
      latestMs,
      maxResults,
      influencersFilterQuery,
      numberOfPoints,
      timeBounds,
    });
    return httpService.http$<ExplorerChartsData>({
      path: `${ML_INTERNAL_BASE_PATH}/results/anomaly_charts`,
      method: 'POST',
      body,
      version: '1',
    });
  },

  getAnomalyRecords$(
    jobIds: string[],
    criteriaFields: CriteriaField[],
    severity: number,
    earliestMs: number | null,
    latestMs: number | null,
    interval: string,
    functionDescription?: string
  ) {
    const body = JSON.stringify({
      jobIds,
      criteriaFields,
      threshold: severity,
      earliestMs,
      latestMs,
      interval,
      functionDescription,
    });
    return httpService.http$<{ success: boolean; records: MlAnomalyRecordDoc[] }>({
      path: `${ML_INTERNAL_BASE_PATH}/results/anomaly_records`,
      method: 'POST',
      body,
      version: '1',
    });
  },
});

export type ResultsApiService = ReturnType<typeof resultsApiProvider>;

/**
 * Hooks for accessing {@link ResultsApiService} in React components.
 */
export function useResultsApiService(): ResultsApiService {
  const {
    services: {
      mlServices: { httpService },
    },
  } = useMlKibana();
  return useMemo(() => resultsApiProvider(httpService), [httpService]);
}
