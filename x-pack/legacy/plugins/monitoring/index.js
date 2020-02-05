/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { config } from './config';
import { deprecations } from './deprecations';
import { getUiExports } from './ui_exports';
import { Plugin } from './server/plugin';
import { initInfraSource } from './server/lib/logs/init_infra_source';
import { KIBANA_ALERTING_ENABLED } from './common/constants';

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
      const configs = [
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

      const serverConfig = server.config();
      const serverFacade = {
        config: () => ({
          get: key => {
            if (configs.includes(key)) {
              return serverConfig.get(key);
            }
            throw `Unknown key '${key}'`;
          },
        }),
        injectUiAppVars: server.injectUiAppVars,
        log: (...args) => server.log(...args),
        logger: server.newPlatform.coreContext.logger,
        getOSInfo: server.getOSInfo,
        events: {
          on: (...args) => server.events.on(...args),
        },
        expose: (...args) => server.expose(...args),
        route: (...args) => server.route(...args),
        _hapi: server,
        _kbnServer: this.kbnServer,
      };
      const { usageCollection, licensing } = server.newPlatform.setup.plugins;
      const plugins = {
        xpack_main: server.plugins.xpack_main,
        elasticsearch: server.plugins.elasticsearch,
        infra: server.plugins.infra,
        alerting: server.plugins.alerting,
        usageCollection,
        licensing,
      };

      const plugin = new Plugin();
      plugin.setup(serverFacade, plugins);
    },
    config,
    deprecations,
    uiExports: getUiExports(),
    postInit(server) {
      const serverConfig = server.config();
      initInfraSource(serverConfig, server.plugins.infra);
    },
  });
