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

const schema = z.object({
    workflowId: z.string().describe('Workflow id'),
});

export const getWorkflowTool = ({
    workflowsManagement,
}: {
    workflowsManagement: WorkflowsServerPluginSetup;
}): BuiltinToolDefinition<typeof schema> => {
    const { management: workflowApi } = workflowsManagement;

    return {
        id: platformCoreTools.getWorkflow,
        type: ToolType.builtin,
        description: 'Get a workflow definition by id (read-only).',
        schema,
        handler: async ({ workflowId }, { spaceId }) => {
            const workflow = await workflowApi.getWorkflow(workflowId, spaceId);
            return { results: [{ type: 'other', data: { operation: 'get', item: workflow } }] };
        },
        tags: [],
    };
};


