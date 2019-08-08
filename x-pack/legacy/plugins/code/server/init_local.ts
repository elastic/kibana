/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { ServerOptions } from './server_options';
import { CodeServices } from './distributed/code_services';
import { EsClient } from './lib/esqueue';
import { RepositoryConfigController } from './repository_config_controller';
import { GitOperations } from './git_operations';
import { Logger } from './log';
import {
  getGitServiceHandler,
  getLspServiceHandler,
  getWorkspaceHandler,
  GitServiceDefinition,
  GitServiceDefinitionOption,
  LspServiceDefinition,
  LspServiceDefinitionOption,
  SetupDefinition,
  setupServiceHandler,
  WorkspaceDefinition,
} from './distributed/apis';
import { InstallManager } from './lsp/install_manager';
import { LspService } from './lsp/lsp_service';
import { ServerLoggerFactory } from './utils/server_logger_factory';

export function initLocalService(
  server: Server,
  log: Logger,
  serverOptions: ServerOptions,
  codeServices: CodeServices,
  esClient: EsClient,
  repoConfigController: RepositoryConfigController
) {
  // Initialize git operations
  const gitOps = new GitOperations(serverOptions.repoPath);
  codeServices.registerHandler(
    GitServiceDefinition,
    getGitServiceHandler(gitOps),
    GitServiceDefinitionOption
  );

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
    await gitOps.cleanAllRepo();
  });
  codeServices.registerHandler(
    LspServiceDefinition,
    getLspServiceHandler(lspService),
    LspServiceDefinitionOption
  );
  codeServices.registerHandler(
    WorkspaceDefinition,
    getWorkspaceHandler(server, lspService.workspaceHandler)
  );
  codeServices.registerHandler(SetupDefinition, setupServiceHandler);

  return { gitOps, lspService, installManager };
}
