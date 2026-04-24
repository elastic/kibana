/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import type { Logger } from '@kbn/logging';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type {
  ConnectorLifecyclePostCreateParams,
  ConnectorLifecyclePostDeleteParams,
} from '@kbn/actions-plugin/server';
import type { CoreStart } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { ServiceManager } from '..';

interface ConnectorLifecycleHandlerDeps {
  serviceManager: ServiceManager;
  logger: Logger;
  getStartServices: () => Promise<[CoreStart, { spaces?: SpacesPluginStart }, unknown]>;
}

export function createConnectorLifecycleHandler(deps: ConnectorLifecycleHandlerDeps) {
  const { serviceManager, logger, getStartServices } = deps;

  return {
    async onPostCreate(params: ConnectorLifecyclePostCreateParams): Promise<void> {
      if (!params.wasSuccessful) {
        logger.error(
          `Connector lifecycle: onPostCreate called with wasSuccessful=false for connector ${params.connectorId}`
        );
        return;
      }

      const { connectorId, connectorType } = params;

      try {
        const internalServices = serviceManager.internalStart;
        if (!internalServices) {
          logger.error('Connector lifecycle: services not started yet');
          return;
        }

        // Check the feature flag at runtime rather than at registration time,
        // because UI settings aren't available during plugin setup and the flag
        // can be toggled without a restart.
        const request = params.request;
        const soClient = internalServices.savedObjects.getScopedClient(request);
        const uiSettingsClient = internalServices.uiSettings.asScopedToClient(soClient);
        const isExperimentalFeaturesEnabled = await uiSettingsClient.get<boolean>(
          AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID
        );
        if (!isExperimentalFeaturesEnabled) return;

        // Index the connector into SML for immediate discoverability
        const sml = serviceManager.internalStart?.sml;
        if (sml) {
          try {
            const [coreStart, startDeps] = await getStartServices();
            const spaceId = startDeps.spaces?.spacesService?.getSpaceId(request) ?? 'default';
            await sml.indexAttachment({
              originId: connectorId,
              attachmentType: AttachmentType.connector,
              action: 'create',
              spaces: [spaceId],
              esClient: coreStart.elasticsearch.client.asInternalUser,
              savedObjectsClient: coreStart.savedObjects.getScopedClient(request, {
                includedHiddenTypes: ['action'],
              }),
              logger,
            });
            logger.info(`Connector lifecycle: indexed connector ${connectorId} into SML`);
          } catch (smlError) {
            logger.warn(
              `Connector lifecycle: failed to index connector ${connectorId} into SML: ${
                (smlError as Error).message
              }`
            );
          }
        }
      } catch (error) {
        logger.error(
          `Connector lifecycle: failed to handle post-create for connector ${connectorId} (type: ${connectorType}): ${error.message}`
        );
      }
    },

    async onPostDelete(params: ConnectorLifecyclePostDeleteParams): Promise<void> {
      const { connectorId, connectorType } = params;

      logger.info(
        `Connector lifecycle: cleaning up deleted connector ${connectorId} (type: ${connectorType})`
      );

      try {
        const internalServices = serviceManager.internalStart;
        if (!internalServices) {
          logger.error('Connector lifecycle: services not started yet, cannot clean up');
          return;
        }

        const request = params.request;

        // Remove the connector from SML
        const sml = serviceManager.internalStart?.sml;
        if (sml) {
          try {
            const [coreStart, startDeps] = await getStartServices();
            const spaceId = startDeps.spaces?.spacesService?.getSpaceId(request) ?? 'default';
            await sml.indexAttachment({
              originId: connectorId,
              attachmentType: AttachmentType.connector,
              action: 'delete',
              spaces: [spaceId],
              esClient: coreStart.elasticsearch.client.asInternalUser,
              savedObjectsClient: coreStart.savedObjects.getScopedClient(request, {
                includedHiddenTypes: ['action'],
              }),
              logger,
            });
            logger.info(`Connector lifecycle: removed connector ${connectorId} from SML`);
          } catch (smlError) {
            logger.warn(
              `Connector lifecycle: failed to remove connector ${connectorId} from SML: ${
                (smlError as Error).message
              }`
            );
          }
        }
      } catch (error) {
        logger.error(
          `Connector lifecycle: failed to clean up for connector ${connectorId}: ${error.message}`
        );
      }
    },
  };
}
