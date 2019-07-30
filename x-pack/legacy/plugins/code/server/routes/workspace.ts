/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { RequestFacade, RequestQueryFacade } from '../../';
import { GitOperations } from '../git_operations';
import { Logger } from '../log';
import { WorkspaceCommand } from '../lsp/workspace_command';
import { WorkspaceHandler } from '../lsp/workspace_handler';
import { ServerOptions } from '../server_options';
import { EsClientWithRequest } from '../utils/esclient_with_request';
import { ServerLoggerFactory } from '../utils/server_logger_factory';
import { CodeServerRouter } from '../security';

export function workspaceRoute(
  router: CodeServerRouter,
  serverOptions: ServerOptions,
  gitOps: GitOperations
) {
  router.route({
    path: '/api/code/workspace',
    method: 'GET',
    async handler() {
      return serverOptions.repoConfigs;
    },
  });

  router.route({
    path: '/api/code/workspace/{uri*3}/{revision}',
    requireAdmin: true,
    method: 'POST',
    async handler(req: RequestFacade) {
      const repoUri = req.params.uri as string;
      const revision = req.params.revision as string;
      const repoConfig = serverOptions.repoConfigs[repoUri];
      const force = !!(req.query as RequestQueryFacade).force;
      if (repoConfig) {
        const log = new Logger(router.server, ['workspace', repoUri]);
        const workspaceHandler = new WorkspaceHandler(
          gitOps,
          serverOptions.workspacePath,
          new EsClientWithRequest(req),
          new ServerLoggerFactory(router.server)
        );
        try {
          const { workspaceDir, workspaceRevision } = await workspaceHandler.openWorkspace(
            repoUri,
            revision
          );
          const workspaceCmd = new WorkspaceCommand(
            repoConfig,
            workspaceDir,
            workspaceRevision,
            log
          );
          workspaceCmd.runInit(force).then(() => {
            return '';
          });
        } catch (e) {
          if (e.isBoom) {
            return e;
          }
        }
      } else {
        return Boom.notFound(`repo config for ${repoUri} not found.`);
      }
    },
  });
}
