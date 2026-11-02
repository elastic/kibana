/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BOUNDARY_VALIDATION_ERROR } from '@kbn/data-lifecycle-phases';
import { PRESERVED_TIME_UNITS } from '../../shared';
import { getDlmPhasesFlyoutFormSchema } from './schema';

describe('getDlmPhasesFlyoutFormSchema', () => {
  it('enforces a max length for frozen.afterValue', () => {
    const schema = getDlmPhasesFlyoutFormSchema();
    const unit = PRESERVED_TIME_UNITS[0];

    const result = schema.safeParse({
      frozen: { enabled: true, afterValue: '1'.repeat(101), afterUnit: unit },
      delete: { enabled: false, afterValue: '0', afterUnit: unit },
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    const frozenIssue = result.error.issues.find(
      (i) => i.path[0] === 'frozen' && i.path[1] === 'afterValue'
    );
    expect(frozenIssue?.message).toMatch(/Must be 100 characters or less/);
  });

  it('enforces a max length for delete.afterValue', () => {
    const schema = getDlmPhasesFlyoutFormSchema();
    const unit = PRESERVED_TIME_UNITS[0];

    const result = schema.safeParse({
      frozen: { enabled: false, afterValue: '0', afterUnit: unit },
      delete: { enabled: true, afterValue: '1'.repeat(101), afterUnit: unit },
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    const deleteIssue = result.error.issues.find(
      (i) => i.path[0] === 'delete' && i.path[1] === 'afterValue'
    );
    expect(deleteIssue?.message).toMatch(/Must be 100 characters or less/);
  });

  it('emits the boundary validation error token when delete is below frozen', () => {
    const schema = getDlmPhasesFlyoutFormSchema();
    const unit = PRESERVED_TIME_UNITS[0];

    const result = schema.safeParse({
      frozen: { enabled: true, afterValue: '30', afterUnit: unit },
      delete: { enabled: true, afterValue: '20', afterUnit: unit },
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    const deleteIssue = result.error.issues.find(
      (i) => i.path[0] === 'delete' && i.path[1] === 'afterValue'
    );
    expect(deleteIssue?.message).toBe(BOUNDARY_VALIDATION_ERROR);
  });

  it('accepts 100 characters for afterValue', () => {
    const schema = getDlmPhasesFlyoutFormSchema();
    const unit = PRESERVED_TIME_UNITS[0];

    const result = schema.safeParse({
      frozen: { enabled: true, afterValue: '1'.repeat(100), afterUnit: unit },
      delete: { enabled: true, afterValue: '1'.repeat(100), afterUnit: unit },
    });

    expect(result.success).toBe(true);
  });
});
