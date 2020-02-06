/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { i18n } from '@kbn/i18n';
import { PluginInitializerContext } from 'src/core/server';
import { RollupSetup } from '../../../plugins/rollup/server';
import { PLUGIN, CONFIG_ROLLUPS } from './common';
import { plugin } from './server';

export function rollup(kibana: any) {
  return new kibana.Plugin({
    id: PLUGIN.ID,
    configPrefix: 'xpack.rollup',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    uiExports: {
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      managementSections: ['plugins/rollup/legacy'],
      uiSettingDefaults: {
        [CONFIG_ROLLUPS]: {
          name: i18n.translate('xpack.rollupJobs.rollupIndexPatternsTitle', {
            defaultMessage: 'Enable rollup index patterns',
          }),
          value: true,
          description: i18n.translate('xpack.rollupJobs.rollupIndexPatternsDescription', {
            defaultMessage: `Enable the creation of index patterns which capture rollup indices,
              which in turn enable visualizations based on rollup data. Refresh
              the page to apply the changes.`,
          }),
          category: ['rollups'],
        },
      },
      indexManagement: ['plugins/rollup/legacy'],
      visualize: ['plugins/rollup/legacy'],
      search: ['plugins/rollup/legacy'],
    },
    init(server: any) {
      const { core: coreSetup, plugins } = server.newPlatform.setup;
      const { usageCollection, metrics } = plugins;

      const rollupSetup = (plugins.rollup as unknown) as RollupSetup;

      const initContext = ({
        config: rollupSetup.__legacy.config,
        logger: rollupSetup.__legacy.logger,
      } as unknown) as PluginInitializerContext;

      const rollupPluginInstance = plugin(initContext);

      rollupPluginInstance.setup(coreSetup, {
        usageCollection,
        metrics,
        __LEGACY: {
          plugins: {
            xpack_main: server.plugins.xpack_main,
            rollup: server.plugins[PLUGIN.ID],
            index_management: server.plugins.index_management,
          },
        },
      });
    },
  });
}
