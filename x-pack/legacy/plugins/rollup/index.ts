/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/server';
import { RollupSetup } from '../../../plugins/rollup/server';
import { PLUGIN } from './common';
import { plugin } from './server';

export function rollup(kibana: any) {
  return new kibana.Plugin({
    id: PLUGIN.ID,
    configPrefix: 'xpack.rollup',
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    init(server: any) {
      const { core: coreSetup, plugins } = server.newPlatform.setup;
      const { usageCollection, visTypeTimeseries, indexManagement } = plugins;

      const rollupSetup = (plugins.rollup as unknown) as RollupSetup;

      const initContext = ({
        config: rollupSetup.__legacy.config,
        logger: rollupSetup.__legacy.logger,
      } as unknown) as PluginInitializerContext;

      const rollupPluginInstance = plugin(initContext);

      rollupPluginInstance.setup(coreSetup, {
        usageCollection,
        visTypeTimeseries,
        indexManagement,
        __LEGACY: {
          plugins: {
            xpack_main: server.plugins.xpack_main,
            rollup: server.plugins[PLUGIN.ID],
          },
        },
      });
    },
  });
}
