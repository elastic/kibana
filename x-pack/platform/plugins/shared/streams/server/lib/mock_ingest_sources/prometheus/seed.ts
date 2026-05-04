/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudPipelinesStore } from '../cloud_pipelines/storage';
import type { PrometheusStore } from './storage';

export const seedPrometheusScrapers = (
  store: PrometheusStore,
  cloudPipelinesStore: CloudPipelinesStore
): void => {
  if (!store.isEmpty()) {
    return;
  }

  // Wire k8s cluster to the first seeded cloud pipeline if available
  const pipelines = cloudPipelinesStore.list();
  const firstPipelineId = pipelines[0]?.id ?? '';

  store.create({
    name: 'k8s-cluster-prod',
    targetHost: 'prometheus.svc.cluster.local:9090',
    scrapeIntervalSec: 15,
    destination: { kind: 'cloudPipeline', pipelineId: firstPipelineId },
  });

  store.create({
    name: 'vm-fleet-staging',
    targetHost: '10.0.0.45:9090',
    scrapeIntervalSec: 30,
    destination: { kind: 'bulkEndpoint' },
  });

  store.create({
    name: 'legacy-app-metrics',
    targetHost: 'legacy.internal:9090',
    scrapeIntervalSec: 60,
    destination: { kind: 'bulkEndpoint' },
  });
};
