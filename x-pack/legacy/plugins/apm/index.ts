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
import mappings from './mappings.json';
import { makeApmUsageCollector } from './server/lib/apm_telemetry';
import { initializeServiceMaps } from './server/lib/service_map/initialize_service_maps';

export const apm: LegacyPluginInitializer = kibana => {
  return new kibana.Plugin({
    require: [
      'kibana',
      'elasticsearch',
      'xpack_main',
      'apm_oss',
      'task_manager'
    ],
    id: 'apm',
    configPrefix: 'xpack.apm',
    publicDir: resolve(__dirname, 'public'),

    uiExports: {
      app: {
        title: 'APM',
        description: i18n.translate('xpack.apm.apmForESDescription', {
          defaultMessage: 'APM for the Elastic Stack'
        }),
        main: 'plugins/apm/index',
        icon: 'plugins/apm/icon.svg',
        euiIconType: 'apmApp',
        order: 8100
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
          apmServiceMapEnabled: config.get('xpack.apm.serviceMapEnabled')
        };
      },
      savedObjectSchemas: {
        'apm-services-telemetry': {
          isNamespaceAgnostic: true
        },
        'apm-indices': {
          isNamespaceAgnostic: true
        }
      },
      mappings
    },

    // TODO: get proper types
    config(Joi: any) {
      return Joi.object({
        // display menu item
        ui: Joi.object({
          enabled: Joi.boolean().default(true),
          transactionGroupBucketSize: Joi.number().default(100),
          maxTraceItems: Joi.number().default(1000)
        }).default(),

        // enable plugin
        enabled: Joi.boolean().default(true),

        // index patterns
        autocreateApmIndexPattern: Joi.boolean().default(true),

        // service map

        serviceMapEnabled: Joi.boolean().default(false),
        serviceMapIndexPattern: Joi.string().default('apm-*'),
        serviceMapDestinationIndex: Joi.string(),
        serviceMapDestinationPipeline: Joi.string()
      }).default();
    },

    // TODO: get proper types
    init(server: Server) {
      const config = server.config();

      server.plugins.xpack_main.registerFeature({
        id: 'apm',
        name: i18n.translate('xpack.apm.featureRegistry.apmFeatureName', {
          defaultMessage: 'APM'
        }),
        icon: 'apmApp',
        navLinkId: 'apm',
        app: ['apm', 'kibana'],
        catalogue: ['apm'],
        privileges: {
          all: {
            api: ['apm', 'apm_write'],
            catalogue: ['apm'],
            savedObject: {
              all: [],
              read: []
            },
            ui: ['show', 'save']
          },
          read: {
            api: ['apm'],
            catalogue: ['apm'],
            savedObject: {
              all: [],
              read: []
            },
            ui: ['show']
          }
        }
      });
      const { usageCollection } = server.newPlatform.setup.plugins;
      makeApmUsageCollector(usageCollection, server);
      const apmPlugin = server.newPlatform.setup.plugins
        .apm as APMPluginContract;

      apmPlugin.registerLegacyAPI({ server });

      if (config.get('xpack.apm.serviceMapEnabled')) {
        initializeServiceMaps(server).catch(error => {
          throw error;
        });
      }
    }
  });
};
