/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { Server } from 'src/legacy/server/kbn_server';
import KbnServer from 'src/legacy/server/kbn_server';
import { i18n } from '@kbn/i18n';

import { LegacyPluginApi, LegacyPluginSpec, ArrayOrItem } from 'src/legacy/plugin_discovery/types';

// @ts-ignore
import { config as configDefaults } from './config';
// @ts-ignore
import { deprecations } from './deprecations';
// @ts-ignore
import { Plugin } from './server/plugin';
// @ts-ignore
import { initInfraSource } from './server/lib/logs/init_infra_source';

type InfraPlugin = any; // TODO
type PluginsSetup = any; // TODO
type LegacySetup = any; // TODO

const uiExports = {
  app: {
    title: i18n.translate('xpack.monitoring.stackMonitoringTitle', {
      defaultMessage: 'Stack Monitoring',
    }),
    order: 9002,
    icon: 'plugins/monitoring/icons/monitoring.svg',
    euiIconType: 'monitoringApp',
    main: 'plugins/monitoring/legacy',
  },
  injectDefaultVars(server: Server) {
    const config = server.config();
    return {
      // TODO: Implement with PluginConfigDescriptor.exposeToBrowser instead
      showLicenseExpiration: config.get('xpack.monitoring.show_license_expiration'),
      monitoringUiEnabled: config.get('xpack.monitoring.ui.enabled'),
      minIntervalSeconds: config.get('xpack.monitoring.min_interval_seconds'),
      showCgroupMetricsElasticsearch: config.get(
        'xpack.monitoring.ui.container.elasticsearch.enabled'
      ),
      showCgroupMetricsLogstash: config.get('xpack.monitoring.ui.container.logstash.enabled'),
    };
  },
  hacks: ['plugins/monitoring/hacks/toggle_app_link_in_nav'],
  home: ['plugins/monitoring/register_feature'],
  styleSheetPaths: resolve(__dirname, 'public/index.scss'),
};

const validConfigOptions: string[] = [
  'xpack.monitoring.ui.enabled',
  'xpack.monitoring.kibana.collection.enabled',
  'xpack.monitoring.max_bucket_size',
  'xpack.monitoring.min_interval_seconds',
  'kibana.index',
  'xpack.monitoring.show_license_expiration',
  'xpack.monitoring.ui.container.elasticsearch.enabled',
  'xpack.monitoring.ui.container.logstash.enabled',
  'xpack.monitoring.tests.cloud_detector.enabled',
  'xpack.monitoring.kibana.collection.interval',
  'xpack.monitoring.elasticsearch.hosts',
  'xpack.monitoring.elasticsearch',
  'xpack.monitoring.xpack_api_polling_frequency_millis',
  'server.uuid',
  'server.name',
  'server.host',
  'server.port',
  'xpack.monitoring.cluster_alerts.email_notifications.enabled',
  'xpack.monitoring.cluster_alerts.email_notifications.email_address',
  'xpack.monitoring.ccs.enabled',
  'xpack.monitoring.elasticsearch.logFetchCount',
];

/**
 * Invokes plugin modules to instantiate the Monitoring plugin for Kibana
 * @param kibana {Object} Kibana plugin instance
 * @return {Object} Monitoring UI Kibana plugin object
 */
export const monitoring = (kibana: LegacyPluginApi): ArrayOrItem<LegacyPluginSpec> => {
  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    id: 'monitoring',
    configPrefix: 'xpack.monitoring',
    publicDir: resolve(__dirname, 'public'),
    config: configDefaults,
    uiExports,
    deprecations,

    init(server: Server) {
      const serverConfig = server.config();
      const { injectUiAppVars, getOSInfo, plugins } = server as typeof server & { getOSInfo?: any };
      const log = (...args: Parameters<typeof server.log>) => server.log(...args);
      const route = (...args: Parameters<typeof server.route>) => server.route(...args);
      const expose = (...args: Parameters<typeof server.expose>) => server.expose(...args);
      const serverFacade = {
        config: () => ({
          get: (key: string) => {
            if (validConfigOptions.includes(key)) {
              return serverConfig.get(key);
            }
            throw new Error(`Unknown key '${key}'`);
          },
        }),
        injectUiAppVars,
        log,
        getOSInfo,
        events: {
          on: (...args: Parameters<typeof server.events.on>) => server.events.on(...args),
        },
        route,
        expose,
        _hapi: server,
        // @ts-ignore
        _kbnServer: this.kbnServer as KbnServer,
      };

      const legacyPlugins = plugins as Partial<typeof plugins> & { infra?: InfraPlugin };
      const { xpack_main, elasticsearch, infra } = legacyPlugins;
      const {
        core: coreSetup,
        plugins: { usageCollection },
      } = server.newPlatform.setup;

      const pluginsSetup: PluginsSetup = {
        usageCollection,
      };

      const __LEGACY: LegacySetup = {
        ...serverFacade,
        plugins: {
          xpack_main,
          elasticsearch,
          infra,
        },
      };

      new Plugin().setup(coreSetup, pluginsSetup, __LEGACY);
    },

    postInit(server: Server) {
      const { infra } = server.plugins as Partial<typeof server.plugins> & { infra?: InfraPlugin };
      initInfraSource(server.config(), infra);
    },
  });
};
