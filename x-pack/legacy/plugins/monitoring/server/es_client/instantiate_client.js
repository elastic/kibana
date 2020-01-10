/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { bindKey, once } from 'lodash';
import { monitoringBulk } from '../kibana_monitoring/lib/monitoring_bulk';
import { LOGGING_TAG } from '../../common/constants';

/* Provide a dedicated Elasticsearch client for Monitoring
 * The connection options can be customized for the Monitoring application
 * This allows the app to connect to a dedicated monitoring cluster even if
 * Kibana itself is connected to a production cluster.
 */

export function exposeClient({ config, events, log, elasticsearchPlugin }) {
  const elasticsearchConfig = hasMonitoringCluster(config)
    ? config.get('xpack.monitoring.elasticsearch')
    : {};
  const cluster = elasticsearchPlugin.createCluster('monitoring', {
    ...elasticsearchConfig,
    plugins: [monitoringBulk],
    logQueries: Boolean(elasticsearchConfig.logQueries),
  });

  events.on('stop', bindKey(cluster, 'close'));
  const configSource = hasMonitoringCluster(config) ? 'monitoring' : 'production';
  log([LOGGING_TAG, 'es-client'], `config sourced from: ${configSource} cluster`);
}

export function hasMonitoringCluster(config) {
  const hosts = config.get('xpack.monitoring.elasticsearch.hosts');
  return Boolean(hosts && hosts.length);
}

export const instantiateClient = once(exposeClient);
