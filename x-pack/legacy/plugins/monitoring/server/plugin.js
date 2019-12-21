/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { LOGGING_TAG, KIBANA_MONITORING_LOGGING_TAG } from '../common/constants';
import { requireUIRoutes } from './routes';
import { instantiateClient } from './es_client/instantiate_client';
import { initMonitoringXpackInfo } from './init_monitoring_xpack_info';
import { initBulkUploader, registerCollectors } from './kibana_monitoring';
import { registerMonitoringCollection } from './telemetry_collection';
import { parseElasticsearchConfig } from './es_client/parse_elasticsearch_config';

export class Plugin {
  setup(_coreSetup, pluginsSetup, __LEGACY) {
    const {
      plugins,
      _kbnServer: kbnServer,
      log,
      getOSInfo,
      _hapi: hapiServer,
      events,
      expose,
      config: monitoringConfig,
    } = __LEGACY;
    const config = monitoringConfig();

    const { usageCollection, licensing } = pluginsSetup;
    registerMonitoringCollection();
    /*
     * Register collector objects for stats to show up in the APIs
     */
    registerCollectors(usageCollection, {
      elasticsearchPlugin: plugins.elasticsearch,
      kbnServerConfig: kbnServer.config,
      log,
      config,
      getOSInfo,
      hapiServer,
    });

    /*
     * Instantiate and start the internal background task that calls collector
     * fetch methods and uploads to the ES monitoring bulk endpoint
     */
    const xpackMainPlugin = plugins.xpack_main;

    /*
     * Parse the Elasticsearch config and read any certificates/keys if necessary
     */
    const elasticsearchConfig = parseElasticsearchConfig(config);

    xpackMainPlugin.status.once('green', async () => {
      // first time xpack_main turns green
      /*
       * End-user-facing services
       */
      const uiEnabled = config.get('xpack.monitoring.ui.enabled');

      if (uiEnabled) {
        await instantiateClient({
          log,
          events,
          config,
          elasticsearchPlugin: plugins.elasticsearch,
        }); // Instantiate the dedicated ES client
        await initMonitoringXpackInfo({
          config,
          log,
          xpackMainPlugin: plugins.xpack_main,
          expose,
        }); // Route handlers depend on this for xpackInfo
        await requireUIRoutes(__LEGACY);
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
            read: [],
          },
          ui: [],
        },
        description: i18n.translate('xpack.monitoring.feature.reserved.description', {
          defaultMessage: 'To grant users access, you should also assign the monitoring_user role.',
        }),
      },
    });

    const bulkUploader = initBulkUploader({
      elasticsearchPlugin: plugins.elasticsearch,
      config,
      log,
      kbnServerStatus: kbnServer.status,
      kbnServerVersion: kbnServer.version,
    });
    const kibanaCollectionEnabled = config.get('xpack.monitoring.kibana.collection.enabled');

    if (kibanaCollectionEnabled) {
      /*
       * Bulk uploading of Kibana stats
       */
      licensing.license$.subscribe(license => {
        // use updated xpack license info to start/stop bulk upload
        const mainMonitoring = license.getFeature('monitoring');
        const monitoringBulkEnabled =
          mainMonitoring && mainMonitoring.isAvailable && mainMonitoring.isEnabled;
        if (monitoringBulkEnabled) {
          bulkUploader.start(usageCollection);
        } else {
          bulkUploader.handleNotEnabled();
        }
      });
    } else if (!kibanaCollectionEnabled) {
      log(
        ['info', LOGGING_TAG, KIBANA_MONITORING_LOGGING_TAG],
        'Internal collection for Kibana monitoring is disabled per configuration.'
      );
    }
  }
}
