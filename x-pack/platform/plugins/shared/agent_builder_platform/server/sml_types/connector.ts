/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import type { SmlTypeDefinition } from '@kbn/agent-builder-plugin/server';
import type { ToolRegistry } from '@kbn/agent-builder-server';
import type { ConnectorAttachmentData } from '@kbn/agent-builder-common/attachments';
import { AttachmentType, CONNECTOR_TAG_PREFIX } from '@kbn/agent-builder-common/attachments';
import { getConnectorSpec, getWorkflowTemplatesForConnector } from '@kbn/connector-specs';

const CONNECTOR_SML_TYPE = 'connector';

interface ConnectorSmlTypeDeps {
  getToolRegistry: (request: KibanaRequest) => Promise<ToolRegistry>;
  /**
   * Returns a saved objects client scoped to the given request that can read
   * hidden `action` saved objects. Uses `includedHiddenTypes: ['action']` so
   * the client respects the user's security context while still accessing the
   * hidden type.
   */
  getActionSavedObjectsClient: (request: KibanaRequest) => Promise<SavedObjectsClientContract>;
  logger: Logger;
}

/**
 * Parses a workflow YAML template and extracts metadata relevant to SML.
 * Returns the tag check and description in a single parse pass.
 */
const parseWorkflowTemplate = (
  yamlTemplate: string
): { hasAgentBuilderToolTag: boolean; description?: string } => {
  try {
    const parsed = parse(yamlTemplate);
    return {
      hasAgentBuilderToolTag: parsed?.tags?.includes('agent-builder-tool') ?? false,
      description: typeof parsed?.description === 'string' ? parsed.description : undefined,
    };
  } catch {
    return { hasAgentBuilderToolTag: false };
  }
};

/**
 * Creates the SML type definition for connectors.
 *
 * Connectors are indexed into the SML exclusively via event-driven calls
 * in the connector lifecycle handler (onPostCreate / onPostDelete).
 * No crawling is needed — `list` yields nothing and `fetchFrequency` is omitted.
 *
 * A factory function is used because `toAttachment()` needs access to the tool
 * registry, which requires a scoped request not available in the `SmlToAttachmentContext`.
 */
export const createConnectorSmlType = (deps: ConnectorSmlTypeDeps): SmlTypeDefinition => {
  const { getToolRegistry, getActionSavedObjectsClient, logger } = deps;

  return {
    id: CONNECTOR_SML_TYPE,

    // Connectors are indexed exclusively via event-driven lifecycle hooks.
    // The list method yields nothing — no crawling is performed.
    list: (_context) => ({
      [Symbol.asyncIterator]: () => ({ next: async () => ({ done: true as const, value: [] }) }),
    }),

    getSmlData: async (originId, context) => {
      if (!context.request) {
        throw new Error(
          `SML connector: no request available for '${originId}' — cannot create scoped client`
        );
      }
      try {
        const soClient = await getActionSavedObjectsClient(context.request);
        const so = await soClient.get('action', originId);
        const attrs = so.attributes as { name?: string; actionTypeId?: string };
        const name = attrs.name ?? originId;
        const actionTypeId = attrs.actionTypeId ?? '';

        const spec = getConnectorSpec(actionTypeId);
        const displayName = spec?.metadata.displayName ?? actionTypeId;
        const description = spec?.metadata.description ?? '';

        const templates = getWorkflowTemplatesForConnector(actionTypeId);
        const toolDescriptions = templates
          .map(parseWorkflowTemplate)
          .filter((t) => t.hasAgentBuilderToolTag && t.description)
          .map((t) => t.description!);

        const contentParts = [
          ...new Set([name, displayName, description, ...toolDescriptions].filter(Boolean)),
        ];

        return {
          chunks: [
            {
              type: CONNECTOR_SML_TYPE,
              title: name,
              content: contentParts.join('\n'),
              permissions: ['action:execute'],
            },
          ],
        };
      } catch (error) {
        context.logger.warn(
          `SML connector: failed to get data for '${originId}': ${(error as Error).message}`
        );
        return undefined;
      }
    },

    toAttachment: async (item, context) => {
      try {
        const soClient = await getActionSavedObjectsClient(context.request);
        const so = await soClient.get('action', item.origin_id);
        const attrs = so.attributes as { name?: string; actionTypeId?: string };
        const connectorName = attrs.name ?? item.origin_id;
        const connectorType = attrs.actionTypeId ?? '';

        const toolRegistry = await getToolRegistry(context.request);
        const connectorTag = `${CONNECTOR_TAG_PREFIX}${item.origin_id}`;
        const connectorTools = await toolRegistry.list({ tags: [connectorTag] });

        const tools: ConnectorAttachmentData['tools'] = connectorTools.map((tool) => ({
          tool_id: tool.id,
          description: tool.description,
          configuration: {
            workflow_id:
              ((tool.configuration as Record<string, unknown>)?.workflow_id as string) ?? '',
          },
        }));

        const data: ConnectorAttachmentData = {
          connector_id: item.origin_id,
          connector_name: connectorName,
          connector_type: connectorType,
          tools,
        };

        return {
          type: AttachmentType.connector,
          data,
        };
      } catch (error) {
        logger.warn(
          `SML connector: failed to convert '${item.origin_id}' to attachment: ${
            (error as Error).message
          }`
        );
        return undefined;
      }
    },
  };
};
