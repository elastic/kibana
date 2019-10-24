/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestQuery, ResponseToolkit, RouteOptions, ServerRoute } from 'hapi';
import JoiNamespace from 'joi';
import { Legacy } from 'kibana';
import { resolve } from 'path';
import { CoreSetup } from 'src/core/server';

import { APP_TITLE, SAVED_OBJ_REPO } from './common/constants';
import { codePlugin } from './server';
import { PluginSetupContract } from '../../../plugins/code/server';
import { mappings } from './mappings';

export type RequestFacade = Legacy.Request;
export type RequestQueryFacade = RequestQuery;
export type ResponseToolkitFacade = ResponseToolkit;
export type RouteOptionsFacade = RouteOptions;
export type ServerFacade = Legacy.Server;
export type ServerRouteFacade = ServerRoute;

export const code = (kibana: any) =>
  new kibana.Plugin({
    require: ['kibana', 'elasticsearch'],
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
          codeIntegrationsEnabled: config.get('xpack.code.integrations.enabled'),
          codeDiffPageEnabled: config.get('xpack.code.diffPage.enabled'),
        };
      },
      hacks: ['plugins/code/hacks/toggle_app_link_in_nav'],
      savedObjectSchemas: {
        [SAVED_OBJ_REPO]: {
          isNamespaceAgnostic: false,
        },
      },
      mappings,
    },
    config(Joi: typeof JoiNamespace) {
      return Joi.object({
        // Still keep this config item here for the injectDefaultVars
        // in line 40 here.
        ui: Joi.object({
          enabled: Joi.boolean().default(true),
        }).default(),
        integrations: Joi.object({
          enabled: Joi.boolean().default(false),
        }).default(),
        diffPage: Joi.object({
          enabled: Joi.boolean().default(false),
        }).default(),
        enabled: Joi.boolean().default(true),
      })
        .default()
        .unknown(true);
    },
    async init(server: ServerFacade) {
      const initializerContext = server.newPlatform.setup.plugins.code as PluginSetupContract;
      if (!initializerContext.legacy.config.ui.enabled) {
        return;
      }

      const coreSetup = ({
        http: { server },
      } as any) as CoreSetup;

      // Set up with the new platform plugin lifecycle API.
      const plugin = codePlugin(initializerContext);
      await plugin.setup(coreSetup, initializerContext.legacy.http);

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
