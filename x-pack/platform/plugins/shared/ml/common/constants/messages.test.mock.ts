/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* To keep tests in sync, these mocks should be used in API intregation tests
 * as expected values to check against, and in the client side jest tests to be
 * the values used as function arguments for `parseMessages()` to retrieve the
 * messages populated with translations and documentation links.
 */

export const basicValidJobMessages = [
  {
    id: 'job_id_valid',
  },
  {
    id: 'detectors_function_not_empty',
  },
  {
    id: 'success_bucket_span',
    bucketSpan: '15m',
  },
  {
    id: 'success_time_range',
  },
  {
    id: 'success_mml',
  },
];

export const basicInvalidJobMessages = [
  {
    id: 'job_id_invalid',
  },
  {
    id: 'detectors_function_not_empty',
  },
  {
    id: 'bucket_span_valid',
    bucketSpan: '15m',
  },
  {
    id: 'skipped_extended_tests',
  },
];

export const nonBasicIssuesMessages = [
  {
    id: 'job_id_valid',
  },
  {
    id: 'detectors_function_not_empty',
  },
  {
    id: 'cardinality_model_plot_high',
  },
  {
    id: 'cardinality_partition_field',
    fieldName: 'order_id',
  },
  {
    id: 'bucket_span_high',
  },
  {
    bucketSpanCompareFactor: 25,
    id: 'time_range_short',
    minTimeSpanReadable: '2 hours',
  },
  {
    id: 'success_influencers',
  },
  {
    id: 'half_estimated_mml_greater_than_mml',
    mml: '1MB',
  },
  {
    id: 'missing_summary_count_field_name',
  },
  {
    id: 'datafeed_preview_failed',
  },
];
