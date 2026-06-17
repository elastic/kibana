/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AttachmentType,
  connectorAttachmentDataSchema,
} from '@kbn/agent-builder-common/attachments';
import type { AgentContextLayerPluginStart } from '@kbn/agent-context-layer-plugin/server';
import { formatSchemaForLlm } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { getConnectorSpec, isToolAction } from '@kbn/connector-specs';
import type { ToolCallback, ToolDefinition } from '@kbn/inference-common';
import type { Logger } from '@kbn/logging';

export const INSIGHTS_DISCOVERY_CONNECTOR_TOOLS = {
  sml_search: {
    description:
      'Search the Semantic Metadata Layer for connectors (chat, code, ticketing, deployment status, etc.). Pass "*" to list all connectors. Each result includes chunk_id for sml_attach.',
    schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string' as const,
          description:
            'Search string matched against connector titles and types, or "*" to return all connectors.',
        },
        size: {
          type: 'number' as const,
          description: 'Maximum results to return (default 10, max 50).',
        },
      },
      required: ['query'] as const,
    },
  },
  sml_attach: {
    description:
      'Attach connectors found via sml_search so you can call their sub-actions. Pass chunk_id values from sml_search. Returns connector IDs, available sub-actions, and parameter schemas.',
    schema: {
      type: 'object' as const,
      properties: {
        chunk_ids: {
          type: 'array' as const,
          items: { type: 'string' as const },
          description: 'chunk_id values from sml_search results.',
        },
      },
      required: ['chunk_ids'] as const,
    },
  },
  execute_connector_sub_action: {
    description:
      'Execute a sub-action on an attached connector. Use connectorId and subAction from sml_attach output; put sub-action arguments in params.',
    schema: {
      type: 'object' as const,
      properties: {
        connectorId: {
          type: 'string' as const,
          description: 'Connector instance ID from sml_attach output.',
        },
        subAction: {
          type: 'string' as const,
          description: 'Exact sub-action name from sml_attach output.',
        },
        params: {
          type: 'object' as const,
          properties: {},
          description: 'Parameters for the sub-action.',
        },
      },
      required: ['connectorId', 'subAction'] as const,
    },
  },
} satisfies Record<string, ToolDefinition>;

const formatConnectorAttachmentForLlm = (data: {
  connector_id: string;
  connector_name: string;
  connector_type: string;
}): string => {
  const {
    connector_id: connectorId,
    connector_name: connectorName,
    connector_type: connectorType,
  } = data;
  const spec = getConnectorSpec(connectorType);
  const subActionEntries = spec
    ? Object.entries(spec.actions).filter(([, action]) => action.isTool)
    : [];
  const parts: string[] = [
    `Connector: ${connectorName} (${connectorType})`,
    spec?.metadata.description ? `Description: ${spec.metadata.description}` : '',
    `Connector ID: ${connectorId}`,
    '',
    `Required JSON shape for tool execute_connector_sub_action:`,
    `{"connectorId":"${connectorId}","subAction":"<sub-action name>","params":{ ... }}`,
  ].filter(Boolean);

  if (subActionEntries.length > 0) {
    parts.push('');
    parts.push('Available sub-actions:');
    for (const [actionName, action] of subActionEntries) {
      const actionDesc = action.description ?? actionName;
      const paramsSummary = action.input ? formatSchemaForLlm(action.input) : 'No parameters';
      parts.push(`  - ${actionName}: ${actionDesc}`);
      parts.push(`    Parameters: ${paramsSummary}`);
    }
    if (spec?.skill) {
      parts.push('');
      parts.push(spec.skill);
    }
  }

  return parts.join('\n');
};

export interface InsightsDiscoveryConnectorToolsDeps {
  agentContextLayer: AgentContextLayerPluginStart;
  actions: ActionsPluginStart;
  esClient: IScopedClusterClient;
  request: KibanaRequest;
  spaceId: string;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}

export interface InsightsDiscoveryConnectorContext {
  tools: typeof INSIGHTS_DISCOVERY_CONNECTOR_TOOLS;
  toolCallbacks: Record<string, ToolCallback>;
  promptSuffix: string;
}

