/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import type { ReadWorkspaceFileResponse } from '../../../common/http_api/workspace_files';
import { apiPrivileges } from '../../../common/features';
import { internalApiPath } from '../../../common/constants';

export function registerWorkspaceFileRoutes({
  router,
  getInternalServices,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });
  router.get(
    {
      path: `${internalApiPath}/conversations/{conversation_id}/files`,
      validate: {
        params: schema.object({
          conversation_id: schema.string(),
        }),
        query: schema.object({
          path: schema.string(),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { workspaces } = getInternalServices();
      const client = await workspaces.getScopedClient({ request });
      const file = await client.readFile({
        conversationId: request.params.conversation_id,
        path: request.query.path,
      });

      if (!file) {
        return response.notFound({
          body: { message: `File not found: ${request.query.path}` },
        });
      }

      return response.ok<ReadWorkspaceFileResponse>({ body: file });
    })
  );
}
