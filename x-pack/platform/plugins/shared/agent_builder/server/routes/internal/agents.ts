/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import type { ListAgentBaseConfigurationResponse } from '../../../common/http_api/agents';
import { internalApiPath } from '../../../common/constants';
import { AGENT_BUILDER_READ_SECURITY } from '../route_security';
import { isContextEngineEnabled } from '../agents';

export function registerInternalAgentRoutes({
  router,
  getInternalServices,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // Base (agent type) configuration for every listed agent.
  //
  // The public agent API only exposes an agent's own configuration, so a client cannot tell which
  // values come from the agent's type. That distinction drives the Context page: type-contributed
  // AI indices always apply and are not editable on the agent.
  router.get(
    {
      path: `${internalApiPath}/agents/_base_configuration`,
      validate: false,
      options: { access: 'internal' },
      security: AGENT_BUILDER_READ_SECURITY,
    },
    wrapHandler(async (ctx, request, response) => {
      // `ai_indices` is the only projected field, which is meaningless while the Context Engine is off
      if (!(await isContextEngineEnabled(ctx))) {
        return response.ok<ListAgentBaseConfigurationResponse>({ body: { results: [] } });
      }

      const { agents: agentsService } = getInternalServices();
      const registry = await agentsService.getRegistry({ request });
      const agents = await registry.list();

      // Base configuration belongs to the agent's type, so each distinct type resolves once.
      const types = [...new Set(agents.map(({ type }) => type))];
      const aiIndicesByType = new Map(
        await Promise.all(
          types.map(async (type) => {
            const base = await agentsService.resolveAgentBaseConfiguration({
              agent: { type },
              request,
            });
            return [type, base?.ai_indices ?? []] as const;
          })
        )
      );

      const results = agents.map((agent) => ({
        agent_id: agent.id,
        configuration: { ai_indices: aiIndicesByType.get(agent.type) ?? [] },
      }));

      return response.ok<ListAgentBaseConfigurationResponse>({ body: { results } });
    })
  );
}
