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
import { getConnectorSpec } from '@kbn/connector-specs';

/**
 * Creates the definition for the `connector` attachment type.
 *
 * Connector attachments represent a connector instance attached to a conversation,
 * along with its available sub-actions. When a ConnectorSpec is found, the
 * sub-actions (with `isTool: true`) are listed directly from the spec so the
 * agent knows how to call them via the connector tool id `platform.core.execute_connector_sub_action`
 * using the `connectorId` + `subAction` + `params` JSON shape in the attachment text.
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
      } = attachment.data;

      const spec = getConnectorSpec(connectorType);
      const subActionEntries = spec
        ? Object.entries(spec.actions).filter(([, action]) => action.isTool)
        : [];

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
            for (const [actionName, action] of subActionEntries) {
              const actionDesc = action.description ?? actionName;
              const paramsSummary = action.input
                ? formatSchemaForLlm(action.input)
                : 'No parameters';
              parts.push(`  - ${actionName}: ${actionDesc}`);
              parts.push(`    Parameters: ${paramsSummary}`);
            }

            if (spec?.skill) {
              parts.push('');
              parts.push(spec.skill);
            }
          }

          return { type: 'text', value: parts.join('\n') };
        },

        getBoundedTools: () => [],
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
