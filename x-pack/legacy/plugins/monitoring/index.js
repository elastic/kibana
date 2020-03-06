/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { resolve } from 'path';
import { config } from './config';
import { getUiExports } from './ui_exports';
import { KIBANA_ALERTING_ENABLED } from './common/constants';
import { telemetryCollectionManager } from '../../../../src/legacy/core_plugins/telemetry/server';

/**
 * Invokes plugin modules to instantiate the Monitoring plugin for Kibana
 * @param kibana {Object} Kibana plugin instance
 * @return {Object} Monitoring UI Kibana plugin object
 */
const deps = ['kibana', 'elasticsearch', 'xpack_main'];
if (KIBANA_ALERTING_ENABLED) {
  deps.push(...['alerting', 'actions']);
}
export const monitoring = kibana => {
  let legacyApi = {};
  return new kibana.Plugin({
    require: deps,
    id: 'monitoring',
    configPrefix: 'monitoring',
    publicDir: resolve(__dirname, 'public'),
    init(server) {
      const serverConfig = server.config();
      const elasticsearch = server.plugins.elasticsearch;
      const getOSInfo = server.getOSInfo;
      const hapiServer = server;
      const kbnServerStatus = this.kbnServer.status;
      legacyApi = {
        telemetryCollectionManager,
        elasticsearch,
        opsInterval: serverConfig.get('ops.interval'),
        getOSInfo,
        hapiServer,
        getServerStatus: () => {
          const status = kbnServerStatus.toJSON();
          return get(status, 'overall.state');
        },
      };

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
    postInit(server) {
      legacyApi.infra = server.plugins.infra;
      const monitoringPlugin = server.newPlatform.setup.plugins.monitoring;
      monitoringPlugin.registerLegacyAPI(legacyApi);
    },
    config,
    uiExports: getUiExports(),
  });
};
