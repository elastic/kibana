/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { config } from './config';
import { KIBANA_ALERTING_ENABLED } from '../../../plugins/monitoring/common/constants';

/**
 * Invokes plugin modules to instantiate the Monitoring plugin for Kibana
 * @param kibana {Object} Kibana plugin instance
 * @return {Object} Monitoring UI Kibana plugin object
 */
const deps = ['kibana', 'elasticsearch', 'xpack_main'];
if (KIBANA_ALERTING_ENABLED) {
  deps.push(...['alerts', 'actions']);
}
export const monitoring = (kibana: any) => {
  return new kibana.Plugin({
    require: deps,
    id: 'monitoring',
    configPrefix: 'monitoring',
    init(server: Hapi.Server) {
      const npMonitoring = server.newPlatform.setup.plugins.monitoring as object & {
        registerLegacyAPI: (api: unknown) => void;
      };
      if (npMonitoring) {
        const kbnServerStatus = this.kbnServer.status;
        npMonitoring.registerLegacyAPI({
          getServerStatus: () => {
            const status = kbnServerStatus.toJSON();
            return status?.overall?.state;
          },
        });
      }
    },
    config,
  });
};
