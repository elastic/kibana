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
// import { registerRoutes } from './routes';

export class CodePlugin {
  private isCodeNode = false;

  private gitOps: GitOperations;
  private queue: Esqueue;
  private log: Logger;
  private serverOptions: ServerOptions;
  private indexScheduler: IndexScheduler;
  private updateScheduler: UpdateScheduler;

  constructor(initializerContext: PluginInitializerContext) {
    // TODO: instantiate these objects correctly
    this.gitOps = {} as GitOperations;
    this.queue = {} as Esqueue;
    this.log = {} as Logger;
    this.serverOptions = {} as ServerOptions;
    this.indexScheduler = {} as IndexScheduler;
    this.updateScheduler = {} as UpdateScheduler;
  }

  // TODO: remove the options param
  public setup(core: CoreSetup, options: any) {
    // called when plugin is setting up
    // move all the code in init.ts in here.
    // registerRoutes(core);

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

  // Assume this runs after all the components of kibana
  // has been initialized.
  // TODO: Problem here, CodeStart will not have the register route api.
  // Let's make it CoreSetup as the param first.
  //    public start(core: CoreStart)
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
        await this.initCodeNode(core, this.serverOptions, this.log);
      } else {
        await this.initNonCodeNode(codeNodeUrl, core, this.log);
      }
    } else {
      // codeNodeUrl not set, single node mode
      await this.initCodeNode(core, this.serverOptions, this.log);
    }
  }

  public stop() {
    if (this.isCodeNode) {
      this.gitOps.cleanAllRepo();
      this.indexScheduler.stop();
      this.updateScheduler.stop();
      this.queue.destroy();
    }
    // called when plugin is torn down, aka window.onbeforeunload
  }

  private async initNonCodeNode(url: string, core: CoreSetup, log: Logger) {
    const { server } = core.http as any;
    log.info(`Initializing Code plugin as non-code node, redirecting all code requests to ${url}`);
    redirectRoute(server, url, log);
  }

  private async initCodeNode(core: CoreSetup, serverOptions: ServerOptions, log: Logger) {
    const { server } = core.http as any;

    // wait until elasticsearch is ready
    // @ts-ignore
    await server.plugins.elasticsearch.waitUntilReady();

    log.info('Initializing Code plugin as code-node.');
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
    const gitOps = new GitOperations(serverOptions.repoPath);

    const installManager = new InstallManager(server, serverOptions);
    const lspService = new LspService(
      '127.0.0.1',
      serverOptions,
      gitOps,
      esClient,
      installManager,
      new ServerLoggerFactory(server),
      repoConfigController
    );
    server.events.on('stop', async () => {
      log.debug('shutdown lsp process');
      await lspService.shutdown();
    });
    // Initialize indexing factories.
    const lspIndexerFactory = new LspIndexerFactory(
      lspService,
      serverOptions,
      gitOps,
      esClient,
      this.log
    );

    const repoIndexInitializerFactory = new RepositoryIndexInitializerFactory(esClient, log);

    // Initialize queue worker cancellation service.
    const cancellationService = new CancellationSerivce();

    // Execute index version checking and try to migrate index data if necessary.
    await tryMigrateIndices(esClient, log);

    // Initialize queue.
    const queue = new Esqueue(queueIndex, {
      client: esClient,
      timeout: queueTimeoutMs,
    });
    const indexWorker = new IndexWorker(
      queue,
      log,
      esClient,
      [lspIndexerFactory],
      gitOps,
      cancellationService
    ).bind();

    const repoServiceFactory: RepositoryServiceFactory = new RepositoryServiceFactory();

    const cloneWorker = new CloneWorker(
      queue,
      log,
      esClient,
      serverOptions,
      gitOps,
      indexWorker,
      repoServiceFactory,
      cancellationService
    ).bind();
    const deleteWorker = new DeleteWorker(
      queue,
      log,
      esClient,
      serverOptions,
      gitOps,
      cancellationService,
      lspService,
      repoServiceFactory
    ).bind();
    const updateWorker = new UpdateWorker(
      queue,
      log,
      esClient,
      serverOptions,
      gitOps,
      repoServiceFactory,
      cancellationService
    ).bind();

    // Initialize schedulers.
    const cloneScheduler = new CloneScheduler(cloneWorker, serverOptions, esClient, log);
    const updateScheduler = new UpdateScheduler(updateWorker, serverOptions, esClient, log);
    const indexScheduler = new IndexScheduler(indexWorker, serverOptions, esClient, log);
    updateScheduler.start();
    indexScheduler.start();

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
    repositorySearchRoute(codeServerRouter, log);
    documentSearchRoute(codeServerRouter, log);
    symbolSearchRoute(codeServerRouter, log);
    fileRoute(codeServerRouter, gitOps);
    workspaceRoute(codeServerRouter, serverOptions, gitOps);
    symbolByQnameRoute(codeServerRouter, log);
    installRoute(codeServerRouter, lspService);
    lspRoute(codeServerRouter, lspService, serverOptions);
    setupRoute(codeServerRouter);
    statusRoute(codeServerRouter, gitOps, lspService);
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
