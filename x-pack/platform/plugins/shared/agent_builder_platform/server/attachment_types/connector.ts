/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
 * agent knows how to call them via `execute_connector_sub_action`.
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

          const parts: string[] = [
            `Connector: ${connectorName} (${connectorType})`,
            `Description: ${description}`,
            `Connector ID: ${connectorId}`,
          ];

          if (subActionEntries.length > 0) {
            parts.push('');
            parts.push(
              'Available sub-actions (use the execute_connector_sub_action tool with ' +
                `connectorId="${connectorId}"):`
            );
            for (const [actionName, action] of subActionEntries) {
              const actionDesc = action.description ?? actionName;
              const paramsSummary = action.input
                ? formatSchemaForLlm(action.input)
                : 'No parameters';
              parts.push(`  - ${actionName}: ${actionDesc}`);
              parts.push(`    Parameters: ${paramsSummary}`);
            }

            // Include skill content after the sub-action listing
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
      return 'A connector attachment represents an external service connector with available sub-actions. Use the execute_connector_sub_action tool with the connector ID and sub-action name to interact with the external service.';
    },
  };
};
