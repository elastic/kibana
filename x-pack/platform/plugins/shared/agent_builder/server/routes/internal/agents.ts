/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { MAX_AI_INDEX_ID_LENGTH } from '@kbn/context-engine-plugin/common/constants';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import type {
  GetAgentAiIndicesResponse,
  ListAgentAiIndicesResponse,
} from '../../../common/http_api/agents';
import { internalApiPath } from '../../../common/constants';
import { AGENT_BUILDER_READ_SECURITY } from '../route_security';
import { isContextEngineEnabled } from '../agents';
import { buildEffectiveAgentAiIndices } from '../../services/agents/build_effective_agent_ai_indices';

export function registerInternalAgentRoutes({
  router,
  getInternalServices,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // AI indices for every listed agent.
  //
  // The public agent API only exposes an agent's own configuration, so a client cannot tell which
  // values come from the agent's type.
  router.get(
    {
      path: `${internalApiPath}/agents/_ai_indices`,
      validate: false,
      options: { access: 'internal' },
      security: AGENT_BUILDER_READ_SECURITY,
    },
    wrapHandler(async (ctx, request, response) => {
      if (!(await isContextEngineEnabled(ctx))) {
        return response.ok<ListAgentAiIndicesResponse>({ body: { results: [] } });
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
        ai_indices: buildEffectiveAgentAiIndices({
          inherited: aiIndicesByType.get(agent.type) ?? [],
          assigned: agent.configuration.ai_indices ?? [],
        }),
      }));

      return response.ok<ListAgentAiIndicesResponse>({ body: { results } });
    })
  );

  // Effective AI indices for a specific agent.
  router.get(
    {
      path: `${internalApiPath}/agents/{id}/_ai_indices`,
      validate: {
        params: schema.object({
          id: schema.string({ maxLength: MAX_AI_INDEX_ID_LENGTH }),
        }),
      },
      options: { access: 'internal' },
      security: AGENT_BUILDER_READ_SECURITY,
    },
    wrapHandler(async (ctx, request, response) => {
      if (!(await isContextEngineEnabled(ctx))) {
        return response.ok<GetAgentAiIndicesResponse>({ body: { ai_indices: [] } });
      }

      const { agents: agentsService } = getInternalServices();
      const registry = await agentsService.getRegistry({ request });
      const agent = await registry.get(request.params.id);
      const base = await agentsService.resolveAgentBaseConfiguration({
        agent: { type: agent.type },
        request,
      });

      return response.ok<GetAgentAiIndicesResponse>({
        body: {
          ai_indices: buildEffectiveAgentAiIndices({
            inherited: base?.ai_indices ?? [],
            assigned: agent.configuration.ai_indices ?? [],
          }),
        },
      });
    })
  );
}
