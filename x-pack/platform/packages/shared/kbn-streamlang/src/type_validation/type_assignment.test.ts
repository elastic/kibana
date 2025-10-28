/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeState, TypeAssumption } from './types';
import {
  assignType,
  getOrCreateFieldType,
  validateNoConditionalTypeChanges,
} from './type_assignment';
import { ConditionalTypeChangeError } from './errors';

describe('type_assignment', () => {
  let state: TypeState;
  let assumptions: TypeAssumption[];

  beforeEach(() => {
    state = new Map();
    assumptions = [];
  });

  describe('assignType', () => {
    it('creates a new field with primitive type', () => {
      assignType('field1', 'string', state, assumptions, 0, false, 'initial assignment');

      expect(state.get('field1')).toEqual({
        currentType: 'string',
        allAssignments: [{ type: 'string', processorIndex: 0, isConditional: false }],
      });
    });

    it('creates a new field with typeof placeholder', () => {
      assignType('field1', 'typeof_unknown', state, assumptions, 0, false, 'from unknown');

      expect(state.get('field1')).toEqual({
        currentType: 'typeof_unknown',
        allAssignments: [{ type: 'typeof_unknown', processorIndex: 0, isConditional: false }],
      });
    });

    it('records assignment when assigning same type', () => {
      assignType('field1', 'string', state, assumptions, 0, false, 'first');
      assignType('field1', 'string', state, assumptions, 1, false, 'second');

      const field = state.get('field1');
      expect(field?.currentType).toBe('string');
      expect(field?.allAssignments).toHaveLength(2);
    });

    it('allows unconditional type change from primitive to different primitive', () => {
      assignType('field1', 'string', state, assumptions, 0, false, 'as string');
      assignType('field1', 'number', state, assumptions, 1, false, 'convert to number');

      expect(state.get('field1')?.currentType).toBe('number');
      expect(state.get('field1')?.allAssignments).toHaveLength(2);
    });

    it('records conditional type change for later validation', () => {
      assignType('field1', 'string', state, assumptions, 0, false, 'as string');
      // This should not throw immediately, but record the assignment
      assignType('field1', 'number', state, assumptions, 1, true, 'conditional number');

      // Field should still be string (unconditional takes precedence)
      expect(state.get('field1')?.currentType).toBe('string');
      // But the assignment should be recorded
      expect(state.get('field1')?.allAssignments).toHaveLength(2);

      // Validation should throw
      expect(() => validateNoConditionalTypeChanges(state)).toThrow(ConditionalTypeChangeError);
    });

    it('records assumption when assigning typeof to primitive field', () => {
      assignType('field1', 'string', state, assumptions, 0, false, 'as string');
      assignType('field1', 'typeof_unknown', state, assumptions, 1, false, 'from unknown');

      expect(state.get('field1')?.currentType).toBe('string');
      expect(assumptions).toHaveLength(1);
      expect(assumptions[0]).toMatchObject({
        placeholder: 'typeof_unknown',
        assumedType: 'string',
      });
    });

    it('records assumption when assigning primitive to typeof field', () => {
      assignType('field1', 'typeof_unknown', state, assumptions, 0, false, 'from unknown');
      assignType('field1', 'number', state, assumptions, 1, false, 'assign number');

      expect(state.get('field1')?.currentType).toBe('number');
      expect(assumptions).toHaveLength(1);
      expect(assumptions[0]).toMatchObject({
        placeholder: 'typeof_unknown',
        assumedType: 'number',
      });
    });

    it('merges typeof placeholders when both are typeof', () => {
      assignType('field1', 'typeof_a', state, assumptions, 0, false, 'from a');
      assignType('field1', 'typeof_b', state, assumptions, 1, false, 'from b');

      const fieldType = state.get('field1')?.currentType;
      expect(fieldType).toBe('typeof_a,b');
      expect(assumptions).toHaveLength(1);
      expect(assumptions[0].placeholder).toBe('typeof_a,b');
    });

    it('handles chain of typeof merges', () => {
      assignType('field1', 'typeof_a', state, assumptions, 0, false, 'from a');
      assignType('field1', 'typeof_b', state, assumptions, 1, false, 'from b');
      assignType('field1', 'typeof_c', state, assumptions, 2, false, 'from c');

      const fieldType = state.get('field1')?.currentType;
      expect(fieldType).toContain('typeof_');
      // Should contain all three field names
      expect(fieldType).toContain('a');
      expect(fieldType).toContain('b');
      expect(fieldType).toContain('c');
    });
  });

  describe('getOrCreateFieldType', () => {
    it('returns existing type for known field', () => {
      assignType('field1', 'string', state, assumptions, 0, false, 'initial');

      const type = getOrCreateFieldType('field1', state);
      expect(type).toBe('string');
    });

    it('creates typeof placeholder for unknown field', () => {
      const type = getOrCreateFieldType('unknown', state);
      expect(type).toBe('typeof_unknown');
    });
  });

  describe('validateNoConditionalTypeChanges', () => {
    it('passes when all assignments are same type', () => {
      assignType('field1', 'string', state, assumptions, 0, false, 'first');
      assignType('field1', 'string', state, assumptions, 1, true, 'second');

      expect(() => validateNoConditionalTypeChanges(state)).not.toThrow();
    });

    it('passes when unconditional type changes occur', () => {
      assignType('field1', 'string', state, assumptions, 0, false, 'as string');
      assignType('field1', 'number', state, assumptions, 1, false, 'convert to number');

      expect(() => validateNoConditionalTypeChanges(state)).not.toThrow();
    });

    it('throws when conditional assignments have different types', () => {
      // Simulate: if (cond) { field = "string" } else { field = 123 }
      assignType('field1', 'string', state, assumptions, 0, true, 'conditional string');
      assignType('field1', 'number', state, assumptions, 1, true, 'conditional number');

      expect(() => validateNoConditionalTypeChanges(state)).toThrow(ConditionalTypeChangeError);
    });

    it('throws when conditional assignment conflicts with unconditional', () => {
      assignType('field1', 'string', state, assumptions, 0, false, 'unconditional string');
      assignType('field1', 'number', state, assumptions, 1, true, 'conditional number');

      expect(() => validateNoConditionalTypeChanges(state)).toThrow(ConditionalTypeChangeError);
    });

    it('passes with typeof placeholders in mix', () => {
      assignType('field1', 'typeof_unknown', state, assumptions, 0, false, 'from unknown');
      assignType('field1', 'string', state, assumptions, 1, true, 'conditional string');

      expect(() => validateNoConditionalTypeChanges(state)).not.toThrow();
    });

    it('validates all fields in state', () => {
      assignType('field1', 'string', state, assumptions, 0, false, 'ok');
      assignType('field2', 'string', state, assumptions, 1, true, 'also ok');
      assignType('field3', 'string', state, assumptions, 2, true, 'bad');
      assignType('field3', 'number', state, assumptions, 3, true, 'bad');

      expect(() => validateNoConditionalTypeChanges(state)).toThrow(ConditionalTypeChangeError);

      try {
        validateNoConditionalTypeChanges(state);
      } catch (e: any) {
        expect(e.field).toBe('field3');
      }
    });
  });

  describe('complex scenarios', () => {
    it('handles reassignment chain', () => {
      // field1 = "string"
      assignType('field1', 'string', state, assumptions, 0, false, 'initial');
      // field2 = field1 (copies type)
      const field1Type = getOrCreateFieldType('field1', state);
      assignType('field2', field1Type, state, assumptions, 1, false, 'copy from field1');
      // field3 = field2 (copies type)
      const field2Type = getOrCreateFieldType('field2', state);
      assignType('field3', field2Type, state, assumptions, 2, false, 'copy from field2');

      expect(state.get('field3')?.currentType).toBe('string');
    });

    it('handles unknown field propagation', () => {
      // When we access an unknown field without assigning it first,
      // it creates a typeof placeholder
      const unknownType = getOrCreateFieldType('unknown', state);
      expect(unknownType).toBe('typeof_unknown');

      // Assign it to field1
      assignType('field1', unknownType, state, assumptions, 0, false, 'from unknown');
      expect(state.get('field1')?.currentType).toBe('typeof_unknown');

      // Copy field1 to field2
      const field1Type = state.get('field1')!.currentType;
      assignType('field2', field1Type, state, assumptions, 1, false, 'from field1');
      expect(state.get('field2')?.currentType).toBe('typeof_unknown');

      // At this point, no assumptions yet (just typeof propagation)
      expect(assumptions.length).toBe(0);

      // Now if we actually assign a value to 'unknown' field,
      // we're creating it for the first time with a concrete type
      // This doesn't resolve the typeof, it's just a new assignment
      assignType('unknown', 'number', state, assumptions, 2, false, 'create unknown field');
      expect(state.get('unknown')?.currentType).toBe('number');

      // Still no assumptions because 'unknown' field was never typeof_unknown in state
      // The typeof_unknown placeholder is a reference, not the field itself
      expect(assumptions.length).toBe(0);
    });
  });
});
