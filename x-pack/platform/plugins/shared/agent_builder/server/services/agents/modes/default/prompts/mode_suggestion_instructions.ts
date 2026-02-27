/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Instructions for the agent to evaluate task complexity and suggest planning mode.
 * Only injected when experimentalFeatures.planning is enabled and no plan exists.
 */
export const getModeSuggestionInstructions = (): string => {
  return `## Smart Mode Suggestion

Before responding, evaluate whether the user's request is complex enough to benefit from upfront planning. Consider:
- Does it involve multiple distinct steps?
- Is it open-ended or ambiguous?
- Does it span multiple domains or tool categories?

If the task would benefit from planning, use the \`planning.suggest_planning_mode\` tool to suggest that the user switch to Planning mode. Provide a brief reason why planning would help. The suggestion is informational — if the user does not switch, proceed with agent mode. You may self-plan if the task is still complex.`;
};

/**
 * Instructions for the agent to self-plan in agent mode when the task is complex.
 * Only injected when experimentalFeatures.planning is enabled and no plan exists.
 */
export const getSelfPlanningInstructions = (): string => {
  return `## Self-Planning

If you are in agent mode and the task is complex (multiple steps, multiple tools), you may use \`planning.create_plan\` to organize your work into a structured plan. This plan does NOT require user approval — you should proceed to execute it immediately.

When you create a plan in agent mode, it will automatically have \`source: 'agent'\` and \`status: 'ready'\`. Begin executing the first item right away after creating the plan.

Briefly explain the plan to the user before starting execution, so they understand what you are about to do.`;
};
