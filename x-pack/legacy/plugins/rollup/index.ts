/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { i18n } from '@kbn/i18n';
import { Legacy } from 'kibana';
import { PLUGIN, CONFIG_ROLLUPS } from './common';
import { plugin } from './server';

// import { registerLicenseChecker } from './server/lib/register_license_checker';
// import { rollupDataEnricher } from './rollup_data_enricher';
// import { registerRollupSearchStrategy } from './server/lib/search_strategies';
// import {
//   registerIndicesRoute,
//   registerFieldsForWildcardRoute,
//   registerSearchRoute,
//   registerJobsRoute,
// } from './server/routes/api';
// import { registerRollupUsageCollector } from './server/usage';

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
      plugin({} as any).setup(server.newPlatform.setup.core, {
        __LEGACY: {
          route: server.route.bind(server),
          plugins: {
            xpack_main: server.plugins.xpack_main,
            rollup: server.plugins[PLUGIN.ID],
          },
        },
      });

      // const { usageCollection } = server.newPlatform.setup.plugins;
      // registerLicenseChecker(server);
      // registerIndicesRoute(server);
      // registerFieldsForWildcardRoute(server);
      // registerSearchRoute(server);
      // registerJobsRoute(server);
      // registerRollupUsageCollector(usageCollection, server);
      // if (
      //   server.plugins.index_management &&
      //   server.plugins.index_management.addIndexManagementDataEnricher
      // ) {
      //   server.plugins.index_management.addIndexManagementDataEnricher(rollupDataEnricher);
      // }
      // registerRollupSearchStrategy(this.kbnServer, server);
    },
  });
}
