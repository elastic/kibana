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

import { buildWorkflowSourceId, parseWorkflowSourceId } from './source_ids';

describe('buildWorkflowSourceId / parseWorkflowSourceId', () => {
  it('round-trips a plain triple', () => {
    const sourceId = buildWorkflowSourceId({
      workflowId: 'wf-1',
      workflowRunId: 'run-1',
      stepExecutionId: 'step-exec-1',
    });
    expect(sourceId).toBe('wf-1:run-1:step-exec-1');
    expect(parseWorkflowSourceId(sourceId)).toEqual({
      workflowId: 'wf-1',
      executionId: 'run-1',
      stepExecutionId: 'step-exec-1',
    });
  });

  it('preserves colons inside the step execution id on parse', () => {
    const parsed = parseWorkflowSourceId('wf-1:run-1:step:with:colons');
    expect(parsed).toEqual({
      workflowId: 'wf-1',
      executionId: 'run-1',
      stepExecutionId: 'step:with:colons',
    });
  });

  it('returns null for malformed source ids', () => {
    expect(parseWorkflowSourceId('only-two-parts')).toBeNull();
    expect(parseWorkflowSourceId('')).toBeNull();
  });
});
