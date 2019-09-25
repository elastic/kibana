/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';

import { RequestFacade, RequestQueryFacade } from '../../';
import { ServerOptions } from '../server_options';
import { CodeServerRouter } from '../security';
import { CodeServices } from '../distributed/code_services';
import { WorkspaceDefinition } from '../distributed/apis';

export function workspaceRoute(
  router: CodeServerRouter,
  serverOptions: ServerOptions,
  codeServices: CodeServices
) {
  const workspaceService = codeServices.serviceFor(WorkspaceDefinition);

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
        const endpoint = await codeServices.locate(req, repoUri);
        try {
          await workspaceService.initCmd(endpoint, { repoUri, revision, force, repoConfig });
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
