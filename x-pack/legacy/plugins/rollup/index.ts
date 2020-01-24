/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { i18n } from '@kbn/i18n';
import { Legacy } from 'kibana';
import { RollupSetup } from '../../../plugins/rollup/server';
import { PLUGIN, CONFIG_ROLLUPS } from './common';
import { plugin } from './server';
import { PluginInitializerContext } from '../siem/public/plugin';

// import { rollupDataEnricher } from './rollup_data_enricher';
// import { registerRollupSearchStrategy } from './server/lib/search_strategies';

export type ServerFacade = Legacy.Server;

export function rollup(kibana: any) {
  return new kibana.Plugin({
    id: PLUGIN.ID,
    configPrefix: 'xpack.rollup',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    uiExports: {
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      managementSections: ['plugins/rollup/crud_app'],
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
      indexManagement: [
        'plugins/rollup/index_pattern_creation',
        'plugins/rollup/index_pattern_list',
        'plugins/rollup/extend_index_management',
      ],
      visualize: ['plugins/rollup/visualize'],
      search: ['plugins/rollup/search'],
    },
    init(server: ServerFacade) {
      const { core, plugins } = server.newPlatform.setup;
      const { usageCollection } = plugins;

      const rollupSetup = (plugins.rollup as unknown) as RollupSetup;

      const initContext = ({
        config: rollupSetup.__legacy.config,
      } as unknown) as PluginInitializerContext;

      plugin(initContext).setup(core, {
        usageCollection,
        __LEGACY: {
          route: server.route.bind(server),
          plugins: {
            xpack_main: server.plugins.xpack_main,
            rollup: server.plugins[PLUGIN.ID],
          },
        },
      });

      // if (
      //   server.plugins.index_management &&
      //   server.plugins.index_management.addIndexManagementDataEnricher
      // ) {
      //   server.plugins.index_management.addIndexManagementDataEnricher(rollupDataEnricher);
      // }
    },
  });
}
