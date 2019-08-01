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
import { LspIndexerFactory, RepositoryIndexInitializerFactory, tryMigrateIndices } from './indexer';
import { EsClient, Esqueue } from './lib/esqueue';
import { Logger } from './log';
import { InstallManager } from './lsp/install_manager';
import { JAVA } from './lsp/language_servers';
import { LspService } from './lsp/lsp_service';
import { CancellationSerivce, CloneWorker, DeleteWorker, IndexWorker, UpdateWorker } from './queue';
import { RepositoryConfigController } from './repository_config_controller';
import { RepositoryServiceFactory } from './repository_service_factory';
import { CloneScheduler, IndexScheduler, UpdateScheduler } from './scheduler';
import { CodeServerRouter } from './security';
import { ServerOptions } from './server_options';
import {
  checkCodeNode,
  checkRoute,
  documentSearchRoute,
  fileRoute,
  installRoute,
  lspRoute,
  redirectRoute,
  repositoryRoute,
  repositorySearchRoute,
  setupRoute,
  statusRoute,
  symbolByQnameRoute,
  symbolSearchRoute,
  workspaceRoute,
} from './routes';
import { EsClientWithInternalRequest } from './utils/esclient_with_internal_request';
import { ServerLoggerFactory } from './utils/server_logger_factory';

export class CodePlugin {
  private isCodeNode = false;

  private gitOps: GitOperations;
  private queue: Esqueue;
  private log: Logger;
  private serverOptions: ServerOptions;
  private indexScheduler: IndexScheduler;
  private updateScheduler: UpdateScheduler;
  private lspService: LspService;

  constructor(initializerContext: PluginInitializerContext) {
    this.gitOps = {} as GitOperations;
    this.queue = {} as Esqueue;
    this.log = {} as Logger;
    this.serverOptions = {} as ServerOptions;
    this.indexScheduler = {} as IndexScheduler;
    this.updateScheduler = {} as UpdateScheduler;
    this.lspService = {} as LspService;
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

    const codeNodeUrl = this.serverOptions.codeNodeUrl;
    const rndString = crypto.randomBytes(20).toString('hex');
    checkRoute(server, rndString);
    if (codeNodeUrl) {
      const checkResult = await this.retryUntilAvailable(
        async () => await checkCodeNode(codeNodeUrl, this.log, rndString),
        5000
      );
      if (checkResult.me) {
        this.isCodeNode = true;
        await this.initCodeNode(core, this.serverOptions);
      } else {
        await this.initNonCodeNode(codeNodeUrl, core);
      }
    } else {
      // codeNodeUrl not set, single node mode
      this.isCodeNode = true;
      await this.initCodeNode(core, this.serverOptions);
    }
  }

  public async stop() {
    if (this.isCodeNode) {
      this.gitOps.cleanAllRepo();
      this.indexScheduler.stop();
      this.updateScheduler.stop();
      this.queue.destroy();
      await this.lspService.shutdown();
    }
  }

  private async initNonCodeNode(url: string, core: CoreSetup) {
    const { server } = core.http as any;
    this.log.info(
      `Initializing Code plugin as non-code node, redirecting all code requests to ${url}`
    );
    redirectRoute(server, url, this.log);
  }

  private async initCodeNode(core: CoreSetup, serverOptions: ServerOptions) {
    const { server } = core.http as any;

    // wait until elasticsearch is ready
    // @ts-ignore
    await server.plugins.elasticsearch.waitUntilReady();

    this.log.info('Initializing Code plugin as code-node.');
    const queueIndex: string = server.config().get('xpack.code.queueIndex');
    const queueTimeoutMs: number = server.config().get('xpack.code.queueTimeoutMs');
    const devMode: boolean = server.config().get('env.dev');

    const esClient: EsClient = new EsClientWithInternalRequest(server);
    const repoConfigController = new RepositoryConfigController(esClient);

    server.injectUiAppVars('code', () => ({
      enableLangserversDeveloping: devMode,
    }));
    // Enable the developing language servers in development mode.
    if (devMode) {
      JAVA.downloadUrl = _.partialRight(JAVA!.downloadUrl!, devMode);
    }

    // Initialize git operations
    this.gitOps = new GitOperations(serverOptions.repoPath);

    const installManager = new InstallManager(server, serverOptions);
    this.lspService = new LspService(
      '127.0.0.1',
      serverOptions,
      this.gitOps,
      esClient,
      installManager,
      new ServerLoggerFactory(server),
      repoConfigController
    );

    // Initialize indexing factories.
    const lspIndexerFactory = new LspIndexerFactory(
      this.lspService,
      serverOptions,
      this.gitOps,
      esClient,
      this.log
    );

    const repoIndexInitializerFactory = new RepositoryIndexInitializerFactory(esClient, this.log);

    // Initialize queue worker cancellation service.
    const cancellationService = new CancellationSerivce();

    // Execute index version checking and try to migrate index data if necessary.
    await tryMigrateIndices(esClient, this.log);

    // Initialize queue.
    this.queue = new Esqueue(queueIndex, {
      client: esClient,
      timeout: queueTimeoutMs,
    });
    const indexWorker = new IndexWorker(
      this.queue,
      this.log,
      esClient,
      [lspIndexerFactory],
      this.gitOps,
      cancellationService
    ).bind();

    const repoServiceFactory: RepositoryServiceFactory = new RepositoryServiceFactory();

    const cloneWorker = new CloneWorker(
      this.queue,
      this.log,
      esClient,
      serverOptions,
      this.gitOps,
      indexWorker,
      repoServiceFactory,
      cancellationService
    ).bind();
    const deleteWorker = new DeleteWorker(
      this.queue,
      this.log,
      esClient,
      serverOptions,
      this.gitOps,
      cancellationService,
      this.lspService,
      repoServiceFactory
    ).bind();
    const updateWorker = new UpdateWorker(
      this.queue,
      this.log,
      esClient,
      serverOptions,
      this.gitOps,
      repoServiceFactory,
      cancellationService
    ).bind();

    // Initialize schedulers.
    const cloneScheduler = new CloneScheduler(cloneWorker, serverOptions, esClient, this.log);
    this.updateScheduler = new UpdateScheduler(updateWorker, serverOptions, esClient, this.log);
    this.indexScheduler = new IndexScheduler(indexWorker, serverOptions, esClient, this.log);
    this.updateScheduler.start();
    this.indexScheduler.start();
    // Check if the repository is local on the file system.
    // This should be executed once at the startup time of Kibana.
    cloneScheduler.schedule();

    const codeServerRouter = new CodeServerRouter(server);
    // Add server routes and initialize the plugin here
    repositoryRoute(
      codeServerRouter,
      cloneWorker,
      deleteWorker,
      indexWorker,
      repoIndexInitializerFactory,
      repoConfigController,
      serverOptions
    );
    repositorySearchRoute(codeServerRouter, this.log);
    documentSearchRoute(codeServerRouter, this.log);
    symbolSearchRoute(codeServerRouter, this.log);
    fileRoute(codeServerRouter, this.gitOps);
    workspaceRoute(codeServerRouter, serverOptions, this.gitOps);
    symbolByQnameRoute(codeServerRouter, this.log);
    installRoute(codeServerRouter, this.lspService);
    lspRoute(codeServerRouter, this.lspService, serverOptions);
    setupRoute(codeServerRouter);
    statusRoute(codeServerRouter, this.gitOps, this.lspService);
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
}
