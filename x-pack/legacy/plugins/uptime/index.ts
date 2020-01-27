/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { resolve } from 'path';
import { PluginInitializerContext } from 'src/core/server';
import { PLUGIN } from './common/constants';
import { KibanaServer, plugin } from './server';

export const uptime = (kibana: any) =>
  new kibana.Plugin({
    configPrefix: 'xpack.uptime',
    id: PLUGIN.ID,
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    uiExports: {
      app: {
        description: i18n.translate('xpack.uptime.pluginDescription', {
          defaultMessage: 'Uptime monitoring',
          description: 'The description text that will be shown to users in Kibana',
        }),
        icon: 'plugins/uptime/icons/heartbeat_white.svg',
        euiIconType: 'uptimeApp',
        title: i18n.translate('xpack.uptime.uptimeFeatureCatalogueTitle', {
          defaultMessage: 'Uptime',
        }),
        main: 'plugins/uptime/app',
        order: 8900,
        url: '/app/uptime#/',
      },
      home: ['plugins/uptime/register_feature'],
    },
    init(server: KibanaServer) {
      const initializerContext = {} as PluginInitializerContext;
      const { savedObjects } = server;
      const { xpack_main } = server.plugins;
      const { usageCollection } = server.newPlatform.setup.plugins;

      plugin(initializerContext).setup(
        {
          route: server.newPlatform.setup.core.http.createRouter(),
        },
        {
          savedObjects,
          usageCollection,
          xpack: xpack_main,
        }
      );
    },
  });
