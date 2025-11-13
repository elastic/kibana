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
import { createBraveSearchWorkflowTemplate } from '../workflows/brave_search_template';
import {
  createGoogleDriveWorkflowTemplate,
  // createGoogleDriveDownloadWorkflowTemplate,
} from '../workflows/google_drive_template';
import { createSlackWorkflowTemplate } from '../workflows/slack_template';

export interface WorkflowCreatorService {
  createWorkflowForConnector(
    connectorId: string,
    connectorType: string,
    spaceId: string,
    request: KibanaRequest,
    feature?: string
  ): Promise<string>;
  deleteWorkflows?(workflowIds: string[], spaceId: string, request: KibanaRequest): Promise<void>;
  deleteTools?(toolIds: string[], request: KibanaRequest): Promise<void>;
}

export class WorkflowCreator implements WorkflowCreatorService {
  constructor(
    private readonly logger: Logger,
    private readonly workflowsManagement: WorkflowsServerPluginSetup,
    private onechat?: OnechatPluginStart
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
   * @returns The ID of the created workflow
   */
  async createWorkflowForConnector(
    connectorId: string,
    connectorType: string,
    spaceId: string,
    request: KibanaRequest,
    feature?: string
  ): Promise<string> {
    this.logger.info(
      `Creating workflow for connector ${connectorId} of type ${connectorType} in space ${spaceId}`
    );

    let workflowYaml: string;

    // Get the appropriate template based on connector type
    // Template includes secret reference that will be resolved at runtime
    switch (connectorType) {
      case 'brave_search':
        workflowYaml = createBraveSearchWorkflowTemplate(connectorId, feature);
        break;
      case 'google_drive':
        workflowYaml = createGoogleDriveWorkflowTemplate(connectorId, feature);
        break;
      case 'slack':
        workflowYaml = createSlackWorkflowTemplate(connectorId, feature);
        break;
      default:
        throw new Error(`Unsupported connector type: ${connectorType}`);
    }

    try {
      // Create the workflow using the workflows management API
      const workflow = await this.workflowsManagement.management.createWorkflow(
        {
          yaml: workflowYaml,
        },
        spaceId,
        request
      );

      this.logger.info(`Successfully created workflow ${workflow.id} for connector ${connectorId}`);

      // Optionally create a Onechat workflow tool tied to the created workflow
      try {
        if (this.onechat) {
          const registry = await this.onechat.tools.getRegistry({ request });
          const suffix = feature ? `.${feature}` : '';
          const toolId = `${connectorType}${suffix}`.slice(0, 64);
          const toolDescription = `Workflow tool for ${connectorType}${
            suffix ? ` (${feature})` : ''
          }`;
          await registry.create({
            id: toolId,
            type: ToolType.workflow,
            description: toolDescription,
            configuration: {
              workflow_id: workflow.id,
            },
            tags: ['workplace_ai', connectorType, ...(feature ? [feature] : [])],
          });
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

      return workflow.id;
    } catch (error) {
      this.logger.error(`Failed to create workflow for connector ${connectorId}: ${error.message}`);
      throw error;
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
