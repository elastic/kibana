/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsWorkflowExecution } from '@kbn/workflows';

export function generateExecutionTaskScope(workflowExecution: EsWorkflowExecution): string[] {
  return [
    'workflow',
    `workflow:${workflowExecution.workflowId}`,
    `workflow:execution:${workflowExecution.id}`,

    // if execution is a single step execution
    ...(workflowExecution.stepId ? [`workflow:execution:step:${workflowExecution.stepId}`] : []),
  ];
}
