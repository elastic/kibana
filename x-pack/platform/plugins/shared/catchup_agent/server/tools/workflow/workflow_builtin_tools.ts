/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StaticWorkflowTool } from '@kbn/onechat-server/tools';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { ToolsSetup } from '@kbn/onechat-plugin/server';
import type { Logger } from '@kbn/logging';

/**
 * Finds a workflow by exact name match
 */
async function findWorkflowByName(
  workflowsManagement: WorkflowsServerPluginSetup,
  workflowName: string,
  spaceId: string
): Promise<string | null> {
  try {
    const workflows = await workflowsManagement.management.getWorkflows(
      {
        page: 1,
        limit: 1000, // Get a large number to ensure we find the workflow
        query: '', // Empty query to get all workflows
      },
      spaceId
    );

    // Find workflow with exact name match (case-sensitive)
    const matchingWorkflow = workflows.results?.find((w) => w.name === workflowName);

    if (matchingWorkflow) {
      return matchingWorkflow.id;
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Creates a workflow tool definition
 */
export function createWorkflowTool(
  toolId: string,
  description: string,
  workflowId: string
): StaticWorkflowTool {
  return {
    id: toolId,
    type: 'workflow' as const,
    description,
    tags: [],
    configuration: {
      workflow_id: workflowId,
    },
  };
}

/**
 * Registers builtin workflow tools by querying workflows by name
 */
export async function registerWorkflowBuiltinTools(
  workflowsManagement: WorkflowsServerPluginSetup | undefined,
  toolsSetup: ToolsSetup,
  logger: Logger,
  spaceId: string
): Promise<void> {
  if (!workflowsManagement?.management) {
    logger.warn(
      'Workflows Management not available. Cannot register workflow builtin tools.'
    );
    return;
  }

  try {
    // Find workflows by name
    const dailySecurityCatchupId = await findWorkflowByName(
      workflowsManagement,
      'Daily Security Catchup',
      spaceId
    );

    const incidentInvestigationId = await findWorkflowByName(
      workflowsManagement,
      'Incident Investigation',
      spaceId
    );

    // Register Daily Security Catchup tool
    if (dailySecurityCatchupId) {
      const tool = createWorkflowTool(
        'workflow.daily_security_catchup',
        'Call this tool for a daily security catchup.',
        dailySecurityCatchupId
      );
      toolsSetup.register(tool);
      logger.info(
        `Registered workflow tool: workflow.daily_security_catchup with workflow_id: ${dailySecurityCatchupId}`
      );
    } else {
      logger.warn(
        'Workflow "Daily Security Catchup" not found. Tool workflow.daily_security_catchup will not be registered.'
      );
    }

    // Register Incident Investigation tool
    if (incidentInvestigationId) {
      const tool = createWorkflowTool(
        'workflow.incidient_investigation',
        'Comprehensive incident investigation workflow that fetches security and observability data (alerts, cases, attack discoveries), extracts entities (host.name, user.name, service.name) from the incident, and correlates those entities across observability, security, and Slack',
        incidentInvestigationId
      );
      toolsSetup.register(tool);
      logger.info(
        `Registered workflow tool: workflow.incidient_investigation with workflow_id: ${incidentInvestigationId}`
      );
    } else {
      logger.warn(
        'Workflow "Incident Investigation" not found. Tool workflow.incidient_investigation will not be registered.'
      );
    }
  } catch (error) {
    logger.error(
      `Failed to register workflow builtin tools: ${error instanceof Error ? error.message : String(error)}`
    );
    if (error instanceof Error && error.stack) {
      logger.error(error.stack);
    }
  }
}

