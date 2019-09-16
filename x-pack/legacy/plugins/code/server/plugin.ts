/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import crypto from 'crypto';
import * as _ from 'lodash';
import { CoreSetup, PluginInitializerContext } from 'src/core/server';

import { XPackMainPlugin } from '../../xpack_main/xpack_main';
import { GitOperations } from './git_operations';
import { RepositoryIndexInitializerFactory, tryMigrateIndices } from './indexer';
import { Esqueue } from './lib/esqueue';
import { Logger } from './log';
import { JAVA } from './lsp/language_servers';
import { LspService } from './lsp/lsp_service';
import { RepositoryConfigController } from './repository_config_controller';
import { IndexScheduler, UpdateScheduler } from './scheduler';
import { CodeServerRouter } from './security';
import { ServerOptions } from './server_options';
import {
  checkCodeNode,
  checkRoute,
  commitSearchRoute,
  documentSearchRoute,
  fileRoute,
  installRoute,
  lspRoute,
  repositoryRoute,
  repositorySearchRoute,
  setupRoute,
  statusRoute,
  symbolByQnameRoute,
  symbolSearchRoute,
  workspaceRoute,
} from './routes';
import { CodeServices } from './distributed/code_services';
import { CodeNodeAdapter } from './distributed/multinode/code_node_adapter';
import { LocalHandlerAdapter } from './distributed/local_handler_adapter';
import { NonCodeNodeAdapter } from './distributed/multinode/non_code_node_adapter';
import {
  GitServiceDefinition,
  GitServiceDefinitionOption,
  LspServiceDefinition,
  LspServiceDefinitionOption,
  RepositoryServiceDefinition,
  SetupDefinition,
  WorkspaceDefinition,
} from './distributed/apis';
import { initEs } from './init_es';
import { initLocalService } from './init_local';
import { initQueue } from './init_queue';
import { initWorkers } from './init_workers';
import { ClusterNodeAdapter } from './distributed/cluster/cluster_node_adapter';
import { NodeRepositoriesService } from './distributed/cluster/node_repositories_service';

export class CodePlugin {
  private isCodeNode = false;

  private gitOps: GitOperations | null = null;
  private queue: Esqueue | null = null;
  private log: Logger;
  private serverOptions: ServerOptions;
  private indexScheduler: IndexScheduler | null = null;
  private updateScheduler: UpdateScheduler | null = null;
  private lspService: LspService | null = null;
  private codeServices: CodeServices | null = null;
  private nodeService: NodeRepositoriesService | null = null;

  constructor(initializerContext: PluginInitializerContext) {
    this.log = {} as Logger;
    this.serverOptions = {} as ServerOptions;
  }

  // TODO: options is not a valid param for the setup() api
  // of the new platform. Will need to pass through the configs
  // correctly in the new platform.
  public setup(core: CoreSetup, options: any) {
    const { server } = core.http as any;

    this.log = new Logger(server);
    this.serverOptions = new ServerOptions(options, server.config());

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
          excludeFromBasePrivileges: true,
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
  }

  // TODO: CodeStart will not have the register route api.
  // Let's make it CoreSetup as the param for now.
  public async start(core: CoreSetup) {
    // called after all plugins are set up
    const { server } = core.http as any;
    const codeServerRouter = new CodeServerRouter(server);
    const codeNodeUrl = this.serverOptions.codeNodeUrl;
    const rndString = crypto.randomBytes(20).toString('hex');
    checkRoute(server, rndString);
    if (this.serverOptions.clusterEnabled) {
      this.initDevMode(server);
      this.codeServices = await this.initClusterNode(server, codeServerRouter);
    } else if (codeNodeUrl) {
      const checkResult = await this.retryUntilAvailable(
        async () => await checkCodeNode(codeNodeUrl, this.log, rndString),
        5000
      );
      if (checkResult.me) {
        const codeServices = new CodeServices(new CodeNodeAdapter(codeServerRouter, this.log));
        this.log.info('Initializing Code plugin as code-node.');
        this.codeServices = await this.initCodeNode(server, codeServices);
      } else {
        this.codeServices = await this.initNonCodeNode(codeNodeUrl, core);
      }
    } else {
      const codeServices = new CodeServices(new LocalHandlerAdapter());
      // codeNodeUrl not set, single node mode
      this.log.info('Initializing Code plugin as single-node.');
      this.initDevMode(server);
      this.codeServices = await this.initCodeNode(server, codeServices);
    }
    await this.codeServices.start();
  }

