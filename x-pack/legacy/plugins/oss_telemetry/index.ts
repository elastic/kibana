/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, PluginInitializerContext, CoreStart } from 'kibana/server';
import { Legacy } from 'kibana';
import { PLUGIN_ID } from './constants';
import { OssTelemetryPlugin } from './server/plugin';
import { LegacyPluginInitializer } from '../../../../src/legacy/plugin_discovery/types';
import { getTaskManagerSetup, getTaskManagerStart } from '../task_manager/server';

export const ossTelemetry: LegacyPluginInitializer = kibana => {
  return new kibana.Plugin({
    id: PLUGIN_ID,
    require: ['elasticsearch', 'xpack_main'],
    configPrefix: 'xpack.oss_telemetry',

    init(server: Legacy.Server) {
      const plugin = new OssTelemetryPlugin({
        logger: {
          get: () =>
            ({
              info: (message: string) => server.log(['info', 'task_manager'], message),
              debug: (message: string) => server.log(['debug', 'task_manager'], message),
              warn: (message: string) => server.log(['warn', 'task_manager'], message),
              error: (message: string) => server.log(['error', 'task_manager'], message),
            } as Logger),
        },
      } as PluginInitializerContext);

      const deps = {
        usageCollection: server.newPlatform.setup.plugins.usageCollection,
        __LEGACY: {
          config: server.config(),
          xpackMainStatus: ((server.plugins.xpack_main as unknown) as { status: any }).status
            .plugin,
        },
      };

      plugin.setup(server.newPlatform.setup.core, {
        ...deps,
        taskManager: getTaskManagerSetup(server),
      });

      plugin.start((server.newPlatform.setup.core as unknown) as CoreStart, {
        ...deps,
        taskManager: getTaskManagerStart(server),
      });
    },
  });
};
