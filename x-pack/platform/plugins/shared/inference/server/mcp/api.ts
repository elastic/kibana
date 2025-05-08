/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, Logger } from '@kbn/core/server';
import { PluginStartContract as ActionsPluginsStart } from '@kbn/actions-plugin/server';
import { once } from 'lodash';
import {
  InferenceCallToolRequest,
  InferenceCallToolResponse,
  InferenceListToolsResponse,
  InferenceTaskError,
  InferenceTaskErrorCode,
} from '@kbn/inference-common';
import {
  CallToolResponse,
  ListToolsResponse,
  MCPCallToolParams,
  MCPListToolsParams,
  MCP_CONNECTOR_SUB_ACTION_TYPE_CALL_TOOL,
  MCP_CONNECTOR_SUB_ACTION_TYPE_LIST_TOOLS,
} from '@kbn/mcp-connector-common';
import { MCPListToolsViaHubParams } from '@kbn/mcp-connector-common/src/connector';
import { InferenceClient } from '../inference_client';
import { getMCPConnectors } from './get_mcp_connectors';

interface CreateMCPApiOptions {
  request: KibanaRequest;
  actions: ActionsPluginsStart;
  logger: Logger;
}

export function createMCPApis({
  actions,
  request,
  logger,
}: CreateMCPApiOptions): Pick<
  InferenceClient,
  'callMCPTool' | 'listMCPTools' | 'listMcpToolsViaHub'
> {
  const getActionsClient = once(() => {
    return actions.getActionsClientWithRequest(request);
  });

  const getConnectors = once(async () => {
    return getMCPConnectors({
      actionsClient: await getActionsClient(),
    });
  });

  return {
    callMCPTool: async ({
      name,
      connectorId,
      arguments: args,
    }: InferenceCallToolRequest): Promise<InferenceCallToolResponse> => {
      const actionsClient = await getActionsClient();

      const result = await actionsClient.execute({
        actionId: connectorId,
        params: {
          subAction: MCP_CONNECTOR_SUB_ACTION_TYPE_CALL_TOOL,
          subActionParams: {
            name,
          },
        } satisfies MCPCallToolParams,
      });

      if (result.status === 'ok') {
        const response = result.data as CallToolResponse;
        return {
          connectorId,
          content: response.content,
        };
      }

      throw new InferenceTaskError(
        InferenceTaskErrorCode.requestError,
        result.message ?? result.serviceMessage ?? result.errorSource ?? 'Unknown error',
        {}
      );
    },
    listMCPTools: async (): Promise<InferenceListToolsResponse> => {
      const [actionsClient, connectors] = await Promise.all([getActionsClient(), getConnectors()]);

      const results = await Promise.allSettled(
        connectors.map(async (connector) => {
          const result = await actionsClient.execute({
            actionId: connector.connectorId,
            params: {
              subAction: MCP_CONNECTOR_SUB_ACTION_TYPE_LIST_TOOLS,
              subActionParams: {},
            } satisfies MCPListToolsParams,
          });

          if (result.status === 'ok') {
            return {
              connectorId: connector.connectorId,
              ...(result.data as ListToolsResponse),
            };
          }

          throw new InferenceTaskError(
            InferenceTaskErrorCode.requestError,
            result.message ?? result.serviceMessage ?? result.errorSource ?? 'Unknown error',
            {}
          );
        })
      );

      return {
        servers: results.flatMap((result) => {
          if (result.status === 'rejected') {
            return [];
          }
          return [result.value];
        }),
      };
    },
    listMcpToolsViaHub: async (): Promise<InferenceListToolsResponse> => {
      const [actionsClient, connectors] = await Promise.all([getActionsClient(), getConnectors()]);

      const results = await Promise.allSettled(
        connectors.map(async ({ connectorId }) => {
          const result = await actionsClient.execute({
            actionId: connectorId,
            params: {
              subAction: 'listToolsViaHub',
              subActionParams: {},
            } satisfies MCPListToolsViaHubParams,
          });

          if (result.status === 'ok') {
            return {
              connectorId,
              ...(result.data as ListToolsResponse),
            };
          } else {
            // Do nothing for now.
            // Connectors created for MCP JSON-RPC will fail
          }
        })
      );

      return {
        servers: results.flatMap((r) => {
          if (r.status === 'fulfilled' && r.value) {
            return [r.value];
          }
          return [];
        }),
      };
    },
  };
}
