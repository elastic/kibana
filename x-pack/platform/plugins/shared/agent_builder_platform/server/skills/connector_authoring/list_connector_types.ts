/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType, isOtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId, createErrorResult } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { AgentBuilderConnectorFeatureId } from '@kbn/actions-plugin/common';
import type { ActionType } from '@kbn/actions-plugin/common';
import { getConnectorSpec } from '@kbn/connector-specs';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { getConnectorTypeDisplayName, isConnectorTypeAvailable } from './utils';

interface ListedConnectorAction {
  name: string;
  description: string;
}

interface ListedConnectorType {
  connector_type: string;
  name: string;
  description: string;
  minimum_license: string;
  technical_preview: boolean;
  auth_methods: string[];
  tool_actions: ListedConnectorAction[];
}

const projectConnectorType = (actionType: ActionType): ListedConnectorType => {
  const spec = getConnectorSpec(actionType.id);

  const authMethods = (spec?.auth?.types ?? []).map((authType) =>
    typeof authType === 'string' ? authType : authType.type
  );

  const toolActions = spec
    ? Object.entries(spec.actions)
        .filter(([, action]) => action.isTool)
        .map(([actionName, action]) => ({
          name: actionName,
          description: action.description ?? actionName,
        }))
    : [];

  return {
    connector_type: actionType.id,
    name: getConnectorTypeDisplayName(actionType),
    description: spec?.metadata.description ?? actionType.description ?? '',
    minimum_license: actionType.minimumLicenseRequired,
    technical_preview: actionType.isExperimental ?? spec?.metadata.isTechnicalPreview ?? false,
    auth_methods: authMethods,
    tool_actions: toolActions,
  };
};

const listConnectorTypesSchema = z.object({}).describe('No parameters.');

export type ListConnectorTypesInput = z.infer<typeof listConnectorTypesSchema>;

/**
 * Inline tool that enumerates the connector types the agent can create from chat.
 *
 * Lists Agent Builder connector types from the Actions registry (same source as
 * the Connectors UI), enriched from `@kbn/connector-specs` when a spec exists.
 * Filtered by {@link isConnectorTypeAvailable}. Call before `propose_connector`.
 */
export const createListConnectorTypesTool = ({
  getActionsStart,
}: {
  getActionsStart: () => Promise<ActionsPluginStart>;
}): BuiltinSkillBoundedTool<typeof listConnectorTypesSchema> => ({
  id: 'list_connector_types',
  type: ToolType.builtin,
  description:
    'List the connector types that can be created from chat, returning each type id, display name, description, required license, supported auth methods, and the sub-actions the agent could call afterwards. Call this BEFORE `propose_connector` so the draft references a connector type id that actually exists. Pick the `connector_type` value verbatim from the result — never invent one.',
  schema: listConnectorTypesSchema,
  confirmation: { askUser: 'never' },
  handler: async () => {
    try {
      const actionsStart = await getActionsStart();
      const connectorTypes = actionsStart
        .listTypes(AgentBuilderConnectorFeatureId)
        .filter((t) => isConnectorTypeAvailable(t))
        .map(projectConnectorType)
        .sort((a, b) => a.name.localeCompare(b.name));

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              connector_types: connectorTypes,
              total: connectorTypes.length,
            },
          },
        ],
      };
    } catch (error) {
      return {
        results: [
          createErrorResult({
            message: `Failed to list connector types: ${(error as Error).message}`,
          }),
        ],
      };
    }
  },
  summarizeToolReturn: (toolReturn) => {
    if (toolReturn.results.length === 0) return undefined;
    const result = toolReturn.results[0];
    if (!isOtherResult(result)) return undefined;
    const data = result.data as { total?: number };
    const total = data.total ?? 0;
    return [
      {
        ...result,
        data: {
          summary: `Listed ${total} connector types available for setup.`,
          total,
        },
      },
    ];
  },
});
