/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { config } from './config';
import { deprecations } from './deprecations';
import { getUiExports } from './ui_exports';
import { KIBANA_ALERTING_ENABLED } from './common/constants';
import { telemetryCollectionManager } from '../../../../src/legacy/core_plugins/telemetry/server';
import { callClusterFactory } from '../xpack_main';

/**
 * Invokes plugin modules to instantiate the Monitoring plugin for Kibana
 * @param kibana {Object} Kibana plugin instance
 * @return {Object} Monitoring UI Kibana plugin object
 */
const deps = ['kibana', 'elasticsearch', 'xpack_main'];
if (KIBANA_ALERTING_ENABLED) {
  deps.push(...['alerting', 'actions']);
}
export const monitoring = kibana =>
  new kibana.Plugin({
    require: deps,
    id: 'monitoring',
    configPrefix: 'monitoring',
    publicDir: resolve(__dirname, 'public'),
    init(server) {
      const serverConfig = server.config();
      const monitoringPlugin = server.newPlatform.setup.plugins.monitoring;
      const xpackMain = server.plugins.xpack_main;
      const elasticsearch = server.plugins.elasticsearch;
      const legacyConfig = {
        opsInterval: serverConfig.get('ops.interval'),
      };
      const getOSInfo = server.getOSInfo;
      const hapiServer = server;
      const kbnServerStatus = this.kbnServer.status;
      const kbnServerVersion = this.kbnServer.version;
      monitoringPlugin.registerLegacyAPI({
        xpackMain,
        telemetryCollectionManager,
        elasticsearch,
        legacyConfig,
        getOSInfo,
        hapiServer,
        callClusterFactory,
        kbnServerStatus,
        kbnServerVersion,
      });

      server.injectUiAppVars('monitoring', () => {
        return {
          maxBucketSize: serverConfig.get('monitoring.ui.max_bucket_size'),
          minIntervalSeconds: serverConfig.get('monitoring.ui.min_interval_seconds'),
          kbnIndex: serverConfig.get('kibana.index'),
          showLicenseExpiration: serverConfig.get('monitoring.ui.show_license_expiration'),
          showCgroupMetricsElasticsearch: serverConfig.get(
            'monitoring.ui.container.elasticsearch.enabled'
          ),
          showCgroupMetricsLogstash: serverConfig.get('monitoring.ui.container.logstash.enabled'), // Note, not currently used, but see https://github.com/elastic/x-pack-kibana/issues/1559 part 2
        };
      });
    },
    config,
    deprecations,
    uiExports: getUiExports(),
  });
