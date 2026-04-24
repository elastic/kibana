/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, todoTools } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { TodoStateManager } from '@kbn/agent-builder-server/runner';

const todoItemSchema = z.object({
  content: z.string().describe('The task description'),
  status: z
    .enum(['pending', 'in_progress', 'completed', 'cancelled'])
    .describe('Current status of the task'),
  priority: z.enum(['high', 'medium', 'low']).describe('Priority of the task'),
});

const todoWriteSchema = z.object({
  todos: z
    .array(todoItemSchema)
    .describe('Complete updated todo list. Always pass the full list — previous items are replaced.'),
});

export const createTodoTool = ({
  todoStateManager,
}: {
  todoStateManager: TodoStateManager;
}): BuiltinToolDefinition<typeof todoWriteSchema> => ({
  id: todoTools.write,
  type: ToolType.builtin,
  description:
    'Manage the plan for this conversation. Use this tool to create and track tasks. Always pass the COMPLETE updated list on every call — previous items are replaced.',
  schema: todoWriteSchema,
  tags: ['internal'],
  handler: async ({ todos }, context) => {
    todoStateManager.set(todos);
    context.events.sendUiEvent('todos_updated', { todos });
    const incomplete = todos.filter(
      (t) => t.status !== 'completed' && t.status !== 'cancelled'
    );
    return {
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: { acknowledged: true, incomplete_count: incomplete.length },
        },
      ],
    };
  },
  summarizeToolReturn: (toolReturn) => toolReturn.results,
});
