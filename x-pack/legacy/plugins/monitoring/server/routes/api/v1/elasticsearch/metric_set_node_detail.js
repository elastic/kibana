/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const metricSets = {
  advanced: [
    {
      keys: ['node_jvm_mem_max_in_bytes', 'node_jvm_mem_used_in_bytes'],
      name: 'node_jvm_mem',
    },
    {
      keys: ['node_jvm_gc_old_count', 'node_jvm_gc_young_count'],
      name: 'node_gc',
    },
    {
      keys: ['node_jvm_gc_old_time', 'node_jvm_gc_young_time'],
      name: 'node_gc_time',
    },
    {
      keys: [
        'node_index_mem_overall_1',
        'node_index_mem_stored_fields',
        'node_index_mem_doc_values',
        'node_index_mem_norms',
      ],
      name: 'node_index_1',
    },
    {
      keys: ['node_index_mem_overall_2', 'node_index_mem_terms', 'node_index_mem_points'],
      name: 'node_index_2',
    },
    {
      keys: [
        'node_index_mem_overall_3',
        'node_index_mem_fixed_bit_set',
        'node_index_mem_term_vectors',
        'node_index_mem_versions',
      ],
      name: 'node_index_3',
    },
    {
      keys: [
        'node_index_mem_query_cache',
        'node_index_mem_request_cache',
        'node_index_mem_fielddata',
        'node_index_mem_writer',
      ],
      name: 'node_index_4',
    },
    {
      keys: ['node_search_total', 'node_index_total'],
      name: 'node_request_total',
    },
    {
      keys: ['node_index_time', 'node_throttle_index_time'],
      name: 'node_index_time',
    },
    {
      keys: ['node_index_threads_write_queue', 'node_index_threads_write_rejected'],
      name: 'node_index_threads',
    },
    {
      keys: [
        'node_index_threads_search_queue',
        'node_index_threads_search_rejected',
        'node_index_threads_get_queue',
        'node_index_threads_get_rejected',
      ],
      name: 'node_read_threads',
    },
    {
      keys: ['node_cpu_utilization', 'node_cgroup_quota'],
      name: 'node_cpu_utilization',
    },
    {
      keys: ['node_cgroup_usage', 'node_cgroup_throttled'],
      name: 'node_cgroup_cpu',
    },
    {
      keys: ['node_cgroup_periods', 'node_cgroup_throttled_count'],
      name: 'node_cgroup_stats',
    },
    {
      keys: ['node_query_latency', 'node_index_latency'],
      name: 'node_latency',
    },
  ],
  overview: [
    {
      keys: ['node_total_cumul_io', 'node_total_read_io', 'node_total_write_io'],
      name: 'node_total_io',
    },
    {
      keys: ['node_query_latency', 'node_index_latency'],
      name: 'node_latency',
    },
    {
      keys: ['node_jvm_mem_max_in_bytes', 'node_jvm_mem_used_in_bytes'],
      name: 'node_jvm_mem',
    },
    {
      keys: ['node_index_mem_overall', 'node_index_mem_terms', 'node_index_mem_points'],
      name: 'node_mem',
    },
    {
      keys: [],
      name: 'node_cpu_metric',
    },
    'node_load_average',
    'node_segment_count',
  ],
};
