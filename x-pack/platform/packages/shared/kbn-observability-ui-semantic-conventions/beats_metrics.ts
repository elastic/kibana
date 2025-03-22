/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// These items are defined both in [Elastic Agent integrations](https://www.elastic.co/integrations/data-integrations) and [Beats modules](https://www.elastic.co/guide/en/beats/metricbeat/current/metricbeat-modules.html).

// Docker integration fields

/**
 * Total CPU usage.
 *
 * @see https://www.elastic.co/guide/en/beats/metricbeat/current/exported-fields-docker.html#_cpu_5
 */
export const METRIC_DOCKER_CPU_TOTAL_PCT = 'docker.cpu.total.pct' as const;

// Kubernetes integration fields

/**
 * CPU usage as a percentage of the total node CPU
 *
 * @see https://www.elastic.co/guide/en/beats/metricbeat/current/exported-fields-kubernetes.html#_cpu_8
 */
export const METRIC_KUBERNETES_POD_CPU_USAGE_NODE_PCT =
  'kubernetes.pod.cpu.usage.node.pct' as const;

// System integration fields

// These are used in the exploratory_view plugin but not documented elsewhere
export const METRIC_SYSTEM_MEMORY_USAGE = 'system.memory.usage' as const;
export const METRIC_SYSTEM_CPU_USAGE = 'system.cpu.usage' as const;

/**
 * The percentage of CPU time in states other than Idle and IOWait, normalised by the number of cores.
 *
 * @see https://www.elastic.co/guide/en/beats/metricbeat/current/exported-fields-system.html#_cpu_11
 */
export const METRIC_SYSTEM_CPU_TOTAL_NORM_PCT = 'system.cpu.total.norm.pct' as const;

/**
 * The percentage of used memory.
 *
 * @see https://www.elastic.co/guide/en/beats/metricbeat/current/exported-fields-system.html#_memory_12
 */
export const METRIC_SYSTEM_MEMORY_USED_PCT = 'system.memory.used.pct' as const;
