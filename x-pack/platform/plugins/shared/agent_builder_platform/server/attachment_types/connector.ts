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
import { ToolType } from '@kbn/agent-builder-common';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { WorkflowAttachmentBoundedTool } from '@kbn/agent-builder-server/attachments/tools';
import { getConnectorSpec } from '@kbn/connector-specs';

/**
 * Creates the definition for the `connector` attachment type.
 *
 * Connector attachments represent a connector instance attached to a conversation,
 * along with its workflow tools. The tools are embedded in the attachment data
 * (populated by the connector lifecycle hook at creation time) so that
 * `getBoundedTools()` is self-contained without needing tool registry access.
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
        connector_name: connectorName,
        connector_type: connectorType,
        tools,
      } = attachment.data;

      return {
        getRepresentation: () => {
          const spec = getConnectorSpec(connectorType);
          const description = spec?.metadata.description ?? connectorType;

          const parts: string[] = [
            `Connector: ${connectorName} (${connectorType})`,
            `Description: ${description}`,
          ];

          if (tools.length > 0) {
            parts.push('Available tools:');
            for (const tool of tools) {
              parts.push(`  - ${tool.tool_id}: ${tool.description}`);
            }
          }

          return { type: 'text', value: parts.join('\n') };
        },

        getBoundedTools: (): WorkflowAttachmentBoundedTool[] => {
          return tools.map((tool) => ({
            id: tool.tool_id,
            type: ToolType.workflow,
            description: tool.description,
            configuration: { workflow_id: tool.configuration.workflow_id },
          }));
        },
      };
    },

    getTools: () => [],

    getAgentDescription: () => {
      return 'A connector attachment represents an external service connector with its associated workflow tools. The tools provided by the connector can be used to interact with the external service.';
    },
  };
};
