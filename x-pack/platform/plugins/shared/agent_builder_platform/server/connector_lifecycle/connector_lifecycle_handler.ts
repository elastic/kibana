/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import type { Logger } from '@kbn/logging';
import { SEMANTIC_LAYER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type {
  ConnectorLifecyclePostCreateParams,
  ConnectorLifecyclePostDeleteParams,
} from '@kbn/actions-plugin/server';
import type { CoreStart } from '@kbn/core/server';
import type { SemanticLayerPluginStart } from '@kbn/semantic-layer-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';

interface ConnectorLifecycleHandlerDeps {
  logger: Logger;
  getStartServices: () => Promise<
    [CoreStart, { semanticLayer: SemanticLayerPluginStart; spaces?: SpacesPluginStart }, unknown]
  >;
}

export function createConnectorLifecycleHandler({ logger, getStartServices }: ConnectorLifecycleHandlerDeps) {
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
        const [coreStart, startDeps] = await getStartServices();
        const request = params.request;
        const soClient = coreStart.savedObjects.getScopedClient(request);
        const uiSettingsClient = coreStart.uiSettings.asScopedToClient(soClient);
        const isExperimentalFeaturesEnabled = await uiSettingsClient.get<boolean>(
          SEMANTIC_LAYER_EXPERIMENTAL_FEATURES_SETTING_ID
        );
        if (!isExperimentalFeaturesEnabled) return;

        const spaceId = startDeps.spaces?.spacesService?.getSpaceId(request) ?? 'default';
        await startDeps.semanticLayer.indexAttachment({
          request,
          originId: connectorId,
          attachmentType: AttachmentType.connector,
          action: 'create',
          spaceId,
        });
        logger.info(`Connector lifecycle: indexed connector ${connectorId} into SML`);
      } catch (error) {
        logger.warn(
          `Connector lifecycle: failed to handle post-create for connector ${connectorId} (type: ${connectorType}): ${
            (error as Error).message
          }`
        );
      }
    },

    async onPostDelete(params: ConnectorLifecyclePostDeleteParams): Promise<void> {
      const { connectorId, connectorType } = params;

      try {
        const [, startDeps] = await getStartServices();

        const request = params.request;
        const spaceId = startDeps.spaces?.spacesService?.getSpaceId(request) ?? 'default';
        await startDeps.semanticLayer.indexAttachment({
          request,
          originId: connectorId,
          attachmentType: AttachmentType.connector,
          action: 'delete',
          spaceId,
        });
        logger.info(`Connector lifecycle: removed connector ${connectorId} from SML`);
      } catch (error) {
        logger.warn(
          `Connector lifecycle: failed to clean up for connector ${connectorId} (type: ${connectorType}): ${
            (error as Error).message
          }`
        );
      }
    },
  };
}
