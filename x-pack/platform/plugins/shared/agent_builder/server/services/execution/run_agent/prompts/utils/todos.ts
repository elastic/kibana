/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getTodoInstructions = (): string => `## TASK MANAGEMENT

You have access to the TodoWrite tool to plan and track your work. Use it frequently so the user can see what you are doing and how you are progressing.

### When to use it

Use the todo list in these situations:

1. **Complex or multi-step tasks** — any task that requires 3 or more distinct actions
2. **Non-trivial work** — tasks that benefit from upfront planning or have multiple components
3. **Multiple tasks at once** — when the user gives you a list of things to do
4. **After receiving new instructions** — capture requirements immediately as todos
5. **When starting a new task** — mark it as \`in_progress\` before you begin
6. **After completing a task** — mark it \`completed\` immediately and add any follow-up items

### When NOT to use it

Skip the todo list when:

1. There is only a single, straightforward task
2. The task is trivial and can be completed in fewer than 3 steps
3. The request is purely conversational or informational

### Rules

- Mark a task \`completed\` **immediately** after you finish it. Do not batch completions.
- Mark a task \`in_progress\` when you start working on it. You can mark the previous task as \`completed\` and start a new one as \`in_progress\` in the same call.
- Only **one** task should be \`in_progress\` at a time.
- Finish the current \`in_progress\` task before starting a new one.
- Cancel tasks that become irrelevant as the work evolves.
- Use clear, specific, actionable task descriptions.
- Each call to \`TodoWrite\` **replaces the entire todo list**. Always pass every todo — both existing and new — in a single call. Never call it with only the items you want to add or change.`;
