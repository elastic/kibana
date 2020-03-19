/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import KbnServer, { Server } from 'src/legacy/server/kbn_server';
import {
  LegacyPluginApi,
  LegacyPluginSpec,
  LegacyPluginOptions,
} from 'src/legacy/plugin_discovery/types';
import { KIBANA_ALERTING_ENABLED } from './common/constants';

// @ts-ignore
import { getUiExports } from './ui_exports';
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

const deps = ['kibana', 'elasticsearch', 'xpack_main'];
if (KIBANA_ALERTING_ENABLED) {
  deps.push(...['alerting', 'actions']);
}

const validConfigOptions: string[] = [
  'monitoring.ui.enabled',
  'monitoring.kibana.collection.enabled',
  'monitoring.ui.max_bucket_size',
  'monitoring.ui.min_interval_seconds',
  'kibana.index',
  'monitoring.ui.show_license_expiration',
  'monitoring.ui.container.elasticsearch.enabled',
  'monitoring.ui.container.logstash.enabled',
  'monitoring.tests.cloud_detector.enabled',
  'monitoring.kibana.collection.interval',
  'monitoring.elasticsearch.hosts',
  'monitoring.elasticsearch',
  'monitoring.ui.elasticsearch.hosts',
  'monitoring.ui.elasticsearch',
  'monitoring.xpack_api_polling_frequency_millis',
  'server.uuid',
  'server.name',
  'server.host',
  'server.port',
  'monitoring.cluster_alerts.email_notifications.enabled',
  'monitoring.cluster_alerts.email_notifications.email_address',
  'monitoring.ui.ccs.enabled',
  'monitoring.ui.elasticsearch.logFetchCount',
  'monitoring.ui.logs.index',
];

interface LegacyPluginOptionsWithKbnServer extends LegacyPluginOptions {
  kbnServer?: KbnServer;
}

/**
 * Invokes plugin modules to instantiate the Monitoring plugin for Kibana
 * @param kibana {Object} Kibana plugin instance
 * @return {Object} Monitoring UI Kibana plugin object
 */
export const monitoring = (kibana: LegacyPluginApi): LegacyPluginSpec => {
  return new kibana.Plugin({
    require: deps,
    id: 'monitoring',
    configPrefix: 'monitoring',
    publicDir: resolve(__dirname, 'public'),
    config: configDefaults,
    uiExports: getUiExports(),
    deprecations,

    async init(server: Server) {
      const serverConfig = server.config();
      const { getOSInfo, plugins, injectUiAppVars } = server as typeof server & { getOSInfo?: any };
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
        logger: server.newPlatform.coreContext.logger,
        getOSInfo,
        events: {
          on: (...args: Parameters<typeof server.events.on>) => server.events.on(...args),
        },
        route,
        expose,
        _hapi: server,
        _kbnServer: this.kbnServer,
      };

      const legacyPlugins = plugins as Partial<typeof plugins> & { infra?: InfraPlugin };
      const { xpack_main, elasticsearch, infra } = legacyPlugins;
      const {
        core: coreSetup,
        plugins: { usageCollection, licensing, alerting },
      } = server.newPlatform.setup;

      const pluginsSetup: PluginsSetup = {
        usageCollection,
        licensing,
        alerting,
      };

      const __LEGACY: LegacySetup = {
        ...serverFacade,
        plugins: {
          xpack_main,
          elasticsearch,
          infra,
        },
      };

      const plugin = new Plugin();
      await plugin.setup(coreSetup, pluginsSetup, __LEGACY);
    },

    postInit(server: Server) {
      const { infra } = server.plugins as Partial<typeof server.plugins> & { infra?: InfraPlugin };
      initInfraSource(server.config(), infra);
    },
  } as Partial<LegacyPluginOptionsWithKbnServer>);
};
