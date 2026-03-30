/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluateCondition } from './evaluate_conditions';

const typeMap = { status: 'keyword', priority: 'keyword', score: 'integer', notes: 'keyword' };

describe('evaluateCondition', () => {
  describe('unknown field reference', () => {
    it('returns true when the field is not in fieldTypeMap', () => {
      expect(
        evaluateCondition({ field: 'nonexistent', operator: 'eq', value: 'anything' }, {}, typeMap)
      ).toBe(true);
    });
  });

  describe('eq operator', () => {
    it('returns true when current value matches rule value', () => {
      expect(
        evaluateCondition(
          { field: 'status', operator: 'eq', value: 'open' },
          { status: 'open' },
          typeMap
        )
      ).toBe(true);
    });

    it('returns false when current value does not match rule value', () => {
      expect(
        evaluateCondition(
          { field: 'status', operator: 'eq', value: 'closed' },
          { status: 'open' },
          typeMap
        )
      ).toBe(false);
    });

    it('coerces numeric rule value to string for comparison', () => {
      expect(
        evaluateCondition({ field: 'score', operator: 'eq', value: 42 }, { score: '42' }, typeMap)
      ).toBe(true);
    });

    it('treats null current as empty string', () => {
      expect(
        evaluateCondition({ field: 'status', operator: 'eq', value: '' }, { status: null }, typeMap)
      ).toBe(true);
    });

    it('treats undefined current as empty string', () => {
      expect(
        evaluateCondition(
          { field: 'status', operator: 'eq', value: '' },
          { status: undefined },
          typeMap
        )
      ).toBe(true);
    });
  });

  describe('neq operator', () => {
    it('returns true when current value does not match rule value', () => {
      expect(
        evaluateCondition(
          { field: 'status', operator: 'neq', value: 'closed' },
          { status: 'open' },
          typeMap
        )
      ).toBe(true);
    });

    it('returns false when current value matches rule value', () => {
      expect(
        evaluateCondition(
          { field: 'status', operator: 'neq', value: 'open' },
          { status: 'open' },
          typeMap
        )
      ).toBe(false);
    });
  });

  describe('contains operator', () => {
    it('returns true when string field contains the substring', () => {
      expect(
        evaluateCondition(
          { field: 'notes', operator: 'contains', value: 'urgent' },
          { notes: 'this is urgent please' },
          typeMap
        )
      ).toBe(true);
    });

    it('returns false when string field does not contain the substring', () => {
      expect(
        evaluateCondition(
          { field: 'notes', operator: 'contains', value: 'urgent' },
          { notes: 'all good' },
          typeMap
        )
      ).toBe(false);
    });

    it('returns false for non-string field values', () => {
      expect(
        evaluateCondition(
          { field: 'score', operator: 'contains', value: '4' },
          { score: 42 },
          typeMap
        )
      ).toBe(false);
    });

    it('returns false when current is null', () => {
      expect(
        evaluateCondition(
          { field: 'notes', operator: 'contains', value: '' },
          { notes: null },
          typeMap
        )
      ).toBe(false);
    });
  });

  describe('empty operator', () => {
    it('returns true for null', () => {
      expect(
        evaluateCondition({ field: 'status', operator: 'empty' }, { status: null }, typeMap)
      ).toBe(true);
    });

    it('returns true for undefined', () => {
      expect(
        evaluateCondition({ field: 'status', operator: 'empty' }, { status: undefined }, typeMap)
      ).toBe(true);
    });

    it('returns true for empty string', () => {
      expect(
        evaluateCondition({ field: 'status', operator: 'empty' }, { status: '' }, typeMap)
      ).toBe(true);
    });

    it('returns false for a non-empty string', () => {
      expect(
        evaluateCondition({ field: 'status', operator: 'empty' }, { status: 'open' }, typeMap)
      ).toBe(false);
    });

    it('returns false for a numeric value', () => {
      expect(evaluateCondition({ field: 'score', operator: 'empty' }, { score: 0 }, typeMap)).toBe(
        false
      );
    });
  });

  describe('not_empty operator', () => {
    it('returns false for null', () => {
      expect(
        evaluateCondition({ field: 'status', operator: 'not_empty' }, { status: null }, typeMap)
      ).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(
        evaluateCondition(
          { field: 'status', operator: 'not_empty' },
          { status: undefined },
          typeMap
        )
      ).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(
        evaluateCondition({ field: 'status', operator: 'not_empty' }, { status: '' }, typeMap)
      ).toBe(false);
    });

    it('returns true for a non-empty string', () => {
      expect(
        evaluateCondition({ field: 'status', operator: 'not_empty' }, { status: 'open' }, typeMap)
      ).toBe(true);
    });

    it('returns true for a numeric zero value (only null/undefined/"" are empty)', () => {
      expect(
        evaluateCondition({ field: 'score', operator: 'not_empty' }, { score: 0 }, typeMap)
      ).toBe(true);
    });
  });

  describe('compound conditions', () => {
    describe('all (AND)', () => {
      it('returns true when every rule passes', () => {
        expect(
          evaluateCondition(
            {
              combine: 'all',
              rules: [
                { field: 'status', operator: 'eq', value: 'open' },
                { field: 'priority', operator: 'eq', value: 'high' },
              ],
            },
            { status: 'open', priority: 'high' },
            typeMap
          )
        ).toBe(true);
      });

      it('returns false when at least one rule fails', () => {
        expect(
          evaluateCondition(
            {
              combine: 'all',
              rules: [
                { field: 'status', operator: 'eq', value: 'open' },
                { field: 'priority', operator: 'eq', value: 'high' },
              ],
            },
            { status: 'open', priority: 'low' },
            typeMap
          )
        ).toBe(false);
      });

      it('returns false when all rules fail', () => {
        expect(
          evaluateCondition(
            {
              combine: 'all',
              rules: [
                { field: 'status', operator: 'eq', value: 'closed' },
                { field: 'priority', operator: 'eq', value: 'high' },
              ],
            },
            { status: 'open', priority: 'low' },
            typeMap
          )
        ).toBe(false);
      });
    });

    describe('any (OR)', () => {
      it('returns true when at least one rule passes', () => {
        expect(
          evaluateCondition(
            {
              combine: 'any',
              rules: [
                { field: 'status', operator: 'eq', value: 'closed' },
                { field: 'priority', operator: 'eq', value: 'high' },
              ],
            },
            { status: 'open', priority: 'high' },
            typeMap
          )
        ).toBe(true);
      });

      it('returns false when no rules pass', () => {
        expect(
          evaluateCondition(
            {
              combine: 'any',
              rules: [
                { field: 'status', operator: 'eq', value: 'closed' },
                { field: 'priority', operator: 'eq', value: 'urgent' },
              ],
            },
            { status: 'open', priority: 'high' },
            typeMap
          )
        ).toBe(false);
      });

      it('returns true when all rules pass', () => {
        expect(
          evaluateCondition(
            {
              combine: 'any',
              rules: [
                { field: 'status', operator: 'eq', value: 'open' },
                { field: 'priority', operator: 'eq', value: 'high' },
              ],
            },
            { status: 'open', priority: 'high' },
            typeMap
          )
        ).toBe(true);
      });
    });
  });

  describe('simple ConditionRule (no rules array)', () => {
    it('evaluates a single rule directly', () => {
      expect(
        evaluateCondition(
          { field: 'priority', operator: 'eq', value: 'urgent' },
          { priority: 'urgent' },
          typeMap
        )
      ).toBe(true);
    });
  });
});