export const createInsightsDiscoveryConnectorContext = (
  deps: InsightsDiscoveryConnectorToolsDeps
): InsightsDiscoveryConnectorContext => {
  const attachedConnectorRepresentations = new Map<string, string>();

  const toolCallbacks: Record<string, ToolCallback> = {
    sml_search: async (toolCall) => {
      const { query, size } = toolCall.function.arguments as { query: string; size?: number };
      try {
        const searchResult = await deps.agentContextLayer.search({
          query,
          size: size ?? 10,
          spaceId: deps.spaceId,
          esClient: deps.esClient,
          request: deps.request,
        });

        const connectorHits = searchResult.results.filter((hit) => hit.type === 'connector');

        return {
          response: {
            total: connectorHits.length,
            items: connectorHits.map((hit) => ({
              chunk_id: hit.id,
              attachment_id: hit.origin.uri,
              attachment_type: hit.type,
              title: hit.title,
              content: hit.content,
            })),
          },
        };
      } catch (error) {
        return {
          response: {
            error: error instanceof Error ? error.message : String(error),
            items: [],
          },
        };
      }
    },
    sml_attach: async (toolCall) => {
      const { chunk_ids: chunkIds } = toolCall.function.arguments as { chunk_ids: string[] };
      try {
        const resolvedItems = await deps.agentContextLayer.resolveSmlAttachItems({
          chunkIds,
          esClient: deps.esClient,
          request: deps.request,
          spaceId: deps.spaceId,
          savedObjectsClient: deps.savedObjectsClient,
          logger: deps.logger,
        });

        const attachments = resolvedItems.map((item) => {
          if (!item.success) {
            return { chunk_id: item.chunk_id, success: false, error: item.message };
          }

          if (item.attachment.type !== AttachmentType.connector) {
            return {
              chunk_id: item.chunk_id,
              success: false,
              error: `Unsupported attachment type '${item.attachment.type}' during insights discovery — only connectors are supported.`,
            };
          }

          const parsed = connectorAttachmentDataSchema.safeParse(item.attachment.data);
          if (!parsed.success) {
            return {
              chunk_id: item.chunk_id,
              success: false,
              error: `Invalid connector attachment data: ${parsed.error.message}`,
            };
          }

          const representation = formatConnectorAttachmentForLlm(parsed.data);
          attachedConnectorRepresentations.set(parsed.data.connector_id, representation);

          return {
            chunk_id: item.chunk_id,
            success: true,
            connector_id: parsed.data.connector_id,
            connector_name: parsed.data.connector_name,
            connector_type: parsed.data.connector_type,
            representation,
          };
        });

        return { response: { attachments } };
      } catch (error) {
        return {
          response: {
            error: error instanceof Error ? error.message : String(error),
          },
        };
      }
    },
    execute_connector_sub_action: async (toolCall) => {
      const { connectorId, subAction, params } = toolCall.function.arguments as {
        connectorId: string;
        subAction: string;
        params?: Record<string, unknown>;
      };

      const actionsClient = await deps.actions.getActionsClientWithRequest(deps.request);

      let connectorType: string;
      try {
        const connector = await actionsClient.get({ id: connectorId });
        connectorType = connector.actionTypeId;
      } catch (error) {
        return {
          response: {
            error: `Failed to resolve connector '${connectorId}': ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        };
      }

      const spec = getConnectorSpec(connectorType);
      if (!spec) {
        return {
          response: {
            error: `No connector spec for type '${connectorType}' (connector '${connectorId}').`,
          },
        };
      }

      if (!isToolAction(spec, subAction)) {
        return {
          response: {
            error: `Sub-action '${subAction}' is not available as a tool on connector type '${connectorType}'.`,
            hint: attachedConnectorRepresentations.get(connectorId),
          },
        };
      }

      try {
        const executeResult = await actionsClient.execute({
          actionId: connectorId,
          params: {
            subAction,
            subActionParams: params ?? {},
          },
        });

        if (executeResult.status === 'error') {
          return {
            response: {
              error: executeResult.message ?? 'Connector sub-action failed',
              serviceMessage: executeResult.serviceMessage,
            },
          };
        }

        return {
          response: {
            data: executeResult.data ?? { message: 'Sub-action executed successfully' },
          },
        };
      } catch (error) {
        return {
          response: {
            error: `Failed to execute sub-action '${subAction}' on connector '${connectorId}': ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        };
      }
    },
  };

  const promptSuffix = [
    '## Connectors for root-cause analysis',
    '',
    'Connector tools are available for this run:',
    '1. Call `sml_search` with `"*"` (or targeted terms like "slack", "github", "pagerduty") to find connectors.',
    '2. Call `sml_attach` with relevant `chunk_id` values to load sub-action documentation.',
    '3. Call `execute_connector_sub_action` to query external systems for evidence of **why** failures occurred (deploys, incidents, config changes).',
    '4. Use connector findings together with memory and log evidence before submitting insights.',
  ].join('\n');

  return {
    tools: INSIGHTS_DISCOVERY_CONNECTOR_TOOLS,
    toolCallbacks: toolCallbacks as Record<string, ToolCallback>,
    promptSuffix,
  };
};
