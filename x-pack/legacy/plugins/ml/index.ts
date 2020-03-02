/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { i18n } from '@kbn/i18n';
import { Server } from 'src/legacy/server/kbn_server';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/utils';
// @ts-ignore: could not find declaration file for module
import { mirrorPluginStatus } from '../../server/lib/mirror_plugin_status';
// @ts-ignore: could not find declaration file for module
import mappings from './mappings';

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
        category: DEFAULT_APP_CATEGORIES.analyze,
      },
      styleSheetPaths: resolve(__dirname, 'public/application/index.scss'),
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

    async init(server: Server) {
      mirrorPluginStatus(server.plugins.xpack_main, this);
    },
  });
};
