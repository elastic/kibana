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

const PLATFORM_WORKFLOWS_TOOL = tool(
    async (input, config) => {
        const onechat = getOneChatContext(config);
        if (!onechat) {
            throw new Error('OneChat context not available');
        }

        const asAny = input as any;
        const { operation, params, ...rest } = asAny ?? {};

        const toolId = (() => {
            switch (operation) {
                case 'list':
                    return platformCoreTools.listWorkflows;
                case 'get':
                    return platformCoreTools.getWorkflow;
                case 'run':
                    return platformCoreTools.runWorkflow;
                case 'get_execution_status':
                    return platformCoreTools.getWorkflowExecutionStatus;
                default:
                    // Exhaustive check
                    return platformCoreTools.listWorkflows;
            }
        })();

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
        name: 'platform.workflows',
        description:
            'Single entrypoint for platform workflows. Routes to list/get/run/status tools. Writes still require `confirm: true` in the underlying tool schema.',
        schema: z.discriminatedUnion('operation', [
            z
                .object({
                    operation: z.literal('list').describe('List workflows in the current space (read-only).'),
                    params: z.object({}).passthrough().optional(),
                })
                .passthrough(),
            z
                .object({
                    operation: z.literal('get').describe('Get a workflow definition by id (read-only).'),
                    params: z.object({}).passthrough().optional(),
                })
                .passthrough(),
            z
                .object({
                    operation: z
                        .literal('run')
                        .describe('Run a workflow (may be side-effecting; underlying tool requires confirm: true).'),
                    params: z.object({}).passthrough().optional(),
                })
                .passthrough(),
            z
                .object({
                    operation: z
                        .literal('get_execution_status')
                        .describe('Get workflow execution status/output by execution id (read-only).'),
                    params: z.object({}).passthrough().optional(),
                })
                .passthrough(),
        ]),
    }
);

export const PLATFORM_WORKFLOWS_SKILL: Skill = {
    namespace: 'platform.workflows',
    name: 'Platform Workflows',
    description: 'Discover, execute and monitor workflows safely',
    content: `# Platform Workflows

## What this skill does
Helps you discover workflows, inspect their definitions, run them with explicit confirmation, and monitor executions.

## Tools and operations
- Use \`platform.workflows\` (single tool for this skill):\n
  - \`operation: "list"\` routes to \`${platformCoreTools.listWorkflows}\` (read-only)\n
  - \`operation: "get"\` routes to \`${platformCoreTools.getWorkflow}\` (read-only)\n
  - \`operation: "run"\` routes to \`${platformCoreTools.runWorkflow}\` (**requires \`confirm: true\`**)\n
  - \`operation: "get_execution_status"\` routes to \`${platformCoreTools.getWorkflowExecutionStatus}\`\n

## Inputs to ask the user for
- **workflowId** (required for run/get)\n
- **inputs** (optional; keep minimal)\n
- For execution: explicit user confirmation (and include \`confirmReason\` when available)\n

## Safe workflow
1) List or identify the workflow id.\n
2) Inspect the workflow before running (use \`${platformCoreTools.getWorkflow}\`).\n
3) Restate expected side effects and require explicit “yes”.\n
4) Run with \`confirm: true\`.\n
5) If not completed, return \`executionId\` and offer to check status later.\n

## Example
- **User**: “Run workflow X with inputs Y.”\n
- **Assistant**: \`getWorkflow\` → summarize → ask for confirmation → \`runWorkflow\` with \`confirm: true\`.\n

## Guardrails
- Do not delete workflows.\n
- Treat workflow execution as potentially side-effecting.\n
`,
    tools: [PLATFORM_WORKFLOWS_TOOL],
};


