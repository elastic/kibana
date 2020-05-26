/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Server } from 'hapi';
import { resolve } from 'path';
import { APMPluginContract } from '../../../plugins/apm/server';
import { LegacyPluginInitializer } from '../../../../src/legacy/types';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/utils';
import mappings from './mappings.json';

export const apm: LegacyPluginInitializer = (kibana) => {
  return new kibana.Plugin({
    require: [
      'kibana',
      'elasticsearch',
      'xpack_main',
      'apm_oss',
      'task_manager',
    ],
    id: 'apm',
    configPrefix: 'xpack.apm',
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      app: {
        title: 'APM',
        description: i18n.translate('xpack.apm.apmForESDescription', {
          defaultMessage: 'APM for the Elastic Stack',
        }),
        main: 'plugins/apm/index',
        icon: 'plugins/apm/icon.svg',
        euiIconType: 'apmApp',
        order: 8100,
        category: DEFAULT_APP_CATEGORIES.observability,
      },
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      home: ['plugins/apm/legacy_register_feature'],

      // TODO: get proper types
      injectDefaultVars(server: Server) {
        const config = server.config();
        return {
          apmUiEnabled: config.get('xpack.apm.ui.enabled'),
          // TODO: rename to apm_oss.indexPatternTitle in 7.0 (breaking change)
          apmIndexPatternTitle: config.get('apm_oss.indexPattern'),
          apmServiceMapEnabled: config.get('xpack.apm.serviceMapEnabled'),
        };
      },
      savedObjectSchemas: {
        'apm-services-telemetry': {
          isNamespaceAgnostic: true,
        },
        'apm-indices': {
          isNamespaceAgnostic: true,
        },
      },
      mappings,
    },

    // TODO: get proper types
    config(Joi: any) {
      return Joi.object({
        // display menu item
        ui: Joi.object({
          enabled: Joi.boolean().default(true),
          transactionGroupBucketSize: Joi.number().default(100),
          maxTraceItems: Joi.number().default(1000),
        }).default(),

        // enable plugin
        enabled: Joi.boolean().default(true),

        // index patterns
        autocreateApmIndexPattern: Joi.boolean().default(true),

        // service map
        serviceMapEnabled: Joi.boolean().default(true),
        serviceMapFingerprintBucketSize: Joi.number().default(100),
        serviceMapTraceIdBucketSize: Joi.number().default(65),
        serviceMapFingerprintGlobalBucketSize: Joi.number().default(1000),
        serviceMapTraceIdGlobalBucketSize: Joi.number().default(6),
        serviceMapMaxTracesPerRequest: Joi.number().default(50),

        // telemetry
        telemetryCollectionEnabled: Joi.boolean().default(true),
      }).default();
    },

    // TODO: get proper types
    init(server: Server) {
      server.plugins.xpack_main.registerFeature({
        id: 'apm',
        name: i18n.translate('xpack.apm.featureRegistry.apmFeatureName', {
          defaultMessage: 'APM',
        }),
        order: 900,
        icon: 'apmApp',
        navLinkId: 'apm',
        app: ['apm', 'kibana'],
        catalogue: ['apm'],
        // see x-pack/plugins/features/common/feature_kibana_privileges.ts
        privileges: {
          all: {
            app: ['apm', 'kibana'],
            api: [
              'apm',
              'apm_write',
              'actions-read',
              'actions-all',
              'alerting-read',
              'alerting-all',
            ],
            catalogue: ['apm'],
            savedObject: {
              all: ['alert', 'action', 'action_task_params'],
              read: [],
            },
            ui: [
              'show',
              'save',
              'alerting:show',
              'actions:show',
              'alerting:save',
              'actions:save',
              'alerting:delete',
              'actions:delete',
            ],
          },
          read: {
            app: ['apm', 'kibana'],
            api: [
              'apm',
              'actions-read',
              'actions-all',
              'alerting-read',
              'alerting-all',
            ],
            catalogue: ['apm'],
            savedObject: {
              all: ['alert', 'action', 'action_task_params'],
              read: [],
            },
            ui: [
              'show',
              'alerting:show',
              'actions:show',
              'alerting:save',
              'actions:save',
              'alerting:delete',
              'actions:delete',
            ],
          },
        },
      });
      const apmPlugin = server.newPlatform.setup.plugins
        .apm as APMPluginContract;

      apmPlugin.registerLegacyAPI({
        server,
      });
    },
  });
};
