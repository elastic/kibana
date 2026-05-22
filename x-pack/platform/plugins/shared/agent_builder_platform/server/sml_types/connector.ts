/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import type { SmlTypeDefinition } from '@kbn/agent-context-layer-plugin/server';
import type { ConnectorAttachmentData } from '@kbn/agent-builder-common/attachments';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { getConnectorSpec } from '@kbn/connector-specs';

const CONNECTOR_SML_TYPE = 'connector';

interface ConnectorSmlTypeDeps {
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
 * Creates the SML type definition for connectors.
 *
 * Connectors are indexed into the SML exclusively via event-driven calls
 * in the connector lifecycle handler (onPostCreate / onPostDelete).
 * No crawling is needed — `list` yields nothing and `fetchFrequency` is omitted.
 */
export const createConnectorSmlType = (deps: ConnectorSmlTypeDeps): SmlTypeDefinition => {
  const { getActionSavedObjectsClient, logger } = deps;

  return {
    id: CONNECTOR_SML_TYPE,

    // Connectors are indexed exclusively via event-driven lifecycle hooks.
    // The list method yields nothing — no crawling is performed.
    list: (_context) => ({
      [Symbol.asyncIterator]: () => ({ next: async () => ({ done: true as const, value: [] }) }),
    }),

    getSmlData: async (originId, context) => {
      try {
        const so = await context.savedObjectsClient.get('action', originId);
        const attrs = so.attributes as { name?: string; actionTypeId?: string };
        const name = attrs.name ?? originId;
        const actionTypeId = attrs.actionTypeId ?? '';

        const spec = getConnectorSpec(actionTypeId);
        const displayName = spec?.metadata.displayName ?? actionTypeId;
        const description = spec?.metadata.description ?? '';

        // Include sub-action descriptions from the ConnectorSpec
        const subActionDescriptions = spec?.actions
          ? Object.entries(spec.actions)
              .filter(([, action]) => action.isTool && action.description)
              .map(([actionName, action]) => `${actionName}: ${action.description}`)
          : [];

        const contentParts = [
          ...new Set([name, displayName, description, ...subActionDescriptions].filter(Boolean)),
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

        const data: ConnectorAttachmentData = {
          connector_id: item.origin_id,
          connector_name: connectorName,
          connector_type: connectorType,
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
