/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server, shim } from './shim';
import { Plugin } from './plugin';
import { AlertingPlugin } from './types';

export async function init(server: Server) {
  const { initializerContext, coreSetup, coreStart, pluginsSetup, pluginsStart } = shim(server);

  const plugin = new Plugin(initializerContext);

  const setupContract = await plugin.setup(coreSetup, pluginsSetup);
  const startContract = plugin.start(coreStart, pluginsStart);

  server.decorate('request', 'getAlertsClient', function() {
    return startContract.getAlertsClientWithRequest(this);
  });

  const exposedFunctions: AlertingPlugin = {
    setup: setupContract,
    start: startContract,
  };
  server.expose(exposedFunctions);

  createAlwaysFiringAlertType(setupContract);
}

function createAlwaysFiringAlertType(setupContract: any) {
  // Alert types
  const alwaysFiringAlertType: any = {
    id: '.always-firing',
    name: 'Always Firing',
    actionGroups: ['default', 'other'],
    async executor(alertExecutorOptions: any) {
      const { services, state } = alertExecutorOptions;

      services
        .alertInstanceFactory('1')
        .replaceState({ instanceStateValue: true })
        .scheduleActions('default', {
          instanceContextValue: true,
        });
      return {
        globalStateValue: true,
        groupInSeriesIndex: (state.groupInSeriesIndex || 0) + 1,
      };
    },
  };
  setupContract.registerType(alwaysFiringAlertType);
}
