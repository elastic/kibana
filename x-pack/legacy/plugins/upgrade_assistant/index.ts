/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import Joi from 'joi';
import { Legacy } from 'kibana';
import { resolve } from 'path';
import { PluginSetupContract as UsageCollection } from 'src/plugins/usage_collection/server';
import mappings from './mappings.json';
import { plugin } from './server/np_ready';

export function upgradeAssistant(kibana: any) {
  const publicSrc = resolve(__dirname, 'public');
  const npSrc = resolve(publicSrc, 'np_ready');

  const config: Legacy.PluginSpecOptions = {
    id: 'upgrade_assistant',
    configPrefix: 'xpack.upgrade_assistant',
    require: ['elasticsearch'],
    uiExports: {
      // @ts-ignore
      managementSections: ['plugins/upgrade_assistant'],
      savedObjectSchemas: {
        'upgrade-assistant-reindex-operation': {
          isNamespaceAgnostic: true,
        },
        'upgrade-assistant-telemetry': {
          isNamespaceAgnostic: true,
        },
      },
      styleSheetPaths: resolve(npSrc, 'application/index.scss'),
      mappings,
    },
    publicDir: publicSrc,

    config() {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init(server: Legacy.Server) {
      // Add server routes and initialize the plugin here
      const instance = plugin({} as any);
      instance.setup(server.newPlatform.setup.core, {
        usageCollection: server.newPlatform.setup.plugins.usageCollection as UsageCollection,
        __LEGACY: {
          // Legacy objects
          events: server.events,
          savedObjects: server.savedObjects,

          // Legacy functions
          log: server.log.bind(server),

          // Legacy plugins
          plugins: {
            elasticsearch: server.plugins.elasticsearch,
            xpack_main: server.plugins.xpack_main,
            cloud: {
              config: {
                isCloudEnabled: _.get(server.plugins, 'cloud.config.isCloudEnabled', false),
              },
            },
          },
        },
      });
    },
  };
  return new kibana.Plugin(config);
}
