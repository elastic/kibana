/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  LOGGING_TAG,
  KIBANA_MONITORING_LOGGING_TAG,
  KIBANA_ALERTING_ENABLED,
} from '../common/constants';
import { requireUIRoutes } from './routes';
import { instantiateClient } from './es_client/instantiate_client';
import { initMonitoringXpackInfo } from './init_monitoring_xpack_info';
import { initBulkUploader, registerCollectors } from './kibana_monitoring';
import { registerMonitoringCollection } from './telemetry_collection';
import { getLicenseExpiration } from './alerts/license_expiration';
import { parseElasticsearchConfig } from './es_client/parse_elasticsearch_config';

export class Plugin {
  async setup(_coreSetup, pluginsSetup, __LEGACY) {
    const {
      plugins,
      _kbnServer: kbnServer,
      log,
      logger,
      getOSInfo,
      _hapi: hapiServer,
      events,
      expose,
      config: monitoringConfig,
      injectUiAppVars,
    } = __LEGACY;
    const config = monitoringConfig();

    const { usageCollection, licensing, alerting } = pluginsSetup;
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

    // Create the dedicated client
    await instantiateClient({
      log,
      events,
      elasticsearchConfig,
      elasticsearchPlugin: plugins.elasticsearch,
    });

    xpackMainPlugin.status.once('green', async () => {
      // first time xpack_main turns green
      /*
       * End-user-facing services
       */
      const uiEnabled = config.get('monitoring.ui.enabled');

      if (uiEnabled) {
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
    const kibanaCollectionEnabled = config.get('monitoring.kibana.collection.enabled');

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

    injectUiAppVars('monitoring', () => {
      return {
        maxBucketSize: config.get('monitoring.ui.max_bucket_size'),
        minIntervalSeconds: config.get('monitoring.ui.min_interval_seconds'),
        kbnIndex: config.get('kibana.index'),
        monitoringUiEnabled: config.get('monitoring.ui.enabled'),
        showLicenseExpiration: config.get('monitoring.ui.show_license_expiration'),
        showCgroupMetricsElasticsearch: config.get('monitoring.ui.container.elasticsearch.enabled'),
        showCgroupMetricsLogstash: config.get('monitoring.ui.container.logstash.enabled'), // Note, not currently used, but see https://github.com/elastic/x-pack-kibana/issues/1559 part 2
      };
    });

    if (KIBANA_ALERTING_ENABLED && alerting) {
      // this is not ready right away but we need to register alerts right away
      async function getMonitoringCluster() {
        const configs = config.get('xpack.monitoring.elasticsearch');
        if (configs.hosts) {
          const monitoringCluster = plugins.elasticsearch.getCluster('monitoring');
          const { username, password } = configs;
          const fakeRequest = {
            headers: {
              authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
            },
          };
          return {
            callCluster: (...args) => monitoringCluster.callWithRequest(fakeRequest, ...args),
          };
        }
        return null;
      }

      function getLogger(contexts) {
        return logger.get('plugins', LOGGING_TAG, ...contexts);
      }
      alerting.registerType(
        getLicenseExpiration(
          hapiServer,
          getMonitoringCluster,
          getLogger,
          config.get('xpack.monitoring.ccs.enabled')
        )
      );
    }
  }
}
