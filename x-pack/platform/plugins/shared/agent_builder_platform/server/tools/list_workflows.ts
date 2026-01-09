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
    query: z.string().optional().describe('Optional free-text query'),
    enabled: z.boolean().optional().describe('Optional enabled filter'),
    page: z.number().int().min(1).optional().default(1).describe('Page number (1-based)'),
    size: z.number().int().min(1).max(200).optional().default(50).describe('Page size'),
});

export const listWorkflowsTool = ({
    workflowsManagement,
}: {
    workflowsManagement: WorkflowsServerPluginSetup;
}): BuiltinToolDefinition<typeof schema> => {
    const { management: workflowApi } = workflowsManagement;

    return {
        id: platformCoreTools.listWorkflows,
        type: ToolType.builtin,
        description: 'List workflows available in the current space (read-only).',
        schema,
        handler: async ({ query, enabled, page, size }, { spaceId }) => {
            const res = await workflowApi.getWorkflows(
                {
                    size,
                    page,
                    query,
                    enabled: enabled === undefined ? undefined : [enabled],
                    _full: false,
                },
                spaceId
            );

            return {
                results: [
                    {
                        type: 'other',
                        data: {
                            operation: 'list',
                            items: (res as any).results ?? [],
                            total: (res as any).total,
                            page: (res as any).page,
                            size: (res as any).size,
                        },
                    },
                ],
            };
        },
        tags: [],
    };
};


