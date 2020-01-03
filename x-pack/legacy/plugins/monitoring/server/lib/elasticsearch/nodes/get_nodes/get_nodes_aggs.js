/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function getNodesAggs() {
  const aggs = {
    latest: {
      top_hits: {
        size: 1,
        sort: [{ timestamp: { order: 'desc' } }],
      },
    },
    earliest: {
      top_hits: {
        size: 1,
        sort: [{ timestamp: { order: 'asc' } }],
      },
    },
    usage_max: {
      max: {
        field: 'node_stats.os.cgroup.cpuacct.usage_nanos',
      },
    },
    usage_min: {
      min: {
        field: 'node_stats.os.cgroup.cpuacct.usage_nanos',
      },
    },
    periods_max: {
      max: {
        field: 'node_stats.os.cgroup.cpu.stat.number_of_elapsed_periods',
      },
    },
    periods_min: {
      min: {
        field: 'node_stats.os.cgroup.cpu.stat.number_of_elapsed_periods',
      },
    },
    quota: {
      min: {
        field: 'node_stats.os.cgroup.cpu.cfs_quota_micros',
      },
    },
    throttled_max: {
      max: {
        field: 'node_stats.os.cgroup.cpu.stat.time_throttled_nanos',
      },
    },
    throttled_min: {
      min: {
        field: 'node_stats.os.cgroup.cpu.stat.time_throttled_nanos',
      },
    },
    node_cpu_utilization_max: {
      max: {
        field: 'node_stats.process.cpu.percent',
      },
    },
    node_cpu_utilization_min: {
      min: {
        field: 'node_stats.process.cpu.percent',
      },
    },
    node_load_average_max: {
      max: {
        field: 'node_stats.os.cpu.load_average.1m',
      },
    },
    node_load_average_min: {
      min: {
        field: 'node_stats.os.cpu.load_average.1m',
      },
    },
    node_jvm_mem_percent_max: {
      max: {
        field: 'node_stats.jvm.mem.heap_used_percent',
      },
    },
    node_jvm_mem_percent_min: {
      min: {
        field: 'node_stats.jvm.mem.heap_used_percent',
      },
    },
    node_free_space_max: {
      max: {
        field: 'node_stats.fs.total.available_in_bytes',
      },
    },
    node_free_space_min: {
      min: {
        field: 'node_stats.fs.total.available_in_bytes',
      },
    },
    node_cgroup_quota: {
      bucket_script: {
        buckets_path: {
          usage_min: 'usage_min',
          usage_max: 'usage_max',
          periods_min: 'periods_min',
          periods_max: 'periods_max',
          quota: 'quota',
        },
        script: `
          if (params.quota > -1) {
            def usage_rate = params.usage_max - params.usage_min;
            def periods_rate = params.periods_max - params.periods_min;
            def factor = usage_rate / (periods_rate * params.quota & 1000);
            return factor * 100;
          }
        `,
      },
    },
    node_cgroup_throttled: {
      bucket_script: {
        buckets_path: {
          min: 'throttled_min',
          max: 'throttled_max',
        },
        script: 'params.max - params.min',
      },
    },
  };

  return aggs;
}
