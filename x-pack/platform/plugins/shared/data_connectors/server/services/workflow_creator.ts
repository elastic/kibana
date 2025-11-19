/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import { ToolType } from '@kbn/onechat-common';
import type { OnechatPluginStart } from '@kbn/onechat-plugin/server';
import { kebabCase, lowerCase } from 'lodash';
import { createBraveSearchWorkflowTemplate } from '../workflows/brave_search_template';
import {
  createGoogleDriveWorkflowTemplate,
  // createGoogleDriveDownloadWorkflowTemplate,
} from '../workflows/google_drive_template';
import { createSlackWorkflowTemplate } from '../workflows/slack_template';
import { createNotionSearchWorkflowTemplates } from '../workflows/notion_template';
import type { StackConnectorCreatorService } from './ksc_creator';

export interface WorkflowCreatorService {
  createWorkflowForConnector(
    connectorId: string,
    connectorType: string,
    spaceId: string,
    request: KibanaRequest,
    feature?: string,
    secrets?: string
  ): Promise<[string[], string[], string]>;
  deleteKSCs?(stackConnectorIds: string[], request: KibanaRequest): Promise<void>;
  deleteWorkflows?(workflowIds: string[], spaceId: string, request: KibanaRequest): Promise<void>;
  deleteTools?(toolIds: string[], request: KibanaRequest): Promise<void>;
}

export class WorkflowCreator implements WorkflowCreatorService {
  constructor(
    private readonly logger: Logger,
    private readonly workflowsManagement: WorkflowsServerPluginSetup,
    private onechat?: OnechatPluginStart,
    private stackConnectorCreator?: StackConnectorCreatorService
  ) {}

  public setOnechat(onechat: OnechatPluginStart) {
    this.onechat = onechat;
  }

  /**
   * Creates a workflow for a given connector
   * @param connectorId - The ID of the workplace connector
   * @param connectorType - The type of connector (e.g., 'brave_search')
   * @param spaceId - The space ID where the workflow should be created
   * @param request - The Kibana request object
   * @param feature - Optional feature flag
   * @param secrets - Optional secrets (OAuth token for Notion)
   * @returns The ID of the created workflow
   */
  async createWorkflowForConnector(
    connectorId: string,
    connectorType: string,
    spaceId: string,
    request: KibanaRequest,
    feature?: string,
    secrets?: string
  ): Promise<[string[], string[], string]> {
    this.logger.info(
      `Creating workflow for connector ${connectorId} of type ${connectorType} in space ${spaceId}`
    );
    let stackConnectorId = '';
    const toolIds: string[] = [];

    // For Notion connectors, create a Kibana stack connector first
    if (connectorType === 'notion' && this.stackConnectorCreator && secrets) {
      try {
        const connectorName = `Notion Connector for ${connectorId}`;
        stackConnectorId = await this.stackConnectorCreator.instantiateStackConnector(
          connectorName,
          connectorType,
          secrets,
          request,
          feature
        );
        this.logger.info(
          `Created Kibana stack connector ${stackConnectorId} for Notion connector ${connectorId}`
        );
      } catch (error) {
        this.logger.warn(
          `Failed to create Kibana stack connector for Notion: ${(error as Error).message}`
        );
        // Continue with workflow creation even if stack connector creation fails
      }
    }

    let workflowYamls: string[];

    // Get the appropriate template based on connector type
    // Template includes secret reference that will be resolved at runtime
    switch (connectorType) {
      case 'brave_search':
        workflowYamls = [createBraveSearchWorkflowTemplate(connectorId, feature)];
        break;
      case 'google_drive':
        workflowYamls = [createGoogleDriveWorkflowTemplate(connectorId, feature)];
        break;
      case 'slack':
        workflowYamls = [createSlackWorkflowTemplate(connectorId, feature)];
        break;
      case 'notion':
        workflowYamls = createNotionSearchWorkflowTemplates(stackConnectorId);
        break;
      default:
        throw new Error(`Unsupported connector type: ${connectorType}`);
    }

    const workflowIds: string[] = [];
    for (const workflowYaml of workflowYamls) {
      try {
        // Create the workflow using the workflows management API
        const workflow = await this.workflowsManagement.management.createWorkflow(
          {
            yaml: workflowYaml,
          },
          spaceId,
          request
        );
        workflowIds.push(workflow.id);

        this.logger.info(
          `Successfully created workflow ${workflow.id} for connector ${connectorId}`
        );

        // Optionally create a Onechat workflow tool tied to the created workflow
        try {
          if (this.onechat) {
            const registry = await this.onechat.tools.getRegistry({ request });
            const toolId = `${connectorType}.${kebabCase(lowerCase(workflow.name))}`;

            await registry.create({
              id: toolId,
              type: ToolType.workflow,
              description: workflow.description,
              configuration: {
                workflow_id: workflow.id,
              },
              tags: ['workplace_ai', connectorType, ...(feature ? [feature] : [])],
            });
            toolIds.push(toolId);
            this.logger.info(
              `Created Onechat workflow tool ${toolId} for workflow ${workflow.id} (connector ${connectorId})`
            );
          } else {
            this.logger.debug?.(
              `Onechat start contract not available; skipping tool creation for workflow ${workflow.id}`
            );
          }
        } catch (toolErr) {
          this.logger.warn(
            `Failed to create Onechat workflow tool for workflow ${workflow.id}: ` +
              (toolErr as Error).message
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to create workflow for connector ${connectorId}: ${error.message}`
        );
        throw error;
      }
    }
    return [workflowIds, toolIds, stackConnectorId];
  }

  public async deleteKSCs(stackConnectorIds: string[], request: KibanaRequest) {
    if (!this.stackConnectorCreator) {
      this.logger.info('Stack connector creator not available; skipping KSC deletion');
    }
    this.logger.info(`Deleting KSCs: ${stackConnectorIds.join(', ')}`);
    try {
      for (const stackConnectorId of stackConnectorIds) {
        await this.stackConnectorCreator.disconnectStackConnector(stackConnectorId, request);
      }
    } catch (e) {
      this.logger.warn(`Failed to delete KSCs: ${(e as Error).message}`);
    }
  }

  public async deleteWorkflows(workflowIds: string[], spaceId: string, request: KibanaRequest) {
    try {
      await this.workflowsManagement.management.deleteWorkflows(workflowIds, spaceId, request);
    } catch (e) {
      this.logger.warn(
        `Failed to delete workflows ${workflowIds.join(', ')}: ${(e as Error).message}`
      );
    }
  }

  public async deleteTools(toolIds: string[], request: KibanaRequest) {
    if (!this.onechat) return;
    try {
      const registry = await this.onechat.tools.getRegistry({ request });
      for (const id of toolIds) {
        try {
          await registry.delete(id);
        } catch (e) {
          this.logger.warn(`Failed to delete tool ${id}: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      this.logger.warn(`Failed to delete tools: ${(e as Error).message}`);
    }
  }
}
