/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_WORKFLOW_TRIGGER_EXTENDED_FIELD_VALUE_LENGTH } from '../../../common/constants';
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

  it('includes changedFields, extendedFields, previousExtendedFields, and empty truncatedFields on a clean change', () => {
    const result = buildExtendedFieldsUpdatedPayload({
      ...BASE,
      previousExtendedFields: { priority: 'low' },
      extendedFields: { priority: 'high' },
    });
    expect(result).toEqual({
      owner: 'securitySolution',
      caseId: 'case-1',
      changedFields: ['priority'],
      extendedFields: { priority: 'high' },
      previousExtendedFields: { priority: 'low' },
      truncatedFields: [],
    });
  });

  it('does not truncate a value exactly at the cap', () => {
    const atCap = 'x'.repeat(MAX_WORKFLOW_TRIGGER_EXTENDED_FIELD_VALUE_LENGTH);
    const result = buildExtendedFieldsUpdatedPayload({
      ...BASE,
      previousExtendedFields: {},
      extendedFields: { priority: atCap },
    });
    expect(result?.extendedFields.priority).toHaveLength(
      MAX_WORKFLOW_TRIGGER_EXTENDED_FIELD_VALUE_LENGTH
    );
    expect(result?.truncatedFields).toEqual([]);
  });

  it('truncates a value one character over the cap', () => {
    const overCap = 'x'.repeat(MAX_WORKFLOW_TRIGGER_EXTENDED_FIELD_VALUE_LENGTH + 1);
    const result = buildExtendedFieldsUpdatedPayload({
      ...BASE,
      previousExtendedFields: {},
      extendedFields: { priority: overCap },
    });
    expect(result?.extendedFields.priority).toHaveLength(
      MAX_WORKFLOW_TRIGGER_EXTENDED_FIELD_VALUE_LENGTH
    );
    expect(result?.truncatedFields).toEqual(['priority']);
  });

  it('also truncates previousExtendedFields when the previous value is over the cap', () => {
    const overCap = 'y'.repeat(MAX_WORKFLOW_TRIGGER_EXTENDED_FIELD_VALUE_LENGTH + 1);
    const result = buildExtendedFieldsUpdatedPayload({
      ...BASE,
      previousExtendedFields: { priority: overCap },
      extendedFields: { priority: 'high' },
    });
    expect(result?.previousExtendedFields.priority).toHaveLength(
      MAX_WORKFLOW_TRIGGER_EXTENDED_FIELD_VALUE_LENGTH
    );
    expect(result?.truncatedFields).toEqual(['priority']);
  });

  it('deduplicates and sorts truncatedFields when a key is truncated in both maps', () => {
    const overCap = 'z'.repeat(MAX_WORKFLOW_TRIGGER_EXTENDED_FIELD_VALUE_LENGTH + 1);
    const result = buildExtendedFieldsUpdatedPayload({
      ...BASE,
      previousExtendedFields: { beta: overCap },
      extendedFields: { beta: `${overCap.slice(0, overCap.length - 1)}X` },
    });
    // beta is truncated in both maps but should appear only once in truncatedFields
    expect(result?.truncatedFields).toEqual(['beta']);
  });

  it('sorts truncatedFields alphabetically when multiple keys are truncated', () => {
    const overCap = 'x'.repeat(MAX_WORKFLOW_TRIGGER_EXTENDED_FIELD_VALUE_LENGTH + 1);
    const result = buildExtendedFieldsUpdatedPayload({
      ...BASE,
      previousExtendedFields: { charlie: 'old', alpha: 'old', beta: 'old' },
      extendedFields: { charlie: overCap, alpha: overCap, beta: overCap },
    });
    expect(result?.truncatedFields).toEqual(['alpha', 'beta', 'charlie']);
  });

  it('keeps a truncated key present in extendedFields (absence signals removal)', () => {
    const overCap = 'x'.repeat(MAX_WORKFLOW_TRIGGER_EXTENDED_FIELD_VALUE_LENGTH + 1);
    const result = buildExtendedFieldsUpdatedPayload({
      ...BASE,
      previousExtendedFields: {},
      extendedFields: { priority: overCap },
    });
    // Key must still be present even though the value is truncated
    expect(result?.extendedFields).toHaveProperty('priority');
  });
});
