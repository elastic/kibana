/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Server } from 'hapi';
import { resolve } from 'path';
import { PluginInitializerContext } from '../../../../src/core/server';
import { LegacyPluginInitializer } from '../../../../src/legacy/types';
import mappings from './mappings.json';
import { plugin } from './server/new-platform';

export const apm: LegacyPluginInitializer = kibana => {
  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch', 'xpack_main', 'apm_oss'],
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
      home: ['plugins/apm/register_feature'],

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
      hacks: ['plugins/apm/hacks/toggle_app_link_in_nav'],
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

        // buckets
        minimumBucketSize: Joi.number().default(15),
        bucketTargetCount: Joi.number().default(15),

        // index patterns
        autocreateApmIndexPattern: Joi.boolean().default(true),

        // service map
        serviceMapEnabled: Joi.boolean().default(false)
      }).default();
    },

    // TODO: get proper types
    init(server: Server) {
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

      const initializerContext = {} as PluginInitializerContext;
      const legacySetup = {
        server
      };
      plugin(initializerContext).setup(
        server.newPlatform.setup.core,
        legacySetup
      );
    }
  });
};
