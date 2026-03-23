/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OpeningAndClosingTags } from 'mustache';
import Mustache from 'mustache';
import { parse } from 'yaml';
import { trimStart } from 'lodash';
import { ToolType } from '@kbn/agent-builder-common';
import { AttachmentType, CONNECTOR_TAG_PREFIX } from '@kbn/agent-builder-common/attachments';
import { toolIdMaxLength } from '@kbn/agent-builder-common/tools';
import type { Logger } from '@kbn/logging';
import type { WorkflowYaml } from '@kbn/workflows';
import { AGENT_BUILDER_CONNECTORS_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import type {
  ConnectorLifecyclePostCreateParams,
  ConnectorLifecyclePostDeleteParams,
} from '@kbn/actions-plugin/server';
import type { CoreStart } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { ServiceManager } from '..';

const TEMPLATE_DELIMITERS: OpeningAndClosingTags = ['<%=', '%>'];

interface ConnectorLifecycleHandlerDeps {
  serviceManager: ServiceManager;
  workflowsManagement?: WorkflowsServerPluginSetup;
  logger: Logger;
  getStartServices: () => Promise<[CoreStart, { spaces?: SpacesPluginStart }, unknown]>;
}

function renderWorkflowTemplate(
  rawYaml: string,
  templateInputs: Record<string, string>
): { content: string; shouldGenerateABTool: boolean } {
  const content = Mustache.render(rawYaml, templateInputs, {}, TEMPLATE_DELIMITERS);
  const parsed = parse(content);
  const shouldGenerateABTool = parsed?.tags?.includes('agent-builder-tool') ?? false;
  return { content, shouldGenerateABTool };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function createConnectorLifecycleHandler(deps: ConnectorLifecycleHandlerDeps) {
  const { serviceManager, workflowsManagement, logger, getStartServices } = deps;

  return {
    async onPostCreate(params: ConnectorLifecyclePostCreateParams): Promise<void> {
      if (!params.wasSuccessful) {
        logger.error(
          `Connector lifecycle: onPostCreate called with wasSuccessful=false for connector ${params.connectorId}`
        );
        return;
      }

      const { connectorId, connectorName, connectorType } = params;

      const { workflowTemplates } = params;
      if (!workflowTemplates.length) return;

      try {
        const internalServices = serviceManager.internalStart;
        if (!internalServices) {
          logger.error('Connector lifecycle: services not started yet, cannot create workflows');
          return;
        }

        // Check the feature flag at runtime rather than at registration time,
        // because UI settings aren't available during plugin setup and the flag
        // can be toggled without a restart.
        const request = params.request;
        const soClient = internalServices.savedObjects.getScopedClient(request);
        const uiSettingsClient = internalServices.uiSettings.asScopedToClient(soClient);
        const isConnectorsEnabled = await uiSettingsClient.get<boolean>(
          AGENT_BUILDER_CONNECTORS_ENABLED_SETTING_ID
        );
        if (!isConnectorsEnabled) return;

        if (!workflowsManagement) {
          logger.warn('Connector lifecycle: workflows management plugin is not available');
          return;
        }

        logger.info(
          `Connector lifecycle: creating workflows/tools for connector ${connectorId} (type: ${connectorType})`
        );

        const connectorTypeKey = trimStart(connectorType, '.');
        const templateInputs: Record<string, string> = {
          [`${connectorTypeKey}-stack-connector-id`]: connectorId,
        };

        const workflowInfos = workflowTemplates.map((rawYaml) =>
          renderWorkflowTemplate(rawYaml, templateInputs)
        );

        const toolRegistry = await internalServices.tools.getRegistry({ request });
        const connectorTag = `${CONNECTOR_TAG_PREFIX}${connectorId}`;
        const slugifiedConnectorName = slugify(connectorName);

        await Promise.all(
          workflowInfos.map(async (workflowInfo) => {
            const parsed: WorkflowYaml = parse(workflowInfo.content);
            const originalName = parsed?.name ?? 'workflow';
            const workflowBaseName = originalName.split('.').pop() || originalName;
            const prefixedName = `${connectorTypeKey}.${slugifiedConnectorName}.${workflowBaseName}`;

            const updatedContent = workflowInfo.content.replace(
              /^name:\s*['"]?[^'"\n]+['"]?/m,
              `name: "${prefixedName}"`
            );

            const workflow = await workflowsManagement.management.createWorkflow(
              { yaml: updatedContent },
              'default',
              request
            );

            logger.info(
              `Connector lifecycle: created workflow '${workflow.name}' (id: ${workflow.id})`
            );

            if (workflowInfo.shouldGenerateABTool) {
              const workflowDescription =
                typeof parsed?.description === 'string'
                  ? parsed.description
                  : `Workflow tool for ${connectorTypeKey} connector`;

              const toolId = `${connectorTypeKey}.${slugifiedConnectorName}.${workflowBaseName}`;

              if (toolId.length > toolIdMaxLength) {
                logger.warn(
                  `Connector lifecycle: generated tool ID '${toolId}' exceeds ${toolIdMaxLength} chars (${toolId.length}), skipping tool creation for workflow '${workflow.name}'`
                );
                return;
              }

              const tool = await toolRegistry.create({
                id: toolId,
                type: ToolType.workflow,
                description: workflowDescription,
                tags: ['connector', connectorTypeKey, connectorTag],
                configuration: {
                  workflow_id: workflow.id,
                },
              });

              logger.info(
                `Connector lifecycle: created tool '${tool.id}' for workflow '${workflow.name}'`
              );
            }
          })
        );

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
          `Connector lifecycle: failed to create workflows/tools for connector ${connectorId}: ${error.message}`
        );
      }
    },

    async onPostDelete(params: ConnectorLifecyclePostDeleteParams): Promise<void> {
      const { connectorId, connectorType } = params;

      logger.info(
        `Connector lifecycle: cleaning up workflows/tools for deleted connector ${connectorId} (type: ${connectorType})`
      );

      try {
        const internalServices = serviceManager.internalStart;
        if (!internalServices) {
          logger.error('Connector lifecycle: services not started yet, cannot clean up');
          return;
        }

        const request = params.request;
        const toolRegistry = await internalServices.tools.getRegistry({ request });
        const connectorTag = `${CONNECTOR_TAG_PREFIX}${connectorId}`;
        const connectorTools = await toolRegistry.list({ tags: [connectorTag] });

        // Collect workflow IDs before deleting tools, then delete both in parallel
        const workflowIds = connectorTools
          .map((tool) => (tool.configuration as Record<string, unknown>)?.workflow_id as string)
          .filter(Boolean);

        const deleteToolsPromise = Promise.all(
          connectorTools.map(async (tool) => {
            await toolRegistry.delete(tool.id);
            logger.info(`Connector lifecycle: deleted tool '${tool.id}'`);
          })
        );

        const deleteWorkflowsPromise =
          workflowsManagement && workflowIds.length > 0
            ? workflowsManagement.management
                .deleteWorkflows(workflowIds, 'default', request)
                .then(() => {
                  logger.info(
                    `Connector lifecycle: deleted ${workflowIds.length} workflow(s) for connector ${connectorId}`
                  );
                })
            : Promise.resolve();

        await Promise.all([deleteToolsPromise, deleteWorkflowsPromise]);

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
