/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, internalTools, TODOS_UPDATED_UI_EVENT } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { TodoStateManager } from '@kbn/agent-builder-server/runner';

const todoItemSchema = z.object({
  content: z.string().describe('The task description'),
  status: z
    .enum(['pending', 'in_progress', 'completed', 'cancelled'])
    .describe('Current status of the task'),
});

const todoWriteSchema = z.object({
  todos: z
    .array(todoItemSchema)
    .describe(
      'Complete updated todo list. Always pass the full list — previous items are replaced.'
    ),
});

const toolDescription = `Manage the plan for this conversation by creating and tracking tasks. Use this tool frequently so the user can see what you are doing and how you are progressing.

## When to use it

Use the todo list in these situations:

1. **Complex or multi-step tasks** — any task that requires 3 or more distinct actions
2. **Non-trivial work** — tasks that benefit from upfront planning or have multiple components
3. **Multiple tasks at once** — when the user gives you a list of things to do
4. **After receiving new instructions** — capture requirements immediately as todos
5. **When starting a new task** — mark it as \`in_progress\` before you begin
6. **After completing a task** — mark it \`completed\` immediately and add any follow-up items

## When NOT to use it

Skip the todo list when:

1. There is only a single, straightforward task
2. The task is trivial and can be completed in fewer than 3 steps
3. The request is purely conversational or informational

## Rules

- Mark a task \`completed\` **immediately** after you finish it. Do not batch completions.
- Mark a task \`in_progress\` when you start working on it. You can mark the previous task as \`completed\` and start a new one as \`in_progress\` in the same call.
- Only **one** task should be \`in_progress\` at a time.
- Finish the current \`in_progress\` task before starting a new one.
- Cancel tasks that become irrelevant as the work evolves.
- Use clear, specific, actionable task descriptions.
- Each call **replaces the entire todo list**. Always pass every todo — both existing and new — in a single call. Never call it with only the items you want to add or change.`;

export const createTodoTool = ({
  todoStateManager,
}: {
  todoStateManager: TodoStateManager;
}): BuiltinToolDefinition<typeof todoWriteSchema> => ({
  id: internalTools.writeTodosTool,
  type: ToolType.builtin,
  description: toolDescription,
  schema: todoWriteSchema,
  tags: ['internal'],
  handler: async ({ todos }, context) => {
    todoStateManager.set(todos);
    context.events.sendUiEvent(TODOS_UPDATED_UI_EVENT, { todos });
    const incomplete = todos.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');
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
