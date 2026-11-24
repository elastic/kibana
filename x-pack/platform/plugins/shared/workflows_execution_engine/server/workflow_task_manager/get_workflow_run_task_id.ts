/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Stable `workflow:run` task id for a workflow execution (matches enqueue scheduling). */
export const getWorkflowRunTaskId = (
  workflowExecutionId: string,
  triggeredBy: string = 'manual'
): string => `workflow:${workflowExecutionId}:${triggeredBy}`;
