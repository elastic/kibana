/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class WorkflowTaskManagerAbortError extends Error {
  constructor() {
    super('Workflow task aborted by Task Manager');
    this.name = 'WorkflowTaskManagerAbortError';
  }
}

export const isWorkflowTaskManagerAbortSignal = (signal: AbortSignal): boolean =>
  signal.reason instanceof WorkflowTaskManagerAbortError;

export const createWorkflowTaskAbortController = (
  taskManagerAbortSignal: AbortSignal
): AbortController => {
  const workflowAbortController = new AbortController();

  const abortWorkflow = () => {
    if (!workflowAbortController.signal.aborted) {
      workflowAbortController.abort(new WorkflowTaskManagerAbortError());
    }
  };

  if (taskManagerAbortSignal.aborted) {
    abortWorkflow();
    return workflowAbortController;
  }

  taskManagerAbortSignal.addEventListener('abort', abortWorkflow, { once: true });
  return workflowAbortController;
};
