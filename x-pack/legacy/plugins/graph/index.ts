/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { i18n } from '@kbn/i18n';

// @ts-ignore
import migrations from './migrations';
import mappings from './mappings.json';
import { LegacyPluginInitializer } from '../../../../src/legacy/plugin_discovery/types';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/utils';

export const graph: LegacyPluginInitializer = kibana => {
  return new kibana.Plugin({
    id: 'graph',
    configPrefix: 'xpack.graph',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    uiExports: {
      app: {
        title: 'Graph',
        order: 9000,
        icon: 'plugins/graph/icon.png',
        euiIconType: 'graphApp',
        main: 'plugins/graph/index',
        category: DEFAULT_APP_CATEGORIES.analyze,
      },
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      mappings,
      migrations,
    },

    config(Joi: any) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        canEditDrillDownUrls: Joi.boolean().default(true),
        savePolicy: Joi.string()
          .valid(['config', 'configAndDataWithConsent', 'configAndData', 'none'])
          .default('configAndData'),
      }).default();
    },

    init(server) {
      server.plugins.xpack_main.registerFeature({
        id: 'graph',
        name: i18n.translate('xpack.graph.featureRegistry.graphFeatureName', {
          defaultMessage: 'Graph',
        }),
        icon: 'graphApp',
        navLinkId: 'graph',
        app: ['graph', 'kibana'],
        catalogue: ['graph'],
        validLicenses: ['platinum', 'enterprise', 'trial'],
        privileges: {
          all: {
            savedObject: {
              all: ['graph-workspace'],
              read: ['index-pattern'],
            },
            ui: ['save', 'delete'],
          },
          read: {
            savedObject: {
              all: [],
              read: ['index-pattern', 'graph-workspace'],
            },
            ui: [],
          },
        },
      });
    },
  });
};
