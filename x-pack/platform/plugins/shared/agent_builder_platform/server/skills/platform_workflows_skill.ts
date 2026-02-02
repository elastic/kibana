/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/agent-builder-common/skills';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { z } from '@kbn/zod';
import { tool } from '@langchain/core/tools';
import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools';

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
                        .describe(
                            'Run a workflow (may be side-effecting; underlying tool requires confirm: true).'
                        ),
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

## WHEN TO USE THIS TOOL (REQUIRED)

You MUST use this tool when the user asks about:
- Listing available workflows
- Getting workflow details or definitions
- Running/executing a workflow
- Checking workflow execution status

**ALWAYS call the tool - do NOT answer from memory.**

## RESPONSE FORMAT (MANDATORY)

### When listing workflows:
- If workflows found: "Found X workflows:" then list names and IDs
- If none: "No workflows found."

### When getting workflow:
Show the workflow name, description, triggers, and key steps from tool results.

### When running workflow:
Report the execution ID and status from tool results.

### When checking status:
Show execution status, any outputs or errors from tool results.

## FORBIDDEN RESPONSES
- Do NOT explain what workflows are without listing them
- Do NOT describe workflow capabilities in general
- Do NOT add suggestions unless asked

## Tools and operations
- Use \`platform.workflows\` with:
  - \`operation: "list"\` - list all workflows (read-only)
  - \`operation: "get"\` - get workflow details (read-only)
  - \`operation: "run"\` - run a workflow (**requires confirm: true**)
  - \`operation: "get_execution_status"\` - check execution status

## Guardrails
- Do not delete workflows.
- Running workflows requires explicit confirmation.
`,
    tools: [PLATFORM_WORKFLOWS_TOOL],
};
