/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, KibanaResponseFactory, RequestHandlerContext } from 'src/core/server';

import { RequestQueryFacade } from '../../';
import { ServerOptions } from '../server_options';
import { CodeServerRouter } from '../security';
import { CodeServices } from '../distributed/code_services';
import { WorkspaceDefinition } from '../distributed/apis';
import { getReferenceHelper } from '../utils/repository_reference_helper';

export function workspaceRoute(
  router: CodeServerRouter,
  serverOptions: ServerOptions,
  codeServices: CodeServices
) {
  const workspaceService = codeServices.serviceFor(WorkspaceDefinition);

  router.route({
    path: '/api/code/workspace',
    method: 'GET',
    async npHandler(
      context: RequestHandlerContext,
      req: KibanaRequest,
      res: KibanaResponseFactory
    ) {
      return res.ok({ body: serverOptions.repoConfigs });
    },
  });

  router.route({
    path: '/api/code/workspace/{uri*3}/{revision}',
    requireAdmin: true,
    method: 'POST',
    async npHandler(
      context: RequestHandlerContext,
      req: KibanaRequest,
      res: KibanaResponseFactory
    ) {
      const { uri: repoUri, revision } = req.params as any;
      getReferenceHelper(context.core.savedObjects.client).ensureReference(repoUri);
      const repoConfig = serverOptions.repoConfigs[repoUri];
      const force = !!(req.query as RequestQueryFacade).force;
      if (repoConfig) {
        const endpoint = await codeServices.locate(req, repoUri);
        try {
          await workspaceService.initCmd(endpoint, { repoUri, revision, force, repoConfig });
          return res.ok();
        } catch (e) {
          if (e.isBoom) {
            return res.customError({
              body: e.error,
              statusCode: e.statusCode ? e.statusCode : 500,
            });
          } else {
            return res.customError({
              body: e.error,
              statusCode: 500,
            });
          }
        }
      } else {
        return res.notFound({ body: `repo config for ${repoUri} not found.` });
      }
    },
  });
}
