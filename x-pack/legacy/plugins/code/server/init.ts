/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import crypto from 'crypto';
import { Server } from 'hapi';
import * as _ from 'lodash';
import { i18n } from '@kbn/i18n';

import { XPackMainPlugin } from '../../xpack_main/xpack_main';
import { Logger } from './log';
import { JAVA } from './lsp/language_servers';
import { fileRoute } from './routes/file';
import { installRoute } from './routes/install';
import { lspRoute, symbolByQnameRoute } from './routes/lsp';
import { repositoryRoute } from './routes/repository';
import { documentSearchRoute, repositorySearchRoute, symbolSearchRoute } from './routes/search';
import { setupRoute } from './routes/setup';
import { workspaceRoute } from './routes/workspace';
import { CodeServerRouter } from './security';
import { ServerOptions } from './server_options';
import { checkCodeNode, checkRoute } from './routes/check';
import { statusRoute } from './routes/status';
import { CodeServices } from './distributed/code_services';
import { LocalHandlerAdapter } from './distributed/local_handler_adapter';
import {
  GitServiceDefinition,
  WorkspaceDefinition,
  LspServiceDefinition,
  RepositoryServiceDefinition,
  SetupDefinition,
  GitServiceDefinitionOption,
  LspServiceDefinitionOption,
} from './distributed/apis';
import { CodeNodeAdapter } from './distributed/multinode/code_node_adapter';
import { NonCodeNodeAdapter } from './distributed/multinode/non_code_node_adapter';
import { initWorkers } from './init_workers';
import { initLocalService } from './init_local';
import { initEs } from './init_es';
import { initQueue } from './init_queue';
import { RepositoryIndexInitializerFactory, tryMigrateIndices } from './indexer';
import { RepositoryConfigController } from './repository_config_controller';

async function retryUntilAvailable<T>(
  func: () => Promise<T>,
  intervalMs: number,
  retries: number = Number.MAX_VALUE
): Promise<T> {
  const value = await func();
  if (value) {
    return value;
  } else {
    const promise = new Promise<T>(resolve => {
      const retry = () => {
        func().then(v => {
          if (v) {
            resolve(v);
          } else {
            retries--;
            if (retries > 0) {
              setTimeout(retry, intervalMs);
            } else {
              resolve(v);
            }
          }
        });
      };
      setTimeout(retry, intervalMs);
    });
    return await promise;
  }
}

export function init(server: Server, options: any) {
  if (!options.ui.enabled) {
    return;
  }

  const log = new Logger(server);
  const serverOptions = new ServerOptions(options, server.config());
  const xpackMainPlugin: XPackMainPlugin = server.plugins.xpack_main;
  xpackMainPlugin.registerFeature({
    id: 'code',
    name: i18n.translate('xpack.code.featureRegistry.codeFeatureName', {
      defaultMessage: 'Code',
    }),
    icon: 'codeApp',
    navLinkId: 'code',
    app: ['code', 'kibana'],
    catalogue: [], // TODO add catalogue here
    privileges: {
      all: {
        api: ['code_user', 'code_admin'],
        savedObject: {
          all: [],
          read: ['config'],
        },
        ui: ['show', 'user', 'admin'],
      },
      read: {
        api: ['code_user'],
        savedObject: {
          all: [],
          read: ['config'],
        },
        ui: ['show', 'user'],
      },
    },
  });

  // @ts-ignore
  const kbnServer = this.kbnServer;
  const codeServerRouter = new CodeServerRouter(server);

  kbnServer.ready().then(async () => {
    const codeNodeUrl = serverOptions.codeNodeUrl;
    const rndString = crypto.randomBytes(20).toString('hex');
    checkRoute(server, rndString);
    if (codeNodeUrl) {
      const checkResult = await retryUntilAvailable(
        async () => await checkCodeNode(codeNodeUrl, log, rndString),
        3000
      );
      if (checkResult.me) {
        const codeServices = new CodeServices(new CodeNodeAdapter(codeServerRouter, log));
        log.info('Initializing Code plugin as code-node.');
        await initCodeNode(server, serverOptions, codeServices, log);
      } else {
        await initNonCodeNode(codeNodeUrl, server, serverOptions, log);
      }
    } else {
      const codeServices = new CodeServices(new LocalHandlerAdapter());
      // codeNodeUrl not set, single node mode
      log.info('Initializing Code plugin as single-node.');
      initDevMode(server);
      await initCodeNode(server, serverOptions, codeServices, log);
    }
  });
}

async function initNonCodeNode(
  url: string,
  server: Server,
  serverOptions: ServerOptions,
  log: Logger
) {
  log.info(`Initializing Code plugin as non-code node, redirecting all code requests to ${url}`);
  const codeServices = new CodeServices(new NonCodeNodeAdapter(url, log));
  codeServices.registerHandler(GitServiceDefinition, null, GitServiceDefinitionOption);
  codeServices.registerHandler(RepositoryServiceDefinition, null);
  codeServices.registerHandler(LspServiceDefinition, null, LspServiceDefinitionOption);
  codeServices.registerHandler(WorkspaceDefinition, null);
  codeServices.registerHandler(SetupDefinition, null);
  const { repoConfigController, repoIndexInitializerFactory } = await initEs(server, log);
  initRoutes(
    server,
    serverOptions,
    codeServices,
    log,
    repoIndexInitializerFactory,
    repoConfigController
  );
}

async function initCodeNode(
  server: Server,
  serverOptions: ServerOptions,
  codeServices: CodeServices,
  log: Logger
) {
  const { esClient, repoConfigController, repoIndexInitializerFactory } = await initEs(server, log);

  const { queue } = initQueue(server, log, esClient);

  const { gitOps, lspService } = initLocalService(
    server,
    log,
    serverOptions,
    codeServices,
    esClient,
    repoConfigController
  );

  initWorkers(server, log, esClient, queue, lspService, gitOps, serverOptions, codeServices);

  // Execute index version checking and try to migrate index data if necessary.
  await tryMigrateIndices(esClient, log);

  initRoutes(
    server,
    serverOptions,
    codeServices,
    log,
    repoIndexInitializerFactory,
    repoConfigController
  );
}

function initRoutes(
  server: Server,
  serverOptions: ServerOptions,
  codeServices: CodeServices,
  log: Logger,
  repoIndexInitializerFactory: RepositoryIndexInitializerFactory,
  repoConfigController: RepositoryConfigController
) {
  const codeServerRouter = new CodeServerRouter(server);
  repositoryRoute(
    codeServerRouter,
    codeServices,
    repoIndexInitializerFactory,
    repoConfigController,
    serverOptions
  );
  repositorySearchRoute(codeServerRouter, log);
  documentSearchRoute(codeServerRouter, log);
  symbolSearchRoute(codeServerRouter, log);
  fileRoute(codeServerRouter, codeServices);
  workspaceRoute(codeServerRouter, serverOptions, codeServices);
  symbolByQnameRoute(codeServerRouter, log);
  installRoute(codeServerRouter, codeServices);
  lspRoute(codeServerRouter, codeServices, serverOptions);
  setupRoute(codeServerRouter, codeServices);
  statusRoute(codeServerRouter, codeServices);
}

function initDevMode(server: Server) {
  // @ts-ignore
  const devMode: boolean = server.config().get('env.dev');
  server.injectUiAppVars('code', () => ({
    enableLangserversDeveloping: devMode,
  }));
  // Enable the developing language servers in development mode.
  if (devMode) {
    JAVA.downloadUrl = _.partialRight(JAVA!.downloadUrl!, devMode);
  }
}
