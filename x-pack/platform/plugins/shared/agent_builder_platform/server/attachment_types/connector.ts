/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import type { ConnectorAttachmentData } from '@kbn/agent-builder-common/attachments';
import {
  AttachmentType,
  connectorAttachmentDataSchema,
} from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { ComponentsNode } from '@kbn/isomer-components';
import { i18n } from '@kbn/i18n';
import {
  createConnectorSpecProvider,
  filterSpecActionsBySelection,
  formatJsonSchemaForLlm,
} from '@kbn/agent-builder-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import {
  formatConnectorActionLine,
  isSpecificActionsSelection,
  type SelectedActions,
} from '@kbn/connector-specs';

/**
 * Creates the definition for the `connector` attachment type.
 *
 * Connector attachments represent a connector instance attached to a conversation,
 * along with its available sub-actions. When a ConnectorSpec is found, the
 * sub-actions (recommended isTool actions, or an explicit selected_actions allowlist)
 * are listed so the agent knows how to call them via
 * `platform.core.execute_connector_sub_action` using the
 * `connectorId` + `subAction` + `params` JSON shape in the attachment text.
 *
 * `resolve` attaches a connector by reference, reading it as the requesting user.
 */
export const createConnectorAttachmentType = ({
  getActionSavedObjectsClient,
  getActionsStart,
}: {
  getActionSavedObjectsClient: (request: KibanaRequest) => Promise<SavedObjectsClientContract>;
  getActionsStart: () => Promise<ActionsPluginStart>;
}): AttachmentTypeDefinition<AttachmentType.connector, ConnectorAttachmentData> => {
  const getSpecProvider = async (request: KibanaRequest) => {
    const actionsStart = await getActionsStart();
    return createConnectorSpecProvider({
      actionsStart,
      actionsClient: await actionsStart.getActionsClientWithRequest(request),
    });
  };

  return {
    id: AttachmentType.connector,

    isReadonly: true,

    resolve: async (origin, { request }) => {
      const soClient = await getActionSavedObjectsClient(request);
      const { attributes } = await soClient.get<{
        name?: string;
        actionTypeId: string;
        config?: Record<string, unknown>;
      }>('action', origin);
      const selectedActions = attributes.config?.selectedActions as SelectedActions;
      return {
        connector_id: origin,
        connector_name: attributes.name ?? origin,
        connector_type: attributes.actionTypeId,
        ...(isSpecificActionsSelection(selectedActions)
          ? { selected_actions: selectedActions }
          : {}),
      };
    },

    validate: (input) => {
      const parseResult = connectorAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }
      return { valid: false, error: parseResult.error.message };
    },

    format: async (attachment, { request }) => {
      const {
        connector_id: connectorId,
        connector_name: connectorName,
        connector_type: connectorType,
        selected_actions: selectedActions,
      } = attachment.data;

      const specProvider = await getSpecProvider(request);
      const spec = await specProvider.getSpecDetail(connectorType);
      const subActionEntries = spec
        ? filterSpecActionsBySelection(spec.actions, selectedActions)
        : [];

      return {
        getRepresentation: () => {
          const description = spec?.description ?? connectorType;
          const toolId = platformCoreTools.executeConnectorSubAction;

          const parts: string[] = [
            `Connector: ${connectorName} (${connectorType})`,
            `Description: ${description}`,
            `Connector ID: ${connectorId}`,
            '',
            `Required JSON shape for tool ${toolId}:`,
            `{"connectorId":"${connectorId}","subAction":"<sub-action name>","params":{ ... }}`,
            subActionEntries.length > 0
              ? 'Use a sub-action name exactly as listed below; pass its arguments only inside params, not as top-level keys.'
              : 'Put every sub-action argument inside params; use names documented for this connector type.',
          ];

          if (subActionEntries.length > 0) {
            parts.push('');
            parts.push(`Available sub-actions (call ${toolId} with connectorId="${connectorId}"):`);
            if (Array.isArray(selectedActions)) {
              parts.push('Note: only selected sub-actions are enabled; do not call others.');
            }
            for (const action of subActionEntries) {
              const paramsSummary = formatJsonSchemaForLlm(action.inputSchema);
              parts.push(`  - ${formatConnectorActionLine(action.name, action)}`);
              parts.push(`    Parameters: ${paramsSummary}`);
            }

            if (spec?.skill) {
              parts.push('');
              if (Array.isArray(selectedActions)) {
                parts.push(
                  'Note: not every action may be available on this instance. ' +
                    'Before calling any action, verify it appears in the list above.'
                );
                parts.push('');
              }
              parts.push(spec.skill);
            }
          }

          return { type: 'text', value: parts.join('\n') };
        },

        getBoundedTools: () => [],
      };
    },

    toSurfaceComposition: async (
      {
        data: {
          connector_name: connectorName,
          connector_type: connectorType,
          selected_actions: selectedActions,
        },
      },
      { request }
    ) => {
      const spec = await (await getSpecProvider(request)).getSpec(connectorType);
      const actionNames = spec
        ? filterSpecActionsBySelection(spec.actions, selectedActions).map(({ name }) => name)
        : [];
      const typeName = spec?.displayName ?? connectorType;
      const description = spec?.description;

      const fields: ComponentsNode = {
        type: 'fields',
        items: [
          {
            label: i18n.translate('xpack.agentBuilderPlatform.attachments.connector.surface.type', {
              defaultMessage: 'Type',
            }),
            value: typeName,
          },
          ...(actionNames.length > 0
            ? [
                {
                  label: i18n.translate(
                    'xpack.agentBuilderPlatform.attachments.connector.surface.actions',
                    { defaultMessage: 'Actions' }
                  ),
                  value: actionNames.join(', '),
                },
              ]
            : []),
        ],
      };

      return {
        type: 'view',
        title: connectorName,
        body: [
          ...(description ? [{ type: 'markdown' as const, text: description }] : []),
          ...(typeName ? [fields] : []),
        ],
      };
    },

    getTools: () => [],

    getAgentDescription: () => {
      const toolId = platformCoreTools.executeConnectorSubAction;
      return (
        `A connector attachment describes one connector instance and its callable sub-actions. ` +
        `Call ${toolId} with JSON {"connectorId":"<id from attachment>","subAction":"<exact sub-action name>","params":{}}. ` +
        `Keep connectorId and subAction at the root; put all sub-action arguments under params.`
      );
    },
  };
};
