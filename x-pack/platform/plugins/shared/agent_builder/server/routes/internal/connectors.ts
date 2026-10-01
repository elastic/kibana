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

/**
 * Resolves the effective connector_ids for the agent named in the request header.
 * Returns undefined (allow all) when no agent header is present.
 * Returns [] (block all) when the header is present but the agent is not found.
 * Uses the resolved effective configuration so inherited connector restrictions are honoured.
 */
const resolveAllowedConnectorIds = async (
  request: KibanaRequest,
  internalServices: InternalStartServices
): Promise<string[] | undefined> => {
  const agentId = request.headers[AGENT_ID_HEADER];
  if (!agentId || typeof agentId !== 'string') return undefined;

  const registry = await internalServices.agents.getRegistry({ request });
  try {
    const agent = await registry.get(agentId);
    const configuration = await internalServices.agents.resolveAgentConfiguration({
      agent,
      request,
    });
    return configuration.connector_ids;
  } catch (e) {
    const statusCode = (e as { output?: { statusCode?: number } }).output?.statusCode;
    // Unknown agent — fail closed (block all) rather than exposing unscoped connectors.
    if (statusCode === 404) return [];
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

  // List agent-callable connectors, or get detail for one via ?id=<connectorId>
  router.get(
    {
      path: `${internalApiPath}/connectors`,
      validate: {
        query: schema.object({
          id: schema.maybe(schema.string({ minLength: 1, maxLength: 512 })),
        }),
      },
      options: { access: 'internal' },
      security: AGENT_BUILDER_READ_SECURITY,
    },
    wrapHandler(async (_ctx, request, response) => {
      const [, pluginsStart] = await coreSetup.getStartServices();
      const actionsClient = await pluginsStart.actions.getActionsClientWithRequest(request);
      const allowedIds = await resolveAllowedConnectorIds(request, getInternalServices());

      const { id: connectorId } = request.query;

      if (connectorId) {
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
      }

      const connectors = await listAgentConnectors(actionsClient, { allowedIds });
      return response.ok<ListAgentConnectorsResponse>({ body: connectors });
    })
  );
}
