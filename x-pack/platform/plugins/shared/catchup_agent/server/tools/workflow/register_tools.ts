/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0"; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolsSetup } from '@kbn/onechat-server';
import type { Logger } from '@kbn/logging';
import {
  workflowToolSummarizerTool,
  workflowSecuritySummaryTool,
  workflowSlackTool,
  workflowCorrelationEngineTool,
  workflowRerankTool,
  workflowSummaryGeneratorTool,
} from './workflow_simplified_tools';

/**
 * Registers workflow-specific simplified tools.
 * These tools wrap the original tools and simplify their responses
 * to avoid Elasticsearch mapping issues when used in workflows.
 */
export function registerWorkflowTools(toolsSetup: ToolsSetup, logger: Logger): void {
  try {
    logger.info('Registering workflow-specific simplified tools...');

    toolsSetup.register(workflowToolSummarizerTool());
    logger.info(
      'Registered workflow tool summarizer (hackathon.catchup.workflow_tool_summarizer)'
    );

    toolsSetup.register(workflowSecuritySummaryTool());
    logger.info(
      'Registered workflow security summary tool (hackathon.catchup.workflow.security.summary)'
    );

    toolsSetup.register(workflowSlackTool());
    logger.info('Registered workflow Slack tool (hackathon.catchup.workflow.external.slack)');

    toolsSetup.register(workflowCorrelationEngineTool());
    logger.info(
      'Registered workflow correlation engine tool (hackathon.catchup.workflow.correlation.engine)'
    );

    toolsSetup.register(workflowRerankTool());
    logger.info(
      'Registered workflow rerank tool (hackathon.catchup.workflow.prioritization.rerank)'
    );

    const summaryTool = workflowSummaryGeneratorTool();
    toolsSetup.register(summaryTool);
    logger.info(
      `Registered workflow summary generator tool (${
        summaryTool.id
      }) - handler present: ${!!summaryTool.handler}`
    );

    logger.info('Workflow-specific simplified tools registered successfully');
  } catch (error) {
    logger.error(
      `Failed to register workflow tools: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}
