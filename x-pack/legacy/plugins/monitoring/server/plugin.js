/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
// import { ElasticsearchPlugin } from 'src/legacy/core_plugins/elasticsearch';
import { LOGGING_TAG, KIBANA_MONITORING_LOGGING_TAG } from '../common/constants';
import { requireUIRoutes } from './routes';
import { instantiateClient } from './es_client/instantiate_client';
import { initMonitoringXpackInfo } from './init_monitoring_xpack_info';
import { initBulkUploader } from './kibana_monitoring';
import {
  getKibanaUsageCollector,
  getOpsStatsCollector,
  getSettingsCollector,
} from './kibana_monitoring/collectors';
// import { initInfraSource } from './lib/logs/init_infra_source';
// import {
//   ClusterClient,
//   CoreSetup,
//   KibanaRequest,
//   Logger,
//   PluginInitializerContext,
//   RecursiveReadonly,
// } from '../../../../../src/core/server';

// interface CoreSetup {
//   _kbnServer: Record<string, any>;
//   config: Function;
//   usage: {
//     collectorSet: {
//       register: Function;
//     };
//   };
//   plugins: {
//     elasticsearch: ElasticsearchPlugin;
//     xpack_main: {
//       status: {
//         once: Function;
//       };
//       registerFeature: Function;
//       info: {
//         onLicenseInfoChange: Function;
//         feature: Function;
//       };
//     };
//   };
//   log: Function;
//   injectUiAppVars: Function;
// }

// interface PluginsSetup {
//   foo: string;
// }

// export type DemoPluginSetup = ReturnType<Plugin['setup']>;

export class Plugin {
  setup(core, _plugins) {
    const kbnServer = core._kbnServer;
    const config = core.config();
    const { collectorSet } = core.usage;
    /*
    * Register collector objects for stats to show up in the APIs
    */
    collectorSet.register(getOpsStatsCollector(core, kbnServer));
    collectorSet.register(getKibanaUsageCollector(core));
    collectorSet.register(getSettingsCollector(core, kbnServer));

    /*
    * Instantiate and start the internal background task that calls collector
    * fetch methods and uploads to the ES monitoring bulk endpoint
    */
    const xpackMainPlugin = core.plugins.xpack_main;
    xpackMainPlugin.status.once('green', async () => { // first time xpack_main turns green
      /*
      * End-user-facing services
      */
      const uiEnabled = config.get('xpack.monitoring.ui.enabled');

      if (uiEnabled) {
        await instantiateClient(core); // Instantiate the dedicated ES client
        await initMonitoringXpackInfo(core); // Route handlers depend on this for xpackInfo
        await requireUIRoutes(core);
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

    const bulkUploader = initBulkUploader(kbnServer, core);
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
      core.log(
        ['info', LOGGING_TAG, KIBANA_MONITORING_LOGGING_TAG],
        'Internal collection for Kibana monitoring is disabled per configuration.'
      );
    }

    core.injectUiAppVars('monitoring', (core) => {
      const config = core.config();
      return {
        maxBucketSize: config.get('xpack.monitoring.max_bucket_size'),
        minIntervalSeconds: config.get('xpack.monitoring.min_interval_seconds'),
        kbnIndex: config.get('kibana.index'),
        showLicenseExpiration: config.get('xpack.monitoring.show_license_expiration'),
        showCgroupMetricsElasticsearch: config.get('xpack.monitoring.ui.container.elasticsearch.enabled'),
        showCgroupMetricsLogstash: config.get('xpack.monitoring.ui.container.logstash.enabled') // Note, not currently used, but see https://github.com/elastic/x-pack-kibana/issues/1559 part 2
      };
    });
  }
}
