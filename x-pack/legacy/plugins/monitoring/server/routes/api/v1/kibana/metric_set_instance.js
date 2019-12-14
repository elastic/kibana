/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const metricSet = [
  {
    keys: ['kibana_os_load_1m', 'kibana_os_load_5m', 'kibana_os_load_15m'],
    name: 'kibana_os_load',
  },
  'kibana_average_concurrent_connections',
  'kibana_process_delay',
  {
    keys: ['kibana_memory_heap_size_limit', 'kibana_memory_size'],
    name: 'kibana_memory',
  },
  {
    keys: ['kibana_max_response_times', 'kibana_average_response_times'],
    name: 'kibana_response_times',
  },
  'kibana_requests',
];
