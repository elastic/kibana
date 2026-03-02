/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plan } from '@kbn/agent-builder-common';

/**
 * Generates instructions for the agent to follow an existing plan during execution.
 * Injected into the system prompt when a plan exists in agent mode.
 */
export const getPlanExecutionInstructions = (plan: Plan): string => {
  const items = plan.action_items
    .map(
      (item, i) =>
        `  ${i}. [${item.status}] ${item.description}${
          item.related_tools?.length ? ` (tools: ${item.related_tools.join(', ')})` : ''
        }`
    )
    .join('\n');

  return `## Active Plan: "${plan.title}"
${plan.description ? `Description: ${plan.description}\n` : ''}
Action Items:
${items}

### Plan Execution Guidelines — CRITICAL
You MUST follow these rules strictly when executing the plan:

1. **Before starting each item**: Call \`planning.update_plan\` to set the item status to \`in_progress\`. This is mandatory — it updates the UI progress indicator for the user.
2. **After completing each item**: Call \`planning.update_plan\` to set the item status to \`completed\`.
3. **If an item fails**: Call \`planning.update_plan\` to set the item status to \`failed\` and explain the issue.
4. Work through items in order. Do not skip items unless they are already completed.
5. After updating an item to \`in_progress\`, execute the step using the appropriate tools, then update to \`completed\` or \`failed\`.

Example flow for each item:
- update_plan(items: [{index: N, status: 'in_progress'}]) → execute tools → update_plan(items: [{index: N, status: 'completed'}])

The user is watching the plan panel for real-time progress. Every status update you make is immediately visible to them.`;
};
