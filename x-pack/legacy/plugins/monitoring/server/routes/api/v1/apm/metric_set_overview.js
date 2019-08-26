/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const metricSet = [
  {
    name: 'apm_cpu',
    keys: ['apm_cpu_total'],
  },
  {
    keys: ['apm_system_os_load_1', 'apm_system_os_load_5', 'apm_system_os_load_15'],
    name: 'apm_os_load',
  },
  {
    keys: ['apm_mem_alloc', 'apm_mem_rss', 'apm_mem_gc_next'],
    name: 'apm_memory',
  },
  {
    keys: ['apm_output_events_total', 'apm_output_events_active', 'apm_output_events_acked'],
    name: 'apm_output_events_rate_success',
  },
  {
    keys: ['apm_output_events_failed', 'apm_output_events_dropped'],
    name: 'apm_output_events_rate_failure',
  },
  {
    keys: [
      'apm_server_responses_count',
      'apm_server_responses_valid_ok',
      'apm_server_responses_valid_accepted',
      'apm_server_responses_errors_count',
    ],
    name: 'apm_server_responses_valid'
  },
  {
    keys: [
      'apm_acm_responses_count',
      'apm_acm_responses_valid_notmodified',
      'apm_acm_responses_valid_ok',
      'apm_acm_responses_errors_count'
    ],
    name: 'apm_acm_responses_valid'
  },
  {
    keys: [
      // 'apm_responses_count',
      'apm_server_responses_errors_toolarge',
      'apm_server_responses_errors_validate',
      'apm_server_responses_errors_method',
      'apm_server_responses_errors_unauthorized',
      'apm_server_responses_errors_ratelimit',
      'apm_server_responses_errors_queue',
      'apm_server_responses_errors_decode',
      'apm_server_responses_errors_forbidden',
      'apm_server_responses_errors_concurrency',
      'apm_server_responses_errors_closed',
      'apm_server_responses_errors_internal',
    ],
    name: 'apm_server_responses_errors'
  },
  {
    keys: [
      'apm_acm_responses_errors_forbidden',
      'apm_acm_responses_errors_unauthorized',
      'apm_acm_responses_errors_unavailable',
      'apm_acm_responses_errors_method',
      'apm_acm_responses_errors_invalid_query',
    ],
    name: 'apm_acm_responses_errors'
  },
  {
    keys: [
      'apm_server_requests'
    ],
    name: 'apm_server_requests'
  },
  {
    keys: [
      'apm_acm_requests'
    ],
    name: 'apm_acm_requests'
  },
  {
    keys: [
      'apm_processor_transaction_transformations',
      'apm_processor_span_transformations',
      'apm_processor_error_transformations',
      'apm_processor_metric_transformations',
    ],
    name: 'apm_transformations',
  },
];
