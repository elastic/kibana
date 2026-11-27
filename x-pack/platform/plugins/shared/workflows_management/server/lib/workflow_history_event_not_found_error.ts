/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown when a workflow change-history event id does not exist for the workflow.
 */
export class WorkflowHistoryEventNotFoundError extends Error {
  constructor(workflowId: string, eventId: string) {
    super(`Change history event '${eventId}' not found for workflow '${workflowId}'.`);
    this.name = 'WorkflowHistoryEventNotFoundError';
  }
}
