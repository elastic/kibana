/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

/**
 * Returns a single-metric AD job config for the farequote dataset.
 * Source: FTR x-pack/platform/test/api_integration/services/ml/common_config.ts (FQ_SM_JOB_CONFIG)
 */
export const getADFqSingleMetricJobConfig = (jobId: string): Partial<estypes.MlJob> => ({
  job_id: jobId,
  description: 'mean(responsetime) on farequote dataset with 15m bucket span',
  groups: ['farequote', 'automated', 'single-metric'],
  analysis_config: {
    bucket_span: '15m',
    influencers: [],
    detectors: [{ function: 'mean', field_name: 'responsetime' }],
  },
  data_description: { time_field: '@timestamp' },
  analysis_limits: { model_memory_limit: '10mb' },
  model_plot_config: { enabled: true },
});

/**
 * Returns a multi-metric AD job config for the farequote dataset.
 * Source: FTR x-pack/platform/test/api_integration/services/ml/common_config.ts (FQ_MM_JOB_CONFIG)
 */
export const getADFqMultiMetricJobConfig = (jobId: string): Partial<estypes.MlJob> => ({
  job_id: jobId,
  description:
    'mean/min/max(responsetime) partition=airline on farequote dataset with 1h bucket span',
  groups: ['farequote', 'automated', 'multi-metric'],
  analysis_config: {
    bucket_span: '1h',
    influencers: ['airline'],
    detectors: [
      { function: 'mean', field_name: 'responsetime', partition_field_name: 'airline' },
      { function: 'min', field_name: 'responsetime', partition_field_name: 'airline' },
      { function: 'max', field_name: 'responsetime', partition_field_name: 'airline' },
    ],
  },
  data_description: { time_field: '@timestamp' },
  analysis_limits: { model_memory_limit: '20mb' },
  model_plot_config: { enabled: true },
});

/**
 * Returns a datafeed config targeting the ft_farequote index for the given AD job.
 * Source: FTR x-pack/platform/test/api_integration/services/ml/common_config.ts (FQ_DATAFEED_CONFIG)
 */
export const getADFqDatafeedConfig = (jobId: string): Partial<estypes.MlDatafeed> => ({
  datafeed_id: `datafeed-${jobId}`,
  job_id: jobId,
  indices: ['ft_farequote'],
  query: { bool: { must: [{ match_all: {} }] } },
});
