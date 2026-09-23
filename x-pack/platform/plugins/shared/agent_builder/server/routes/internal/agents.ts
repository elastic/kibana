/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { agentIdMaxLength } from '@kbn/agent-builder-common/agents';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core/server';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import type {
  AgentAiIndicesWarning,
  GetAgentAiIndicesResponse,
  ListAgentAiIndicesResponse,
} from '../../../common/http_api/agents';
import { internalApiPath } from '../../../common/constants';
import { AGENT_BUILDER_READ_SECURITY } from '../route_security';
import { isContextEngineEnabled } from '../agents';
import { buildEffectiveAgentAiIndices } from '../../services/agents/build_effective_agent_ai_indices';
import type { AgentsServiceStart } from '../../services/agents/types';

interface InheritedAiIndicesResolveResult {
  inherited: string[];
  error?: string;
}

const resolveInheritedAiIndicesForType = async ({
  agentsService,
  agentType,
  request,
  logger,
}: {
  agentsService: AgentsServiceStart;
  agentType: string;
  request: KibanaRequest;
  logger: Logger;
}): Promise<InheritedAiIndicesResolveResult> => {
  try {
    const base = await agentsService.resolveAgentBaseConfiguration({ agentType, request });
    return { inherited: base?.ai_indices ?? [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    logger.warn(`Failed to resolve AI indices for type "${agentType}": ${message}`);
    return { inherited: [], error: message };
  }
};

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
        return response.notFound();
      }

      const { agents: agentsService } = getInternalServices();
      const registry = await agentsService.getRegistry({ request });
      const agents = await registry.list();

      // Base configuration belongs to the agent's type, so each distinct type resolves once.
      const types = [...new Set(agents.map(({ type }) => type))];
      const aiIndicesByType = new Map(
        await Promise.all(
          types.map(async (type) => {
            const resolved = await resolveInheritedAiIndicesForType({
              agentsService,
              agentType: type,
              request,
              logger,
            });
            return [type, resolved] as const;
          })
        )
      );

      const results = agents.map((agent) => {
        const { inherited } = aiIndicesByType.get(agent.type) ?? { inherited: [] };

        return {
          agent_id: agent.id,
          ai_indices: buildEffectiveAgentAiIndices({
            inherited,
            assigned: agent.configuration.ai_indices ?? [],
          }),
        };
      });

      const warnings = [...aiIndicesByType.entries()].flatMap(
        ([agentType, { error: message }]): AgentAiIndicesWarning[] =>
          message
            ? [
                {
                  message,
                  agent_type: agentType,
                },
              ]
            : []
      );

      return response.ok<ListAgentAiIndicesResponse>({
        body: { results, ...(warnings.length > 0 ? { warnings } : {}) },
      });
    })
  );

  // Effective AI indices for a specific agent.
  router.get(
    {
      path: `${internalApiPath}/agents/{id}/_ai_indices`,
      validate: {
        params: schema.object({
          id: schema.string({ maxLength: agentIdMaxLength }),
        }),
      },
      options: { access: 'internal' },
      security: AGENT_BUILDER_READ_SECURITY,
    },
    wrapHandler(async (ctx, request, response) => {
      if (!(await isContextEngineEnabled(ctx))) {
        return response.notFound();
      }

      const { agents: agentsService } = getInternalServices();
      const registry = await agentsService.getRegistry({ request });
      const agent = await registry.get(request.params.id);
      const { inherited, error } = await resolveInheritedAiIndicesForType({
        agentsService,
        agentType: agent.type,
        request,
        logger,
      });

      const warnings: AgentAiIndicesWarning[] = error
        ? [{ message: error, agent_type: agent.type }]
        : [];

      return response.ok<GetAgentAiIndicesResponse>({
        body: {
          ai_indices: buildEffectiveAgentAiIndices({
            inherited,
            assigned: agent.configuration.ai_indices ?? [],
          }),
          ...(warnings.length > 0 ? { warnings } : {}),
        },
      });
    })
  );
}
