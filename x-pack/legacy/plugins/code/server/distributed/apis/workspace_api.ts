/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServiceHandlerFor } from '../service_definition';
import { WorkspaceHandler } from '../../lsp/workspace_handler';
import { RepoConfig } from '../../../model';
import { WorkspaceCommand } from '../../lsp/workspace_command';
import { LoggerFactory as CodeLoggerFactory } from '../../utils/log_factory';

export const WorkspaceDefinition = {
  initCmd: {
    request: {} as { repoUri: string; revision: string; repoConfig: RepoConfig; force: boolean },
    response: {},
  },
};

export const getWorkspaceHandler = (
  loggerFactory: CodeLoggerFactory,
  workspaceHandler: WorkspaceHandler
): ServiceHandlerFor<typeof WorkspaceDefinition> => ({
  async initCmd({ repoUri, revision, repoConfig, force }) {
    try {
      const { workspaceDir, workspaceRevision } = await workspaceHandler.openWorkspace(
        repoUri,
        revision
      );

      const workspaceCmd = new WorkspaceCommand(
        repoConfig,
        workspaceDir,
        workspaceRevision,
        loggerFactory.getLogger(['workspace', repoUri])
      );
      await workspaceCmd.runInit(force);
      return {};
    } catch (e) {
      if (e.isBoom) {
        return e;
      }
    }
  },
});
