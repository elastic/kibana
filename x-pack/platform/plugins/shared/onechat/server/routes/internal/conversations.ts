/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import { apiPrivileges } from '../../../common/features';
import { internalApiPath } from '../../../common/constants';

export function registerInternalConversationsRoutes({
  router,
  coreSetup,
  getInternalServices,
  logger,
  pluginsSetup: { workflowsManagement },
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // resolve search sources (internal)
  router.get(
    {
      path: `${internalApiPath}/conversation_summaries/{id}`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { id } = request.params;

      const { conversations } = getInternalServices();
      const summaryService = await conversations.getSummarizationService({ request });

      const summary = await summaryService.get(id);

      return response.ok({
        body: {
          summary,
        },
      });
    })
  );
}
