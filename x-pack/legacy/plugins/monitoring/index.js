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

/**
 * Invokes plugin modules to instantiate the Monitoring plugin for Kibana
 * @param kibana {Object} Kibana plugin instance
 * @return {Object} Monitoring UI Kibana plugin object
 */
export const monitoring = kibana =>
  new kibana.Plugin({
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    id: 'monitoring',
    configPrefix: 'xpack.monitoring',
    publicDir: resolve(__dirname, 'public'),
    init(server) {
      const configs = [
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
        usageCollection,
        licensing,
      };

      new Plugin().setup(serverFacade, plugins);
    },
    config,
    deprecations,
    uiExports: getUiExports(),
    postInit(server) {
      const serverConfig = server.config();
      initInfraSource(serverConfig, server.plugins.infra);
    },
  });
