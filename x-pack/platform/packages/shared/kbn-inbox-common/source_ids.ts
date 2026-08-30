/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under the
 * Elastic License 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Composite identifier that makes a Workflows step execution uniquely
 * addressable within the Inbox. Format: `workflowId:workflowRunId:stepExecutionId`.
 * The `workflowRunId` is what the `resume` API needs, and the `id` (step
 * execution doc id) is retained for traceability / future sub-workflow
 * propagation work per [security-team#16710](https://github.com/elastic/security-team/issues/16710).
 *
 * Source of truth for the format. `workflows_management`'s
 * `to_inbox_action.ts` builds and parses these ids with these helpers; external
 * responders (eval suites, MCP apps, bots) must construct the same string
 * instead of hand-rolling the template, so a future format change breaks
 * compilation here rather than silently mismatching at runtime.
 */
export const buildWorkflowSourceId = (parts: {
  workflowId: string;
  workflowRunId: string;
  stepExecutionId: string;
}): string => `${parts.workflowId}:${parts.workflowRunId}:${parts.stepExecutionId}`;

/**
 * Extracts the `workflowRunId` (a.k.a. executionId) from a composite source id.
 * Returns `null` if the source id is malformed — the route handler treats
 * that as a 404.
 */
export const parseWorkflowSourceId = (
  sourceId: string
): { workflowId: string; executionId: string; stepExecutionId: string } | null => {
  const parts = sourceId.split(':');
  if (parts.length < 3) return null;
  const [workflowId, executionId, ...rest] = parts;
  return {
    workflowId,
    executionId,
    // Re-join in case the step execution id contains colons (defensive).
    stepExecutionId: rest.join(':'),
  };
};
