/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import type { ListAgentBaseConfigurationResponse } from '../../../common/http_api/agents';
import { internalApiPath } from '../../../common/constants';
import { AGENT_BUILDER_READ_SECURITY } from '../route_security';

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
      const { uiSettings } = await ctx.core;
      const contextEngineEnabled = Boolean(
        await uiSettings.client.get(CONTEXT_ENGINE_ENABLED_SETTING_ID)
      );

      // `ai_indices` is the only projected field, which is meaningless while the Context Engine is off
      if (!contextEngineEnabled) {
        return response.ok<ListAgentBaseConfigurationResponse>({ body: { results: [] } });
      }

      const { agents: agentsService } = getInternalServices();
      const registry = await agentsService.getRegistry({ request });
      const agents = await registry.list();

      const results = await Promise.all(
        agents.map(async (agent) => {
          const base = await agentsService.resolveAgentBaseConfiguration({ agent, request });
          return {
            agent_id: agent.id,
            configuration: { ai_indices: base?.ai_indices ?? [] },
          };
        })
      );

      return response.ok<ListAgentBaseConfigurationResponse>({ body: { results } });
    })
  );
}
