/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolsSetup } from '@kbn/onechat-plugin/server';
import type { Logger } from '@kbn/logging';
import { workflowToolSummarizerTool } from './workflow_simplified_tools';

/**
 * Registers workflow-specific simplified tools.
 * These tools wrap the original tools and simplify their responses
 * to avoid Elasticsearch mapping issues when used in workflows.
 */
export function registerWorkflowTools(toolsSetup: ToolsSetup, logger: Logger): void {
  try {
    toolsSetup.register(workflowToolSummarizerTool());
  } catch (error) {
    logger.error(
      `Failed to register workflow tools: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}
