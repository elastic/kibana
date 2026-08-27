/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId, createErrorResult, formatSchemaForLlm } from '@kbn/agent-builder-server';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { getConnectorSpec } from '@kbn/connector-specs';
import type { ActionScope } from '@kbn/connector-specs';
import type { ConnectorToolsOptions } from './types';

const schema = z.object({});

// Duplicated from attachment_types/connector.ts (agent_builder_platform plugin) — that helper
// isn't exported from a shared package, and isn't worth extracting one for a ~5-line PoC.
function formatAnnotationHint(scope: ActionScope | undefined): string {
  if (!scope || scope === 'read') return '';
  return scope === 'destroy' ? '[DESTROY]' : '[WRITE]';
}

/**
 * Creates the list_connectors tool.
 *
 * Lists saved connector instances directly from the Actions client, with their callable
 * sub-actions, so an agent can call execute_connector_sub_action without first going through
 * sml_search/sml_attach. Connector types without a registered @kbn/connector-specs entry
 * (including MCP connectors, which are configured as individual ToolType.mcp tools ahead of
 * time rather than discovered per-conversation) are not returned, since they can't be run via
 * execute_connector_sub_action anyway.
 */
export const createListConnectorsTool = ({
  getActions,
}: ConnectorToolsOptions): BuiltinToolDefinition<typeof schema> => ({
  id: platformCoreTools.listConnectors,
  type: ToolType.builtin,
  annotations: {
    title: 'List Connectors',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  description:
    'Lists saved connector instances directly, along with their callable sub-actions, so ' +
    'execute_connector_sub_action can be called with {connectorId, subAction, params} without ' +
    'first attaching a connector via sml_search/sml_attach. ' +
    'MCP connectors are not listed here — they are configured as individual tools elsewhere.',
  schema,
  tags: ['connector'],
  excludeFromMcp: true,
  availability: {
    cacheMode: 'global',
    handler: async ({ uiSettings }) => {
      const enabled = await uiSettings.get<boolean>(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID);
      return enabled
        ? { status: 'available' }
        : {
            status: 'unavailable',
            reason: 'Connector tools require Agent Builder experimental features to be enabled',
          };
    },
  },
  handler: async (_input, { request, logger }) => {
    try {
      const actions = await getActions();
      const actionsClient = await actions.getActionsClientWithRequest(request);
      const allConnectors = await actionsClient.getAll({ includeSystemActions: false });

      const connectors = allConnectors.flatMap((connector) => {
        const spec = getConnectorSpec(connector.actionTypeId);
        if (!spec) return [];

        const subActions = Object.entries(spec.actions)
          .filter(([, action]) => action.isTool)
          .map(([subAction, action]) => ({
            subAction,
            description: action.description ?? subAction,
            hint: formatAnnotationHint(action.scope),
            parameters: action.input ? formatSchemaForLlm(action.input) : 'No parameters',
          }));

        return [
          {
            connectorId: connector.id,
            name: connector.name,
            connectorType: connector.actionTypeId,
            displayName: spec.metadata.displayName,
            description: spec.metadata.description,
            isMissingSecrets: connector.isMissingSecrets ?? false,
            subActions,
          },
        ];
      });

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: { total: connectors.length, connectors },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`list_connectors failed: ${message}`);
      return {
        results: [createErrorResult({ message: `Failed to list connectors: ${message}` })],
      };
    }
  },
});
