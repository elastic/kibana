/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Elasticsearch default `index.max_result_window` for from/size pagination. */
export const ES_MAX_RESULT_WINDOW = 10_000;

export const WORKFLOW_HISTORY_PAGINATION_EXCEEDED_MESSAGE = `Workflow history pagination exceeds the maximum result window of ${ES_MAX_RESULT_WINDOW} entries.`;

export const WORKFLOW_EXECUTION_STEPS_PAGINATION_EXCEEDED_MESSAGE = `Workflow execution step pagination exceeds the maximum result window of ${ES_MAX_RESULT_WINDOW} entries.`;

/**
 * Thrown when from/size pagination would exceed Elasticsearch's max result window.
 */
export class WorkflowHistoryPaginationError extends Error {
  constructor(message = WORKFLOW_HISTORY_PAGINATION_EXCEEDED_MESSAGE) {
    super(message);
    this.name = 'WorkflowHistoryPaginationError';
  }
}
