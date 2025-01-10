/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger, ICustomClusterClient, ElasticsearchClientConfig } from '@kbn/core/server';
import { monitoringBulk } from '../kibana_monitoring/lib/monitoring_bulk';
import { monitoringEndpointDisableWatches } from './monitoring_endpoint_disable_watches';
import { MonitoringElasticsearchConfig } from '../config';

/* Provide a dedicated Elasticsearch client for Monitoring
 * The connection options can be customized for the Monitoring application
 * This allows the app to connect to a dedicated monitoring cluster even if
 * Kibana itself is connected to a production cluster.
 */

type ESClusterConfig = MonitoringElasticsearchConfig;

export function instantiateClient(
  elasticsearchConfig: MonitoringElasticsearchConfig,
  log: Logger,
  createClient: (
    type: string,
    clientConfig?: Partial<ElasticsearchClientConfig> | undefined
  ) => ICustomClusterClient
) {
  const isMonitoringCluster = hasMonitoringCluster(elasticsearchConfig);
  const cluster = createClient('monitoring', {
    ...(isMonitoringCluster ? elasticsearchConfig : {}),
    plugins: [monitoringBulk, monitoringEndpointDisableWatches],
  } as ESClusterConfig);

  const configSource = isMonitoringCluster ? 'monitoring' : 'production';
  log.info(`config sourced from: ${configSource} cluster`);
  return cluster;
}

export function hasMonitoringCluster(config: MonitoringElasticsearchConfig) {
  return Boolean(config.hosts && config.hosts[0]);
}
