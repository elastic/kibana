/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import type { SmlTypeDefinition } from '@kbn/agent-builder-sml-plugin/server';
import { kibanaSavedObjectPermissions } from '@kbn/agent-builder-sml-plugin/server';
import type { ConnectorAttachmentData } from '@kbn/agent-builder-common/attachments';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { getConnectorSpec } from '@kbn/connector-specs';
import { isChatCallableConnectorType } from '../skills/connector_authoring/utils';

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
 * Connectors are indexed into the SML via event-driven calls and during periodic crawls.
 */
export const createConnectorSmlType = (deps: ConnectorSmlTypeDeps): SmlTypeDefinition => {
  const { getActionSavedObjectsClient, logger } = deps;

  return {
    id: CONNECTOR_SML_TYPE,

    async *list(context) {
      const finder = context.savedObjectsClient.createPointInTimeFinder({
        type: 'action',
        perPage: 1000,
        namespaces: ['*'],
      });
      try {
        for await (const response of finder.find()) {
          yield response.saved_objects
            .filter((so) => {
              const { actionTypeId } = so.attributes as { actionTypeId?: string };
              return isChatCallableConnectorType(actionTypeId ?? '');
            })
            .map((so) => ({
              id: so.id,
              updatedAt: so.updated_at ?? new Date().toISOString(),
              spaces: so.namespaces ?? [],
            }));
        }
      } finally {
        await finder.close();
      }
    },

    getSmlEntry: async (originId, context) => {
      try {
        const so = await context.savedObjectsClient.get('action', originId);
        const attrs = so.attributes as {
          name?: string;
          actionTypeId?: string;
          config?: Record<string, unknown>;
        };
        const name = attrs.name ?? originId;
        const actionTypeId = attrs.actionTypeId ?? '';
        const selectedActions = attrs.config?.selectedActions as string[] | null | undefined;

        const spec = getConnectorSpec(actionTypeId);
        const displayName = spec?.metadata.displayName ?? actionTypeId;
        const description = spec?.metadata.description ?? '';

        const allSpecActions = spec?.actions ? Object.entries(spec.actions) : [];
        const toolActions = allSpecActions.filter(
          ([, action]) => action.isTool && action.description
        );

        // When selectedActions restricts the connector, only list callable actions and say so.
        const isRestricted = Array.isArray(selectedActions) && selectedActions.length > 0;
        const allowedSet = isRestricted ? new Set(selectedActions) : null;

        const visibleActions = allowedSet
          ? allSpecActions.filter(
              ([actionName, action]) => allowedSet.has(actionName) && action.description
            )
          : toolActions;
        const subActionDescriptions = visibleActions.map(([actionName, action]) => {
          const hitlSuffix = !action.isTool ? ' (requires user confirmation before calling)' : '';
          return `${actionName}: ${action.description}${hitlSuffix}`;
        });

        const headerParts = [...new Set([name, displayName, description].filter(Boolean))];
        const contentParts = [
          ...headerParts,
          ...(isRestricted ? ['Only these actions are callable:'] : []),
          ...subActionDescriptions,
        ];

        return {
          type: CONNECTOR_SML_TYPE,
          title: name,
          content: contentParts.join('\n'),
          discovery_labels: [{ kind: 'shortcut', value: `${CONNECTOR_SML_TYPE}/${name}` }],
        };
      } catch (error) {
        context.logger.warn(
          `SML connector: failed to get data for '${originId}': ${(error as Error).message}`
        );
        return undefined;
      }
    },

    requiredHiddenTypes: ['action'],

    getPermissions: () => kibanaSavedObjectPermissions({ savedObjectType: 'action' }),

    toAttachment: async (item, context) => {
      try {
        const soClient = await getActionSavedObjectsClient(context.request);
        const originId = item.origin_id ?? '';
        const so = await soClient.get('action', originId);
        const attrs = so.attributes as {
          name?: string;
          actionTypeId?: string;
          config?: Record<string, unknown>;
        };
        const connectorName = attrs.name ?? originId;
        const connectorType = attrs.actionTypeId ?? '';
        const attachmentSelectedActions = attrs.config?.selectedActions as
          | string[]
          | null
          | undefined;

        const data: ConnectorAttachmentData = {
          connector_id: originId,
          connector_name: connectorName,
          connector_type: connectorType,
          ...(Array.isArray(attachmentSelectedActions) && attachmentSelectedActions.length > 0
            ? { selected_actions: attachmentSelectedActions }
            : {}),
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
