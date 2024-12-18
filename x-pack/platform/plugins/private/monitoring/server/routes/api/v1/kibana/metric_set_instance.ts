/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricDescriptor } from '../../../../lib/details/get_metrics';

export const metricSet: MetricDescriptor[] = [
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
  {
    keys: ['kibana_requests_total', 'kibana_requests_disconnects'],
    name: 'kibana_requests',
  },
  'kibana_instance_rule_failures',
  'kibana_instance_rule_executions',
  'kibana_instance_action_failures',
  'kibana_instance_action_executions',
];
