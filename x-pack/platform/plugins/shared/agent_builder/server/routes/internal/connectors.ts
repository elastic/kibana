/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { KibanaRequest } from '@kbn/core/server';
import { listAgentConnectors, getAgentConnectorDetail } from '@kbn/agent-builder-server';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import type {
  ListAgentConnectorsResponse,
  AgentConnectorDetailResponse,
} from '../../../common/http_api/tools';
import { internalApiPath } from '../../../common/constants';
import { AGENT_BUILDER_READ_SECURITY } from '../route_security';
import type { InternalStartServices } from '../../services';

const AGENT_ID_HEADER = 'x-agent-builder-agent-id';

/** Resolves the connector_ids configured for the agent in the request header, if present. */
const resolveAllowedConnectorIds = async (
  request: KibanaRequest,
  internalServices: InternalStartServices
): Promise<string[] | undefined> => {
  const agentId = request.headers[AGENT_ID_HEADER];
  if (!agentId || typeof agentId !== 'string') return undefined;

  const registry = await internalServices.agents.getRegistry({ request });
  try {
    const agent = await registry.get(agentId);
    return agent.configuration.connector_ids;
  } catch (e) {
    const statusCode = (e as { output?: { statusCode?: number } }).output?.statusCode;
    if (statusCode === 404) return undefined;
    throw e;
  }
};

export function registerInternalConnectorRoutes({
  router,
  coreSetup,
  logger,
  getInternalServices,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // List agent-callable connectors (internal — for use by the connector discovery skill)
  router.get(
    {
      path: `${internalApiPath}/connectors`,
      validate: false,
      options: { access: 'internal' },
      security: AGENT_BUILDER_READ_SECURITY,
    },
    wrapHandler(async (_ctx, request, response) => {
      const [, pluginsStart] = await coreSetup.getStartServices();
      const actionsClient = await pluginsStart.actions.getActionsClientWithRequest(request);

      const allowedIds = await resolveAllowedConnectorIds(request, getInternalServices());
      const connectors = await listAgentConnectors(actionsClient, { allowedIds });

      return response.ok<ListAgentConnectorsResponse>({ body: connectors });
    })
  );

  // Get sub-actions for a specific connector (internal — for use by the connector discovery skill)
  router.get(
    {
      path: `${internalApiPath}/connector/{connectorId}/sub_actions`,
      validate: {
        params: schema.object({
          connectorId: schema.string({ minLength: 1, maxLength: 512 }),
        }),
      },
      options: { access: 'internal' },
      security: AGENT_BUILDER_READ_SECURITY,
    },
    wrapHandler(async (_ctx, request, response) => {
      const [, pluginsStart] = await coreSetup.getStartServices();
      const actionsClient = await pluginsStart.actions.getActionsClientWithRequest(request);

      const { connectorId } = request.params;

      const allowedIds = await resolveAllowedConnectorIds(request, getInternalServices());

      let detail: Awaited<ReturnType<typeof getAgentConnectorDetail>>;
      try {
        detail = await getAgentConnectorDetail(actionsClient, connectorId, { allowedIds });
      } catch (e) {
        const statusCode = (e as { output?: { statusCode?: number } }).output?.statusCode;
        if (statusCode === 404) {
          return response.notFound({
            body: { message: `Connector '${connectorId}' not found.` },
          });
        }
        throw e;
      }

      if (!detail) {
        return response.notFound({
          body: {
            message: `Connector '${connectorId}' does not have a connector spec and cannot be used as an agent tool.`,
          },
        });
      }

      return response.ok<AgentConnectorDetailResponse>({ body: detail });
    })
  );
}
