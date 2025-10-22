/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeAssumption } from './types';
import { validateAssumptions } from './validate_assumptions';
import { AssumptionConflictError } from './assumption_conflict_error';

describe('validateAssumptions', () => {
  it('passes when no assumptions', () => {
    expect(() => validateAssumptions([])).not.toThrow();
  });

  it('passes when all assumptions are consistent', () => {
    const assumptions: TypeAssumption[] = [
      { placeholder: 'typeof_field1', assumedType: 'string', reason: 'test1' },
      { placeholder: 'typeof_field2', assumedType: 'number', reason: 'test2' },
    ];

    expect(() => validateAssumptions(assumptions)).not.toThrow();
  });

  it('passes when same placeholder has same type assumption multiple times', () => {
    const assumptions: TypeAssumption[] = [
      { placeholder: 'typeof_field1', assumedType: 'string', reason: 'test1' },
      { placeholder: 'typeof_field1', assumedType: 'string', reason: 'test2' },
    ];

    expect(() => validateAssumptions(assumptions)).not.toThrow();
  });

  it('throws when same placeholder has different type assumptions', () => {
    const assumptions: TypeAssumption[] = [
      { placeholder: 'typeof_field1', assumedType: 'string', reason: 'test1' },
      { placeholder: 'typeof_field1', assumedType: 'number', reason: 'test2' },
    ];

    expect(() => validateAssumptions(assumptions)).toThrow(AssumptionConflictError);
  });

  it('throws with detailed error message', () => {
    const assumptions: TypeAssumption[] = [
      { placeholder: 'typeof_field1', assumedType: 'string', reason: 'used as string' },
      { placeholder: 'typeof_field1', assumedType: 'number', reason: 'used as number' },
    ];

    try {
      validateAssumptions(assumptions);
      fail('Should have thrown');
    } catch (e: any) {
      expect(e).toBeInstanceOf(AssumptionConflictError);
      expect(e.message).toContain('typeof_field1');
      expect(e.message).toContain('string');
      expect(e.message).toContain('number');
    }
  });

  it('handles merged placeholders with consistent types', () => {
    const assumptions: TypeAssumption[] = [
      { placeholder: 'typeof_a,b', assumedType: 'string', reason: 'merged and assigned' },
      { placeholder: 'typeof_a', assumedType: 'string', reason: 'a is string' },
      { placeholder: 'typeof_b', assumedType: 'string', reason: 'b is string' },
    ];

    expect(() => validateAssumptions(assumptions)).not.toThrow();
  });

  it('throws when merged placeholder conflicts with individual field assumption', () => {
    const assumptions: TypeAssumption[] = [
      { placeholder: 'typeof_a,b', assumedType: 'string', reason: 'merged as string' },
      { placeholder: 'typeof_a', assumedType: 'number', reason: 'a is number' },
    ];

    expect(() => validateAssumptions(assumptions)).toThrow(AssumptionConflictError);
  });

  it('handles typeof to typeof assumptions (placeholder equality)', () => {
    const assumptions: TypeAssumption[] = [
      {
        placeholder: 'typeof_a,b',
        assumedType: 'typeof_a,b',
        reason: 'merged placeholders',
      },
    ];

    // These are just equality assumptions, not type assumptions
    // They should pass validation
    expect(() => validateAssumptions(assumptions)).not.toThrow();
  });

  it('handles complex scenario with multiple fields', () => {
    const assumptions: TypeAssumption[] = [
      { placeholder: 'typeof_field1', assumedType: 'string', reason: 'test1' },
      { placeholder: 'typeof_field2', assumedType: 'number', reason: 'test2' },
      { placeholder: 'typeof_field3', assumedType: 'boolean', reason: 'test3' },
      { placeholder: 'typeof_field1', assumedType: 'string', reason: 'test4' },
    ];

    expect(() => validateAssumptions(assumptions)).not.toThrow();
  });

  it('detects conflict among many assumptions', () => {
    const assumptions: TypeAssumption[] = [
      { placeholder: 'typeof_field1', assumedType: 'string', reason: 'test1' },
      { placeholder: 'typeof_field2', assumedType: 'number', reason: 'test2' },
      { placeholder: 'typeof_field3', assumedType: 'boolean', reason: 'test3' },
      { placeholder: 'typeof_field2', assumedType: 'string', reason: 'conflict here' },
    ];

    expect(() => validateAssumptions(assumptions)).toThrow(AssumptionConflictError);

    try {
      validateAssumptions(assumptions);
    } catch (e: any) {
      expect(e.placeholder).toBe('typeof_field2');
    }
  });
});
