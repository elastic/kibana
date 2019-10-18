/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import dedent from 'dedent';
import {
  XPACK_INFO_API_DEFAULT_POLL_FREQUENCY_IN_MILLIS
} from '../../server/lib/constants';
import { mirrorPluginStatus } from '../../server/lib/mirror_plugin_status';
import { replaceInjectedVars } from './server/lib/replace_injected_vars';
import { setupXPackMain } from './server/lib/setup_xpack_main';
import { xpackInfoRoute, settingsRoute } from './server/routes/api/v1';

import { has } from 'lodash';

export { callClusterFactory } from './server/lib/call_cluster_factory';
import { getStatsWithXpack } from './server/telemetry_collection';
import { telemetryCollectionManager } from '../../../../src/legacy/core_plugins/telemetry/server';

export const xpackMain = (kibana) => {
  return new kibana.Plugin({
    id: 'xpack_main',
    configPrefix: 'xpack.xpack_main',
    publicDir: resolve(__dirname, 'public'),
    require: ['elasticsearch'],

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        telemetry: Joi.object({
          config: Joi.string().default(),
          enabled: Joi.boolean().default(),
          url: Joi.string().default(),
        }).default(), // deprecated
        xpack_api_polling_frequency_millis: Joi.number().default(XPACK_INFO_API_DEFAULT_POLL_FREQUENCY_IN_MILLIS),
      }).default();
    },

    uiCapabilities(server) {
      const featuresPlugin = server.newPlatform.setup.plugins.features;
      if (!featuresPlugin) {
        throw new Error('New Platform XPack Features plugin is not available.');
      }
      return featuresPlugin.getFeaturesUICapabilities();
    },

    uiExports: {
      hacks: [
        'plugins/xpack_main/hacks/check_xpack_info_change',
      ],
      replaceInjectedVars,
      injectDefaultVars(server) {
        const config = server.config();

        return {
          activeSpace: null,
          spacesEnabled: config.get('xpack.spaces.enabled'),
        };
      },
      __webpackPluginProvider__(webpack) {
        return new webpack.BannerPlugin({
          banner: dedent`
            /*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements.
             * Licensed under the Elastic License; you may not use this file except in compliance with the Elastic License. */
          `,
          raw: true,
        });
      },
    },

    init(server) {
      const featuresPlugin = server.newPlatform.setup.plugins.features;
      if (!featuresPlugin) {
        throw new Error('New Platform XPack Features plugin is not available.');
      }

      mirrorPluginStatus(server.plugins.elasticsearch, this, 'yellow', 'red');

      telemetryCollectionManager.setStatsGetter(getStatsWithXpack, 'local_xpack', 1);

      featuresPlugin.registerLegacyAPI({
        xpackInfo: setupXPackMain(server),
        savedObjectTypes: server.savedObjects.types
      });

      // register routes
      xpackInfoRoute(server);
      settingsRoute(server, this.kbnServer);
    },
    deprecations: () => {
      function movedToTelemetry(configPath) {
        return (settings, log) => {
          if (has(settings, configPath)) {
            log(`Config key "xpack.xpack_main.${configPath}" is deprecated. Use "telemetry.${configPath}" instead.`);
          }
        };
      }
      return [
        movedToTelemetry('telemetry.config'),
        movedToTelemetry('telemetry.url'),
        movedToTelemetry('telemetry.enabled'),
      ];
    },
  });
};
