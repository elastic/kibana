/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { AgentType } from '@kbn/onechat-common';
import type { ListAgentsResponse } from '../../common/http_api/agents';
import { apiPrivileges } from '../../common/features';
import { agentToDescriptor } from '../services/agents/utils';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';

export function registerAgentRoutes({ router, getInternalServices, logger }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.get(
    {
      path: '/internal/chat/agents',
      validate: {
        query: schema.object({
          type: schema.string({ defaultValue: AgentType.conversational }),
        }),
      },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      options: {
        availability: {
          stability: 'experimental',
        },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      // const { type } = request.query;
      const { agents: agentService } = getInternalServices();
      const agentRegistry = agentService.registry.asPublicRegistry();

      // TODO: use type as filter?
      const agents = await agentRegistry.list({ request });

      return response.ok<ListAgentsResponse>({
        body: {
          agents: agents.map(agentToDescriptor),
        },
      });
    })
  );
}
