/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestQuery, ResponseToolkit, RouteOptions, ServerRoute } from 'hapi';
import JoiNamespace from 'joi';
import { Legacy } from 'kibana';
import moment from 'moment';
import { resolve } from 'path';

import { CoreSetup, PluginInitializerContext } from 'src/core/server';
import { APP_TITLE } from './common/constants';
import { codePlugin } from './server';
import { DEFAULT_WATERMARK_LOW_PERCENTAGE } from './server/disk_watermark';
import { LanguageServers, LanguageServersDeveloping } from './server/lsp/language_servers';

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
    config(Joi: typeof JoiNamespace) {
      const langSwitches: any = {};
      LanguageServers.forEach(lang => {
        langSwitches[lang.name] = Joi.object({
          enabled: Joi.boolean().default(true),
        });
      });
      LanguageServersDeveloping.forEach(lang => {
        langSwitches[lang.name] = Joi.object({
          enabled: Joi.boolean().default(false),
        });
      });
      return Joi.object({
        ui: Joi.object({
          enabled: Joi.boolean().default(true),
        }).default(),
        enabled: Joi.boolean().default(true),
        queueIndex: Joi.string().default('.code_internal-worker-queue'),
        // 1 hour by default.
        queueTimeoutMs: Joi.number().default(moment.duration(1, 'hour').asMilliseconds()),
        // The frequency which update scheduler executes. 1 minute by default.
        updateFrequencyMs: Joi.number().default(moment.duration(1, 'minute').asMilliseconds()),
        // The frequency which index scheduler executes. 1 day by default.
        indexFrequencyMs: Joi.number().default(moment.duration(1, 'day').asMilliseconds()),
        // The frequency which each repo tries to update. 5 minutes by default.
        updateRepoFrequencyMs: Joi.number().default(moment.duration(5, 'minute').asMilliseconds()),
        // The frequency which each repo tries to index. 1 day by default.
        indexRepoFrequencyMs: Joi.number().default(moment.duration(1, 'day').asMilliseconds()),
        // whether we want to show more logs
        verbose: Joi.boolean().default(false),
        lsp: Joi.object({
          ...langSwitches,
          // timeout of a request
          requestTimeoutMs: Joi.number().default(moment.duration(10, 'second').asMilliseconds()),
          // if we want the language server run in seperately
          detach: Joi.boolean().default(false),
          // enable oom_score_adj on linux
          oomScoreAdj: Joi.boolean().default(true),
        }).default(),
        repos: Joi.array().default([]),
        security: Joi.object({
          enableMavenImport: Joi.boolean().default(true),
          enableGradleImport: Joi.boolean().default(false),
          installGoDependency: Joi.boolean().default(false),
          installNodeDependency: Joi.boolean().default(true),
          gitHostWhitelist: Joi.array()
            .items(Joi.string())
            .default([
              'github.com',
              'gitlab.com',
              'bitbucket.org',
              'gitbox.apache.org',
              'eclipse.org',
            ]),
          gitProtocolWhitelist: Joi.array()
            .items(Joi.string())
            .default(['https', 'git', 'ssh']),
          enableGitCertCheck: Joi.boolean().default(true),
        }).default(),
        disk: Joi.object({
          thresholdEnabled: Joi.bool().default(true),
          watermarkLow: Joi.string().default(`${DEFAULT_WATERMARK_LOW_PERCENTAGE}%`),
        }).default(),
        maxWorkspace: Joi.number().default(5), // max workspace folder for each language server
        enableGlobalReference: Joi.boolean().default(false), // Global reference as optional feature for now
        enableCommitIndexing: Joi.boolean().default(false),
        codeNodeUrl: Joi.string(),
        clustering: Joi.object({
          enabled: Joi.bool().default(false),
          codeNodes: Joi.array()
            .items(
              Joi.object({
                id: Joi.string(),
                address: Joi.string(),
              })
            )
            .default([]),
        }).default(),
      }).default();
    },
    init(server: ServerFacade, options: any) {
      if (!options.ui.enabled) {
        return;
      }

      const initializerContext = {} as PluginInitializerContext;
      const coreSetup = ({
        http: { server },
      } as any) as CoreSetup;

      // Set up with the new platform plugin lifecycle API.
      const plugin = codePlugin(initializerContext);
      plugin.setup(coreSetup, options);

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
