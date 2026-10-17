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
import { formatSchemaForLlm } from '@kbn/agent-builder-server';
import {
  filterActionsBySelection,
  formatConnectorActionLine,
  getConnectorSpec,
} from '@kbn/connector-specs';
import { toBulletList } from './markdown';

/** The connector's spec, when known, and the sub-actions its instance enables. */
const getEnabledActions = ({
  connector_type: connectorType,
  selected_actions: selectedActions,
}: ConnectorAttachmentData) => {
  const spec = getConnectorSpec(connectorType);
  const actions = spec ? filterActionsBySelection(spec.actions, selectedActions) : [];

  return { spec, actions };
};

/**
 * Creates the definition for the `connector` attachment type.
 *
 * Connector attachments represent a connector instance attached to a conversation,
 * along with its available sub-actions. When a ConnectorSpec is found, the
 * sub-actions (recommended isTool actions, or an explicit selected_actions allowlist)
 * are listed so the agent knows how to call them via
 * `platform.core.execute_connector_sub_action` using the
 * `connectorId` + `subAction` + `params` JSON shape in the attachment text.
 */
export const createConnectorAttachmentType = (): AttachmentTypeDefinition<
  AttachmentType.connector,
  ConnectorAttachmentData
> => {
  return {
    id: AttachmentType.connector,

    isReadonly: true,

    validate: (input) => {
      const parseResult = connectorAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }
      return { valid: false, error: parseResult.error.message };
    },

    format: (attachment) => {
      const {
        connector_id: connectorId,
        connector_name: connectorName,
        connector_type: connectorType,
        selected_actions: selectedActions,
      } = attachment.data;

      const { spec, actions: subActionEntries } = getEnabledActions(attachment.data);

      return {
        getRepresentation: () => {
          const description = spec?.metadata.description ?? connectorType;
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
            for (const [actionName, action] of subActionEntries) {
              const paramsSummary = action.input
                ? formatSchemaForLlm(action.input)
                : 'No parameters';
              parts.push(`  - ${formatConnectorActionLine(actionName, action)}`);
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

    toSurfaceComposition: ({ data }) => {
      const { connector_name: connectorName, connector_type: connectorType } = data;
      const { spec, actions } = getEnabledActions(data);
      const actionNames = actions.map(([actionName]) => actionName);

      const text = [
        spec?.metadata.description,
        actionNames.length > 0 && `**Actions**\n${toBulletList(actionNames)}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      return {
        type: 'view',
        title: connectorName,
        subtitle: connectorType,
        body: text ? [{ type: 'markdown', text }] : [],
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
