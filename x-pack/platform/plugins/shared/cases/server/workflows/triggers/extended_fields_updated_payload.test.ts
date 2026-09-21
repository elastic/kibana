/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildExtendedFieldsUpdatedPayload } from './extended_fields_updated_payload';

const BASE = { owner: 'securitySolution', caseId: 'case-1' };

describe('buildExtendedFieldsUpdatedPayload', () => {
  it('returns undefined when there are no changes', () => {
    expect(
      buildExtendedFieldsUpdatedPayload({
        ...BASE,
        previousExtendedFields: { priority: 'high' },
        extendedFields: { priority: 'high' },
      })
    ).toBeUndefined();
  });

  it('returns undefined when both sides are null/undefined', () => {
    expect(
      buildExtendedFieldsUpdatedPayload({
        ...BASE,
        previousExtendedFields: null,
        extendedFields: undefined,
      })
    ).toBeUndefined();
  });

  it('passes through owner and caseId unchanged', () => {
    const result = buildExtendedFieldsUpdatedPayload({
      ...BASE,
      previousExtendedFields: {},
      extendedFields: { priority: 'high' },
    });
    expect(result?.owner).toBe('securitySolution');
    expect(result?.caseId).toBe('case-1');
  });

  it('includes changedFields on a clean change', () => {
    const result = buildExtendedFieldsUpdatedPayload({
      ...BASE,
      previousExtendedFields: { priority: 'low' },
      extendedFields: { priority: 'high' },
    });
    expect(result).toEqual({
      owner: 'securitySolution',
      caseId: 'case-1',
      changedFields: ['priority'],
    });
  });

  it('does not include field values in the payload', () => {
    const result = buildExtendedFieldsUpdatedPayload({
      ...BASE,
      previousExtendedFields: { priority: 'low' },
      extendedFields: { priority: 'high' },
    });
    expect(result).not.toHaveProperty('extendedFields');
    expect(result).not.toHaveProperty('previousExtendedFields');
  });

  it('reports changed fields alphabetically sorted', () => {
    const result = buildExtendedFieldsUpdatedPayload({
      ...BASE,
      previousExtendedFields: { charlie: '1', alpha: '2', beta: '3' },
      extendedFields: { charlie: 'x', alpha: 'y', beta: 'z' },
    });
    expect(result?.changedFields).toEqual(['alpha', 'beta', 'charlie']);
  });

  it('detects a newly-added field (absent → present)', () => {
    const result = buildExtendedFieldsUpdatedPayload({
      ...BASE,
      previousExtendedFields: {},
      extendedFields: { priority: 'high' },
    });
    expect(result?.changedFields).toEqual(['priority']);
  });

  it('detects a removed field (present → absent)', () => {
    const result = buildExtendedFieldsUpdatedPayload({
      ...BASE,
      previousExtendedFields: { priority: 'high' },
      extendedFields: {},
    });
    expect(result?.changedFields).toEqual(['priority']);
  });

  it('does not include unchanged sibling keys in changedFields', () => {
    const result = buildExtendedFieldsUpdatedPayload({
      ...BASE,
      previousExtendedFields: { priority: 'low', severity: 'medium' },
      extendedFields: { priority: 'high', severity: 'medium' },
    });
    expect(result?.changedFields).toEqual(['priority']);
  });
});
