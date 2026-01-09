/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';
import { platformCoreTools } from '@kbn/onechat-common';
import { z } from '@kbn/zod';
import { tool } from '@langchain/core/tools';
import type { ToolHandlerContext } from '@kbn/onechat-server/tools';

const getOneChatContext = (config: unknown): Omit<ToolHandlerContext, 'resultStore'> | null => {
  if (!config || typeof config !== 'object') {
    return null;
  }

  const maybeConfig = config as {
    configurable?: { onechat?: Omit<ToolHandlerContext, 'resultStore'> };
  };

  return maybeConfig.configurable?.onechat ?? null;
};

const PLATFORM_WORKFLOWS_LOGS_TOOL = tool(
  async (input, config) => {
    const onechat = getOneChatContext(config);
    if (!onechat) {
      throw new Error('OneChat context not available');
    }

    const asAny = input as any;
    const { operation, params, ...rest } = asAny ?? {};

    const toolId =
      operation === 'get_logs'
        ? platformCoreTools.getWorkflowExecutionLogs
        : platformCoreTools.getWorkflowExecutionStatus;

    const available = await onechat.toolProvider.has({ toolId, request: onechat.request });
    if (!available) {
      return JSON.stringify({
        error: {
          message: `Tool "${toolId}" not found. It may be disabled, not registered, or unavailable in this deployment.`,
        },
        toolId,
      });
    }

    const result = await onechat.runner.runTool({
      toolId,
      toolParams: ((params ?? rest) ?? {}) as Record<string, unknown>,
    });

    return JSON.stringify(result);
  },
  {
    name: 'platform.workflows_logs',
    description:
      'Single entrypoint for workflow execution logs and status (read-only). Routes to get-logs or get-execution-status tools.',
    schema: z.discriminatedUnion('operation', [
      z
        .object({
          operation: z.literal('get_logs').describe('Fetch workflow execution logs (read-only).'),
          params: z.object({}).passthrough().optional(),
        })
        .passthrough(),
      z
        .object({
          operation: z
            .literal('get_execution_status')
            .describe('Fetch workflow execution status/output (read-only).'),
          params: z.object({}).passthrough().optional(),
        })
        .passthrough(),
    ]),
  }
);

export const PLATFORM_WORKFLOWS_LOGS_SKILL: Skill = {
  namespace: 'platform.workflows_logs',
  name: 'Platform Workflows Logs',
  description: 'Fetch workflow execution logs to debug workflow runs (read-only)',
  content: `# Platform Workflows Logs

## What this skill does
Helps you debug workflow runs by retrieving execution logs (and optionally step logs).

## Tools and operations
- Use \`platform.workflows_logs\` (single tool for this skill):\n
  - \`operation: "get_logs"\` routes to \`${platformCoreTools.getWorkflowExecutionLogs}\`\n
  - \`operation: "get_execution_status"\` routes to \`${platformCoreTools.getWorkflowExecutionStatus}\`\n

## Safe workflow
1) Get the \`executionId\` from a workflow run.\n
2) Fetch logs and summarize errors/warnings and failing steps.\n
`,
  tools: [PLATFORM_WORKFLOWS_LOGS_TOOL],
};


