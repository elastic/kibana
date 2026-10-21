/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Which correlation key the host-scoped profiling routes ended up using, from most to least
 * specific: the service's container ids, its Kubernetes workload on its hosts, its Kubernetes
 * workload on any host, or its hosts alone.
 */
export type ProfilingHostsScope = 'container' | 'workload' | 'workloadAnyHost' | 'host';

export interface ProfilingHostsCorrelation {
  scope: ProfilingHostsScope;
  hostNames: string[];
  containerIds: string[];
  workloadNames: string[];
}
