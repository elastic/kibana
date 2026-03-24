/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';

const listWorkflowsSchema = z.object({
  query: z.string().optional().describe('Search query to filter workflows by name or description'),
  enabled: z.boolean().optional().describe('Filter by enabled/disabled status'),
  tags: z.array(z.string()).optional().describe('Filter by tags'),
  size: z.number().optional().describe('Maximum number of workflows to return (default: 20)'),
});

export const listWorkflowsTool = (
  api: WorkflowsManagementApi
): BuiltinToolDefinition<typeof listWorkflowsSchema> => ({
  id: 'platform.workflows.list_workflows',
  type: ToolType.builtin,
  description:
    "List workflows in the user's environment. " +
    'Returns workflow summaries: id, name, description, tags, enabled status.',
  tags: ['workflows'],
  schema: listWorkflowsSchema,
  handler: async ({ query, enabled, tags, size }, { spaceId }) => {
    const result = await api.getWorkflows(
      {
        size: size ?? 20,
        page: 1,
        ...(query && { query }),
        ...(enabled !== undefined && { enabled: [enabled] }),
        ...(tags && { tags }),
      },
      spaceId
    );

    const workflows = result.results.map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      tags: w.tags,
      enabled: w.enabled,
    }));

    return {
      results: [
        {
          type: ToolResultType.other,
          data: {
            count: workflows.length,
            total: result.total,
            workflows,
          },
        },
      ],
    };
  },
});