  private async initClusterNode(server: any, codeServerRouter: CodeServerRouter) {
    this.log.info('Initializing Code plugin as cluster-node');
    const { esClient, repoConfigController, repoIndexInitializerFactory } = await initEs(
      server,
      this.log
    );
    const clusterNodeAdapter = new ClusterNodeAdapter(
      codeServerRouter,
      this.log,
      this.serverOptions,
      esClient
    );

    const codeServices = new CodeServices(clusterNodeAdapter);

    this.queue = initQueue(server, this.log, esClient);

    const { gitOps, lspService } = initLocalService(
      server,
      this.log,
      this.serverOptions,
      codeServices,
      esClient,
      repoConfigController
    );
    this.lspService = lspService;
    this.gitOps = gitOps;
    const { indexScheduler, updateScheduler, cloneWorker } = initWorkers(
      server,
      this.log,
      esClient,
      this.queue!,
      lspService,
      gitOps,
      this.serverOptions,
      codeServices
    );
    this.indexScheduler = indexScheduler;
    this.updateScheduler = updateScheduler;

    this.nodeService = new NodeRepositoriesService(
      this.log,
      clusterNodeAdapter.clusterService,
      clusterNodeAdapter.clusterMembershipService,
      cloneWorker
    );
    await this.nodeService.start();

    // Execute index version checking and try to migrate index data if necessary.
    await tryMigrateIndices(esClient, this.log);

    this.initRoutes(server, codeServices, repoIndexInitializerFactory, repoConfigController);

    return codeServices;
  }

  private async initCodeNode(server: any, codeServices: CodeServices) {
    this.isCodeNode = true;
    const { esClient, repoConfigController, repoIndexInitializerFactory } = await initEs(
      server,
      this.log
    );

    this.queue = initQueue(server, this.log, esClient);

    const { gitOps, lspService } = initLocalService(
      server,
      this.log,
      this.serverOptions,
      codeServices,
      esClient,
      repoConfigController
    );
    this.lspService = lspService;
    this.gitOps = gitOps;
    const { indexScheduler, updateScheduler } = initWorkers(
      server,
      this.log,
      esClient,
      this.queue!,
      lspService,
      gitOps,
      this.serverOptions,
      codeServices
    );
    this.indexScheduler = indexScheduler;
    this.updateScheduler = updateScheduler;

    // Execute index version checking and try to migrate index data if necessary.
    await tryMigrateIndices(esClient, this.log);

    this.initRoutes(server, codeServices, repoIndexInitializerFactory, repoConfigController);
    return codeServices;
  }

  public async stop() {
    if (this.isCodeNode) {
      if (this.gitOps) await this.gitOps.cleanAllRepo();
      if (this.indexScheduler) this.indexScheduler.stop();
      if (this.updateScheduler) this.updateScheduler.stop();
      if (this.queue) this.queue.destroy();
      if (this.lspService) await this.lspService.shutdown();
    }
    if (this.codeServices) {
      await this.codeServices.stop();
    }
    if (this.nodeService) {
      await this.nodeService.stop();
    }
  }

  private async initNonCodeNode(url: string, core: CoreSetup) {
    const { server } = core.http as any;
    this.log.info(
      `Initializing Code plugin as non-code node, redirecting all code requests to ${url}`
    );
    const codeServices = new CodeServices(new NonCodeNodeAdapter(url, this.log));
    codeServices.registerHandler(GitServiceDefinition, null, GitServiceDefinitionOption);
    codeServices.registerHandler(RepositoryServiceDefinition, null);
    codeServices.registerHandler(LspServiceDefinition, null, LspServiceDefinitionOption);
    codeServices.registerHandler(WorkspaceDefinition, null);
    codeServices.registerHandler(SetupDefinition, null);
    const { repoConfigController, repoIndexInitializerFactory } = await initEs(server, this.log);
    this.initRoutes(server, codeServices, repoIndexInitializerFactory, repoConfigController);
    return codeServices;
  }

  private async initRoutes(
    server: any,
    codeServices: CodeServices,
    repoIndexInitializerFactory: RepositoryIndexInitializerFactory,
    repoConfigController: RepositoryConfigController
  ) {
    const codeServerRouter = new CodeServerRouter(server);
    repositoryRoute(
      codeServerRouter,
      codeServices,
      repoIndexInitializerFactory,
      repoConfigController,
      this.serverOptions
    );
    repositorySearchRoute(codeServerRouter, this.log);
    if (this.serverOptions.enableCommitIndexing) {
      commitSearchRoute(codeServerRouter, this.log);
    }
    documentSearchRoute(codeServerRouter, this.log);
    symbolSearchRoute(codeServerRouter, this.log);
    fileRoute(codeServerRouter, codeServices);
    workspaceRoute(codeServerRouter, this.serverOptions, codeServices);
    symbolByQnameRoute(codeServerRouter, this.log);
    installRoute(codeServerRouter, codeServices);
    lspRoute(codeServerRouter, codeServices, this.serverOptions);
    setupRoute(codeServerRouter, codeServices);
    statusRoute(codeServerRouter, codeServices);
  }

  private async retryUntilAvailable<T>(
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

  private initDevMode(server: any) {
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
}
