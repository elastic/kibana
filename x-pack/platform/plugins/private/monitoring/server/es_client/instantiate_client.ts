/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  Logger,
  ElasticsearchServiceStart,
  IClusterClient,
  ICustomClusterClient,
} from '@kbn/core/server';
import type { MonitoringElasticsearchConfig } from '../config';

/* Provide a dedicated Elasticsearch client for Monitoring
 * The connection options can be customized for the Monitoring application
 * This allows the app to connect to a dedicated monitoring cluster even if
 * Kibana itself is connected to a production cluster.
 */

export function instantiateClient(
  elasticsearchConfig: MonitoringElasticsearchConfig,
  log: Logger,
  elasticsearchStart: ElasticsearchServiceStart
): IClusterClient | ICustomClusterClient {
  const isMonitoringCluster = hasMonitoringCluster(elasticsearchConfig);
  const cluster = isMonitoringCluster
    ? elasticsearchStart.createClient('monitoring', elasticsearchConfig)
    : elasticsearchStart.client;

  const configSource = isMonitoringCluster ? 'monitoring' : 'production';
  log.info(`config sourced from: ${configSource} cluster`);
  return cluster;
}

export function hasMonitoringCluster(config: MonitoringElasticsearchConfig) {
  return Boolean(config.hosts && config.hosts[0]);
}
