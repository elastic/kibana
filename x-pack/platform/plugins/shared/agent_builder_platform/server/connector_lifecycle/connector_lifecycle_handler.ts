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
import type { AgentBuilderSmlPluginStart } from '@kbn/agent-builder-sml-plugin/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { getConnectorSpec } from '@kbn/connector-specs';
import { isChatCallableConnectorType } from '../skills/connector_authoring/utils';

interface ConnectorLifecycleHandlerDeps {
  logger: Logger;
  getStartServices: () => Promise<
    [
      CoreStart,
      {
        spaces?: SpacesPluginStart;
        agentBuilderSml: AgentBuilderSmlPluginStart;
        agentBuilder: AgentBuilderPluginStart;
      },
      unknown
    ]
  >;
}

export function createConnectorLifecycleHandler(deps: ConnectorLifecycleHandlerDeps) {
  const { logger, getStartServices } = deps;

  return {
    async onPostCreate(params: ConnectorLifecyclePostCreateParams): Promise<void> {
      if (!params.wasSuccessful) {
        logger.debug(
          `Connector lifecycle: onPostCreate called with wasSuccessful=false for connector ${params.connectorId}`
        );
        return;
      }

      const { connectorId, connectorType } = params;

      // Skipping SML indexing for connector, because it can't be called from chat
      if (!isChatCallableConnectorType(connectorType)) {
        return;
      }

      try {
        const [coreStart, startDeps] = await getStartServices();
        const request = params.request;
        const soClient = coreStart.savedObjects.getScopedClient(request);
        const uiSettingsClient = coreStart.uiSettings.asScopedToClient(soClient);
        // SML ingest lives in the Agent Builder family, so crawling connectors
        // into SML requires only the Agent Builder experimental flag.
        const isExperimentalEnabled = await uiSettingsClient.get<boolean>(
          AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID
        );
        if (!isExperimentalEnabled) return;

        try {
          await startDeps.agentBuilderSml.indexAttachment({
            request,
            originId: connectorId,
            attachmentType: AttachmentType.connector,
            action: 'create',
            includedHiddenTypes: ['action'],
          });
          logger.info(`Connector lifecycle: indexed connector ${connectorId} into SML`);
        } catch (smlError) {
          logger.warn(
            `Connector lifecycle: failed to index connector ${connectorId} into SML: ${
              (smlError as Error).message
            }`
          );
        }

        const spec = getConnectorSpec(connectorType);
        if (spec?.skillFiles?.length) {
          const skillRegistry = await startDeps.agentBuilder.skills.getRegistry({ request });
          for (const skill of spec.skillFiles) {
            try {
              await skillRegistry.create({
                id: skill.name,
                name: skill.name,
                base_path: 'skills/platform/connectors',
                description: skill.description,
                content: skill.content,
                referenced_content: skill.resources?.map((r) => ({
                  name: r.name,
                  relativePath: r.relativePath,
                  content: r.content,
                })),
                tool_ids: [],
              });
              logger.info(
                `Connector lifecycle: installed skill "${skill.name}" for connector type ${connectorType}`
              );
            } catch (skillError) {
              const msg = (skillError as Error).message ?? '';
              const isConflict =
                (skillError as { statusCode?: number }).statusCode === 409 ||
                /conflict|already exists/i.test(msg);
              if (isConflict) {
                // Expected once the skill exists — user may have customized it, so leave it alone.
                logger.debug(
                  `Connector lifecycle: skill "${skill.name}" already exists for type ${connectorType}`
                );
              } else {
                logger.warn(
                  `Connector lifecycle: failed to install skill "${skill.name}" for type ${connectorType}: ${msg}`
                );
              }
            }
          }
        }
      } catch (error) {
        logger.error(
          `Connector lifecycle: failed to handle post-create for connector ${connectorId} (type: ${connectorType}): ${
            (error as Error).message
          }`
        );
      }
    },

    async onPostDelete(params: ConnectorLifecyclePostDeleteParams): Promise<void> {
      const { connectorId, connectorType } = params;

      logger.info(
        `Connector lifecycle: cleaning up deleted connector ${connectorId} (type: ${connectorType})`
      );

      try {
        const [, startDeps] = await getStartServices();
        const request = params.request;

        try {
          await startDeps.agentBuilderSml.indexAttachment({
            request,
            originId: connectorId,
            attachmentType: AttachmentType.connector,
            action: 'delete',
          });
          logger.info(`Connector lifecycle: removed connector ${connectorId} from SML`);
        } catch (smlError) {
          logger.warn(
            `Connector lifecycle: failed to remove connector ${connectorId} from SML: ${
              (smlError as Error).message
            }`
          );
        }
      } catch (error) {
        logger.error(
          `Connector lifecycle: failed to clean up for connector ${connectorId}: ${
            (error as Error).message
          }`
        );
      }
    },
  };
}
