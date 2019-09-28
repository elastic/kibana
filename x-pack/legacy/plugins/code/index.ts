/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestQuery, ResponseToolkit, RouteOptions, ServerRoute } from 'hapi';
import { Legacy } from 'kibana';
import { resolve } from 'path';
import { CoreSetup } from 'src/core/server';

import { APP_TITLE } from './common/constants';
import { codePlugin } from './server';

export type RequestFacade = Legacy.Request;
export type RequestQueryFacade = RequestQuery;
export type ResponseToolkitFacade = ResponseToolkit;
export type RouteOptionsFacade = RouteOptions;
export type ServerFacade = Legacy.Server;
export type ServerRouteFacade = ServerRoute;

export const code = (kibana: any) =>
  new kibana.Plugin({
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    id: 'code',
    configPrefix: 'xpack.code',
    publicDir: resolve(__dirname, 'public'),

    uiExports: {
      app: {
        title: APP_TITLE,
        main: 'plugins/code/index',
        euiIconType: 'codeApp',
      },
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      injectDefaultVars(server: ServerFacade) {
        const config = server.config();
        return {
          codeUiEnabled: config.get('xpack.code.ui.enabled'),
        };
      },
      hacks: ['plugins/code/hacks/toggle_app_link_in_nav'],
    },
    async init(server: ServerFacade) {
      // @ts-ignore
      const initializerContext = server.newPlatform.setup.plugins.code;
      if (!initializerContext.config.ui.enabled) {
        return;
      }

      const coreSetup = ({
        http: { server },
      } as any) as CoreSetup;

      // Set up with the new platform plugin lifecycle API.
      const plugin = codePlugin(initializerContext);
      plugin.setup(coreSetup);

      // @ts-ignore
      const kbnServer = this.kbnServer;
      kbnServer.ready().then(async () => {
        await plugin.start(coreSetup);
      });

      server.events.on('stop', async () => {
        await plugin.stop();
      });
    },
  });
