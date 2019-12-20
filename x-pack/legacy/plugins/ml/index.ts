/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { i18n } from '@kbn/i18n';
import KbnServer, { Server } from 'src/legacy/server/kbn_server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { plugin } from './server/new_platform';
import { CloudSetup } from '../../../plugins/cloud/server';

import {
  MlInitializerContext,
  MlCoreSetup,
  MlHttpServiceSetup,
} from './server/new_platform/plugin';
// @ts-ignore: could not find declaration file for module
import mappings from './mappings';

interface MlServer extends Server {
  addAppLinksToSampleDataset: () => {};
}

enum AppCategory {
  analyze,
  observability,
  security,
  management,
}

export const ml = (kibana: any) => {
  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    id: 'ml',
    configPrefix: 'xpack.ml',
    publicDir: resolve(__dirname, 'public'),

    uiExports: {
      managementSections: ['plugins/ml/application/management'],
      app: {
        title: i18n.translate('xpack.ml.mlNavTitle', {
          defaultMessage: 'Machine Learning',
        }),
        description: i18n.translate('xpack.ml.mlNavDescription', {
          defaultMessage: 'Machine Learning for the Elastic Stack',
        }),
        icon: 'plugins/ml/application/ml.svg',
        euiIconType: 'machineLearningApp',
        main: 'plugins/ml/legacy',
        category: AppCategory.management,
      },
      styleSheetPaths: resolve(__dirname, 'public/application/index.scss'),
      hacks: ['plugins/ml/application/hacks/toggle_app_link_in_nav'],
      savedObjectSchemas: {
        'ml-telemetry': {
          isNamespaceAgnostic: true,
        },
      },
      mappings,
      home: ['plugins/ml/register_feature'],
      injectDefaultVars(server: any) {
        const config = server.config();
        return {
          mlEnabled: config.get('xpack.ml.enabled'),
        };
      },
    },

    async init(server: MlServer) {
      const kbnServer = (server as unknown) as KbnServer;

      const initializerContext = ({
        legacyConfig: server.config(),
        logger: {
          get(...contextParts: string[]) {
            return kbnServer.newPlatform.coreContext.logger.get('plugins', 'ml', ...contextParts);
          },
        },
      } as unknown) as MlInitializerContext;

      const mlHttpService: MlHttpServiceSetup = {
        ...kbnServer.newPlatform.setup.core.http,
        route: server.route.bind(server),
      };

      const core: MlCoreSetup = {
        injectUiAppVars: server.injectUiAppVars,
        http: mlHttpService,
        savedObjects: server.savedObjects,
      };
      const { usageCollection, cloud, home } = kbnServer.newPlatform.setup.plugins;
      const plugins = {
        elasticsearch: server.plugins.elasticsearch,
        security: server.plugins.security,
        xpackMain: server.plugins.xpack_main,
        spaces: server.plugins.spaces,
        home,
        usageCollection: usageCollection as UsageCollectionSetup,
        cloud: cloud as CloudSetup,
        ml: this,
      };

      plugin(initializerContext).setup(core, plugins);
    },
  });
};
