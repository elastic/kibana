/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const metricSets = {
  advanced: [
    {
      keys: ['logstash_node_cpu_utilization', 'logstash_node_cgroup_quota'],
      name: 'logstash_node_cpu_utilization',
    },
    {
      keys: ['logstash_node_cgroup_usage', 'logstash_node_cgroup_throttled'],
      name: 'logstash_node_cgroup_cpu',
    },
    {
      keys: ['logstash_node_cgroup_periods', 'logstash_node_cgroup_throttled_count'],
      name: 'logstash_node_cgroup_stats',
    },
    'logstash_queue_events_count',
    {
      name: 'logstash_pipeline_queue_size',
      keys: ['logstash_pipeline_queue_size', 'logstash_pipeline_max_queue_size'],
    },
  ],
  overview: [
    {
      keys: ['logstash_os_load_1m', 'logstash_os_load_5m', 'logstash_os_load_15m'],
      name: 'logstash_os_load',
    },
    'logstash_events_input_rate',
    'logstash_events_output_rate',
    'logstash_events_latency',
    {
      keys: [],
      name: 'logstash_node_cpu_metric',
    },
    {
      keys: ['logstash_node_jvm_mem_max_in_bytes', 'logstash_node_jvm_mem_used_in_bytes'],
      name: 'logstash_jvm_usage',
    },
  ],
};
