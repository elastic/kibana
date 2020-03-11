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
  return new kibana.Plugin({
    require: deps,
    id: 'monitoring',
    configPrefix: 'monitoring',
    publicDir: resolve(__dirname, 'public'),
    init(server) {
      const npMonitoring = server.newPlatform.setup.plugins.monitoring;
      if (npMonitoring) {
        const kbnServerStatus = this.kbnServer.status;
        npMonitoring.registerLegacyAPI({
          telemetryCollectionManager,
          getServerStatus: () => {
            const status = kbnServerStatus.toJSON();
            return get(status, 'overall.state');
          },
        });
      }
    },
    config,
    uiExports: getUiExports(),
  });
};
