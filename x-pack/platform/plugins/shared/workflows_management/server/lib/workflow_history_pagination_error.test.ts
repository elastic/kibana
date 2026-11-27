/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ES_MAX_RESULT_WINDOW,
  WORKFLOW_HISTORY_PAGINATION_EXCEEDED_MESSAGE,
  WorkflowHistoryPaginationError,
} from './workflow_history_pagination_error';

describe('WorkflowHistoryPaginationError', () => {
  it('exposes the Elasticsearch max result window constant', () => {
    expect(ES_MAX_RESULT_WINDOW).toBe(10_000);
  });

  it('uses the shared exceeded-pagination message by default', () => {
    const error = new WorkflowHistoryPaginationError();

    expect(error.message).toBe(WORKFLOW_HISTORY_PAGINATION_EXCEEDED_MESSAGE);
    expect(error.name).toBe('WorkflowHistoryPaginationError');
  });

  it('accepts a custom message', () => {
    const error = new WorkflowHistoryPaginationError('custom pagination error');

    expect(error.message).toBe('custom pagination error');
  });
});
