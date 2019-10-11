/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResponseMessage } from 'vscode-jsonrpc/lib/messages';

import { LanguageServerStatus } from '../../common/language_server';
import { GitOperations } from '../git_operations';
import { EsClient } from '../lib/esqueue';
import { RepositoryConfigController } from '../repository_config_controller';
import { ServerOptions } from '../server_options';
import { LoggerFactory } from '../utils/log_factory';
import { LanguageServerController } from './controller';
import { InstallManager } from './install_manager';
import { WorkspaceHandler } from './workspace_handler';

export class LspService {
  public readonly controller: LanguageServerController;
  public readonly workspaceHandler: WorkspaceHandler;
  constructor(
    targetHost: string,
    serverOptions: ServerOptions,
    gitOps: GitOperations,
    client: EsClient,
    installManager: InstallManager,
    loggerFactory: LoggerFactory,
    repoConfigController: RepositoryConfigController
  ) {
    this.workspaceHandler = new WorkspaceHandler(
      gitOps,
      serverOptions.workspacePath,
      client,
      loggerFactory
    );
    this.controller = new LanguageServerController(
      serverOptions,
      targetHost,
      installManager,
      loggerFactory,
      repoConfigController
    );
  }

  /**
   * send a lsp request to language server, will initiate the language server if needed
   * @param method the method name
   * @param params the request params
   */
  public async sendRequest(method: string, params: any): Promise<ResponseMessage> {
    const request = { method, params };
    await this.workspaceHandler.handleRequest(request);
    const response = await this.controller.handleRequest(request);
    return this.workspaceHandler.handleResponse(request, response);
  }

  public async launchServers() {
    await this.controller.launchServers();
  }

  public async deleteWorkspace(repoUri: string) {
    for (const path of await this.workspaceHandler.listWorkspaceFolders(repoUri)) {
      await this.controller.unloadWorkspace(path);
    }
    await this.workspaceHandler.clearWorkspace(repoUri);
  }

  /**
   * shutdown all launched language servers
   */
  public async shutdown() {
    await this.controller.exit();
  }

  public supportLanguage(lang: string) {
    return this.controller.getLanguageServerDef(lang).length > 0;
  }

  public getLanguageSeverDef(lang: string) {
    return this.controller.getLanguageServerDef(lang);
  }

  public languageServerStatus(name: string): LanguageServerStatus {
    const defs = this.controller.getLanguageServerDef(name);
    if (defs.length > 0) {
      const def = defs[0];
      return this.controller.status(def);
    } else {
      return LanguageServerStatus.NOT_INSTALLED;
    }
  }

  public async initializeState(repoUri: string, revision: string) {
    const workspacePath = await this.workspaceHandler.revisionDir(repoUri, revision);
    return await this.controller.initializeState(workspacePath);
  }
}
