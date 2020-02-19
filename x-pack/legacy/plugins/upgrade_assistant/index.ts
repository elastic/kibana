/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';
import { Legacy } from 'kibana';
import mappings from './mappings.json';

export function upgradeAssistant(kibana: any) {
  const config: Legacy.PluginSpecOptions = {
    id: 'upgrade_assistant',
    configPrefix: 'xpack.upgrade_assistant',
    uiExports: {
      // @ts-ignore
      savedObjectSchemas: {
        'upgrade-assistant-reindex-operation': {
          isNamespaceAgnostic: true,
        },
        'upgrade-assistant-telemetry': {
          isNamespaceAgnostic: true,
        },
      },
      mappings,
    },

    config() {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init(server: Legacy.Server) {
      // Add server routes and initialize the plugin here
      const instance = plugin({} as any);

      const { usageCollection, cloud } = server.newPlatform.setup.plugins;
      instance.setup(server.newPlatform.setup.core, {
        usageCollection,
        cloud: cloud as CloudSetup,
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
          },
        },
      });
    },
  };
  return new kibana.Plugin(config);
}
