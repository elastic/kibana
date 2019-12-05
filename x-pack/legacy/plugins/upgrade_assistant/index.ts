/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import Joi from 'joi';
import { Legacy } from 'kibana';
import { resolve } from 'path';
import mappings from './mappings.json';
import { plugin } from './server/np_ready';
import { CloudSetup } from '../../../plugins/cloud/server';

export function upgradeAssistant(kibana: any) {
  const publicSrc = resolve(__dirname, 'public');
  const npSrc = resolve(publicSrc, 'np_ready');

  const config: Legacy.PluginSpecOptions = {
    id: 'upgrade_assistant',
    configPrefix: 'xpack.upgrade_assistant',
    require: ['elasticsearch', 'xpack_main'],
    uiExports: {
      // @ts-ignore
      managementSections: ['plugins/upgrade_assistant/legacy'],
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
          route: server.route.bind(server),

          // Legacy plugins
          plugins: {
            apm_oss: server.plugins.apm_oss,
            elasticsearch: server.plugins.elasticsearch,
            xpack_main: server.plugins.xpack_main,
          },
        } as any,
      });
    },
  };
  return new kibana.Plugin(config);
}
