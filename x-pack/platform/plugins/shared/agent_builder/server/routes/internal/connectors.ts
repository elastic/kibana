/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { getConnectorSpec, isToolAction } from '@kbn/connector-specs';
import { formatSchemaForLlm } from '@kbn/agent-builder-server';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import type {
  AgentConnectorSummary,
  AgentConnectorSubActionDetail,
  ListAgentConnectorsResponse,
  AgentConnectorDetailResponse,
} from '../../../common/http_api/tools';
import { internalApiPath } from '../../../common/constants';
import { AGENT_BUILDER_READ_SECURITY } from '../route_security';

export function registerInternalConnectorRoutes({ router, coreSetup, logger }: RouteDependencies) {
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

      const allConnectors = await actionsClient.getAll();

      const connectors: AgentConnectorSummary[] = allConnectors
        .filter((connector) => !!getConnectorSpec(connector.actionTypeId))
        .map((connector) => {
          const spec = getConnectorSpec(connector.actionTypeId);
          return {
            id: connector.id,
            name: connector.name,
            type: connector.actionTypeId,
            description: spec?.metadata.description ?? connector.name,
          };
        });

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

      let connector: Awaited<ReturnType<typeof actionsClient.get>>;
      try {
        connector = await actionsClient.get({ id: connectorId });
      } catch (e) {
        const statusCode = (e as { output?: { statusCode?: number } }).output?.statusCode;
        if (statusCode === 404) {
          return response.notFound({
            body: { message: `Connector '${connectorId}' not found.` },
          });
        }
        throw e;
      }

      const spec = getConnectorSpec(connector.actionTypeId);

      if (!spec) {
        return response.notFound({
          body: {
            message: `Connector type '${connector.actionTypeId}' does not have a connector spec and cannot be used as an agent tool.`,
          },
        });
      }

      const subActions: AgentConnectorSubActionDetail[] = Object.entries(spec.actions)
        .filter(([name]) => isToolAction(spec, name))
        .map(([name, action]) => ({
          name,
          description: action.description ?? name,
          params: action.input ? formatSchemaForLlm(action.input) : 'No parameters',
        }));

      return response.ok<AgentConnectorDetailResponse>({
        body: {
          id: connector.id,
          name: connector.name,
          type: connector.actionTypeId,
          description: spec.metadata.description ?? connector.name,
          subActions,
        },
      });
    })
  );
}
