/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { Plugin } from './plugin';
import { shim } from './shim';
import { ActionsPlugin } from './types';

export async function init(server: Legacy.Server) {
  const { initializerContext, coreSetup, coreStart, pluginsSetup, pluginsStart } = shim(server);

  const plugin = new Plugin(initializerContext);

  const setupContract = await plugin.setup(coreSetup, pluginsSetup);
  const startContract = plugin.start(coreStart, pluginsStart);

  server.decorate('request', 'getActionsClient', function() {
    return startContract.getActionsClientWithRequest(this);
  });

  const exposedFunctions: ActionsPlugin = {
    setup: setupContract,
    start: startContract,
  };
  server.expose(exposedFunctions);
}
