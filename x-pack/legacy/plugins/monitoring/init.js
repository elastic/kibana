/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { LOGGING_TAG, KIBANA_MONITORING_LOGGING_TAG } from './common/constants';
import { requireUIRoutes } from './server/routes';
import { instantiateClient } from './server/es_client/instantiate_client';
import { initMonitoringXpackInfo } from './server/init_monitoring_xpack_info';
import { initBulkUploader } from './server/kibana_monitoring';
import {
  getKibanaUsageCollector,
  getOpsStatsCollector,
  getSettingsCollector,
} from './server/kibana_monitoring/collectors';
import { initInfraSource } from './server/lib/logs/init_infra_source';

/**
 * Initialize the Kibana Monitoring plugin by starting up asynchronous server tasks
 * - [1] instantiation of an elasticsearch-js client exposed as a server plugin object
 * - [2] start monitoring cluster x-pack license and features check
 * - [3] webserver route handling
 * - [4] start the internal monitoring collector/bulk uploader
 * - [5] expose the monitoring collector object for other plugins to register with
 * @param monitoringPlugin {Object} Monitoring UI plugin
 * @param server {Object} HapiJS server instance
 */
export const init = (monitoringPlugin, server) => {
  const kbnServer = monitoringPlugin.kbnServer;
  const config = server.config();
  const { collectorSet } = server.usage;
  /*
   * Register collector objects for stats to show up in the APIs
   */
  collectorSet.register(getOpsStatsCollector(server, kbnServer));
  collectorSet.register(getKibanaUsageCollector(server));
  collectorSet.register(getSettingsCollector(server, kbnServer));

  /*
   * Instantiate and start the internal background task that calls collector
   * fetch methods and uploads to the ES monitoring bulk endpoint
   */
  const xpackMainPlugin = server.plugins.xpack_main;
  xpackMainPlugin.status.once('green', async () => { // first time xpack_main turns green
    /*
     * End-user-facing services
     */
    const uiEnabled = config.get('xpack.monitoring.ui.enabled');

    if (uiEnabled) {
      await instantiateClient(server); // Instantiate the dedicated ES client
      await initMonitoringXpackInfo(server); // Route handlers depend on this for xpackInfo
      await requireUIRoutes(server);
    }
  });

  xpackMainPlugin.registerFeature({
    id: 'monitoring',
    name: i18n.translate('xpack.monitoring.featureRegistry.monitoringFeatureName', {
      defaultMessage: 'Stack Monitoring',
    }),
    icon: 'monitoringApp',
    navLinkId: 'monitoring',
    app: ['monitoring', 'kibana'],
    catalogue: ['monitoring'],
    privileges: {},
    reserved: {
      privilege: {
        savedObject: {
          all: [],
          read: []
        },
        ui: [],
      },
      description: i18n.translate('xpack.monitoring.feature.reserved.description', {
        defaultMessage: 'To grant users access, you should also assign the monitoring_user role.'
      })
    }
  });

  const bulkUploader = initBulkUploader(kbnServer, server);
  const kibanaCollectionEnabled = config.get('xpack.monitoring.kibana.collection.enabled');
  const { info: xpackMainInfo } = xpackMainPlugin;

  if (kibanaCollectionEnabled) {
    /*
     * Bulk uploading of Kibana stats
     */
    xpackMainInfo.onLicenseInfoChange(() => {
      // use updated xpack license info to start/stop bulk upload
      const mainMonitoring = xpackMainInfo.feature('monitoring');
      const monitoringBulkEnabled = mainMonitoring && mainMonitoring.isAvailable() && mainMonitoring.isEnabled();
      if (monitoringBulkEnabled) {
        bulkUploader.start(collectorSet);
      } else {
        bulkUploader.handleNotEnabled();
      }
    });
  } else if (!kibanaCollectionEnabled) {
    server.log(
      ['info', LOGGING_TAG, KIBANA_MONITORING_LOGGING_TAG],
      'Internal collection for Kibana monitoring is disabled per configuration.'
    );
  }

  server.injectUiAppVars('monitoring', (server) => {
    const config = server.config();
    return {
      maxBucketSize: config.get('xpack.monitoring.max_bucket_size'),
      minIntervalSeconds: config.get('xpack.monitoring.min_interval_seconds'),
      kbnIndex: config.get('kibana.index'),
      showLicenseExpiration: config.get('xpack.monitoring.show_license_expiration'),
      showCgroupMetricsElasticsearch: config.get('xpack.monitoring.ui.container.elasticsearch.enabled'),
      showCgroupMetricsLogstash: config.get('xpack.monitoring.ui.container.logstash.enabled') // Note, not currently used, but see https://github.com/elastic/x-pack-kibana/issues/1559 part 2
    };
  });
};

export const postInit = server => {
  initInfraSource(server);
};
