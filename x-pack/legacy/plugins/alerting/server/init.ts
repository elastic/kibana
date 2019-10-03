/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { Legacy } from 'kibana';
import KbnServer from 'src/legacy/server/kbn_server';
import { Plugin } from './plugin';
import { ActionsPlugin } from '../../actions';
import { AlertingPlugin } from './types';
import { TaskManager } from '../../task_manager';
import { EncryptedSavedObjectsPlugin } from '../../encrypted_saved_objects';
import { PluginSetupContract as SecurityPluginSetupContract } from '../../../../plugins/security/server';

// Extend PluginProperties to indicate which plugins are guaranteed to exist
// due to being marked as dependencies
interface Plugins extends Hapi.PluginProperties {
  actions: ActionsPlugin;
  task_manager: TaskManager;
  encrypted_saved_objects: EncryptedSavedObjectsPlugin;
}

interface Server extends Legacy.Server {
  plugins: Plugins;
}

export async function init(server: Server) {
  const newPlatform = ((server as unknown) as KbnServer).newPlatform;
  const coreSetup = {
    elasticsearch: newPlatform.setup.core.elasticsearch,
    savedObjects: server.savedObjects,
    http: {
      route: server.route.bind(server),
      basePath: newPlatform.setup.core.http.basePath,
    },
  };
  const pluginsSetup = {
    security: newPlatform.setup.plugins.security as SecurityPluginSetupContract | undefined,
    task_manager: server.plugins.task_manager,
    // TODO: Currently a function because it's an optional dependency that
    // initializes after this function is called
    spaces: () => server.plugins.spaces,
    actions: server.plugins.actions,
    xpack_main: server.plugins.xpack_main,
    encrypted_saved_objects: server.plugins.encrypted_saved_objects,
  };

  const plugin = new Plugin({
    logger: newPlatform.coreContext.logger,
  });

  const setupContract = await plugin.setup(coreSetup, pluginsSetup);
  const startContract = plugin.start();

  server.decorate('request', 'getAlertsClient', function() {
    return startContract.getAlertsClientWithRequest(this);
  });

  const exposedFunctions: AlertingPlugin = {
    setup: setupContract,
    start: startContract,
  };
  server.expose(exposedFunctions);
}
