/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { platformCoreTools, ToolType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { cleanPrompt } from '@kbn/onechat-genai-utils/prompts';

const schema = z.object({
    executionId: z.string().describe('Workflow execution id'),
    stepExecutionId: z.string().optional().describe('Optional step execution id to fetch step logs'),
    page: z.number().int().min(1).optional().default(1),
    size: z.number().int().min(1).max(200).optional().default(50),
    sortField: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const getWorkflowExecutionLogsTool = ({
    workflowsManagement,
}: {
    workflowsManagement: WorkflowsServerPluginSetup;
}): BuiltinToolDefinition<typeof schema> => {
    const { management: workflowApi } = workflowsManagement;

    return {
        id: platformCoreTools.getWorkflowExecutionLogs,
        type: ToolType.builtin,
        description: cleanPrompt(`Retrieve workflow execution logs (read-only).

Use this tool to debug a workflow execution by retrieving its logs or step logs.
`),
        schema,
        handler: async ({ executionId, stepExecutionId, page, size, sortField, sortOrder }, { spaceId }) => {
            const res = await workflowApi.getWorkflowExecutionLogs({
                executionId,
                stepExecutionId,
                spaceId,
                page,
                size,
                sortField,
                sortOrder,
            });

            return { results: [{ type: 'other', data: { operation: 'get_logs', item: res } }] };
        },
        tags: [],
    };
};



