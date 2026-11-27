/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OccConflictError } from '@kbn/occ';
import { WorkflowConflictError } from '@kbn/workflows-yaml';

import { isRetryableWorkflowWriteConflict } from './workflow_write_conflicts';

describe('isRetryableWorkflowWriteConflict', () => {
  it('returns true for OccConflictError', () => {
    expect(isRetryableWorkflowWriteConflict(new OccConflictError())).toBe(true);
  });

  it('returns true for WorkflowConflictError', () => {
    expect(isRetryableWorkflowWriteConflict(new WorkflowConflictError('conflict', 'wf-1'))).toBe(
      true
    );
  });

  it('returns true for duck-typed elasticsearch 409 errors', () => {
    expect(
      isRetryableWorkflowWriteConflict(Object.assign(new Error('conflict'), { statusCode: 409 }))
    ).toBe(true);
  });

  it('returns false for non-conflict errors', () => {
    expect(isRetryableWorkflowWriteConflict(new Error('nope'))).toBe(false);
  });
});
