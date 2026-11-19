/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionListItemDto } from '@kbn/workflows';

export const formatWorkflowExecutionsForCopy = (
  executions: WorkflowExecutionListItemDto[]
): string => {
  if (executions.length === 1) {
    return JSON.stringify(executions[0], null, 2);
  }

  return JSON.stringify(executions, null, 2);
};
