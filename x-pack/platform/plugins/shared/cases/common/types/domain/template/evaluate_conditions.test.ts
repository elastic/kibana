/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluateCondition } from './evaluate_conditions';
import type { ConditionRule, CompoundCondition } from './fields';

const fieldTypeMap = { color: 'keyword', count: 'long' };

describe('evaluateCondition', () => {
  describe('simple ConditionRule', () => {
    it('eq: returns true when values match', () => {
      const rule: ConditionRule = { field: 'color', operator: 'eq', value: 'red' };
      expect(evaluateCondition(rule, { color: 'red' }, fieldTypeMap)).toBe(true);
    });

    it('eq: returns false when values differ', () => {
      const rule: ConditionRule = { field: 'color', operator: 'eq', value: 'red' };
      expect(evaluateCondition(rule, { color: 'blue' }, fieldTypeMap)).toBe(false);
    });

    it('neq: returns true when values differ', () => {
      const rule: ConditionRule = { field: 'color', operator: 'neq', value: 'red' };
      expect(evaluateCondition(rule, { color: 'blue' }, fieldTypeMap)).toBe(true);
    });

    it('neq: returns false when values match', () => {
      const rule: ConditionRule = { field: 'color', operator: 'neq', value: 'red' };
      expect(evaluateCondition(rule, { color: 'red' }, fieldTypeMap)).toBe(false);
    });

    it('contains: returns true when string contains substring', () => {
      const rule: ConditionRule = { field: 'color', operator: 'contains', value: 'ell' };
      expect(evaluateCondition(rule, { color: 'yellow' }, fieldTypeMap)).toBe(true);
    });

    it('contains: returns false when string does not contain substring', () => {
      const rule: ConditionRule = { field: 'color', operator: 'contains', value: 'zzz' };
      expect(evaluateCondition(rule, { color: 'yellow' }, fieldTypeMap)).toBe(false);
    });

    it('contains: returns false for non-string field value', () => {
      const rule: ConditionRule = { field: 'count', operator: 'contains', value: '1' };
      expect(evaluateCondition(rule, { count: 10 }, fieldTypeMap)).toBe(false);
    });

    it('empty: returns true when value is empty string', () => {
      const rule: ConditionRule = { field: 'color', operator: 'empty' };
      expect(evaluateCondition(rule, { color: '' }, fieldTypeMap)).toBe(true);
    });

    it('empty: returns true when value is undefined', () => {
      const rule: ConditionRule = { field: 'color', operator: 'empty' };
      expect(evaluateCondition(rule, {}, fieldTypeMap)).toBe(true);
    });

    it('empty: returns false when value is set', () => {
      const rule: ConditionRule = { field: 'color', operator: 'empty' };
      expect(evaluateCondition(rule, { color: 'red' }, fieldTypeMap)).toBe(false);
    });

    it('not_empty: returns true when value is set', () => {
      const rule: ConditionRule = { field: 'color', operator: 'not_empty' };
      expect(evaluateCondition(rule, { color: 'red' }, fieldTypeMap)).toBe(true);
    });

    it('not_empty: returns false when value is empty string', () => {
      const rule: ConditionRule = { field: 'color', operator: 'not_empty' };
      expect(evaluateCondition(rule, { color: '' }, fieldTypeMap)).toBe(false);
    });

    it('unknown field defaults to true (safe: do not hide by surprise)', () => {
      const rule: ConditionRule = { field: 'nonexistent', operator: 'eq', value: 'x' };
      expect(evaluateCondition(rule, {}, fieldTypeMap)).toBe(true);
    });
  });

  describe('USER_PICKER field', () => {
    const typeMapWithUser = { ...fieldTypeMap, assignee: 'keyword' };
    const controlMapWithUser = { assignee: 'USER_PICKER' };

    it('contains: returns true when a user uid matches', () => {
      const rule: ConditionRule = { field: 'assignee', operator: 'contains', value: 'user-1' };
      expect(
        evaluateCondition(
          rule,
          { assignee: '[{"uid":"user-1","name":"Alice"},{"uid":"user-2","name":"Bob"}]' },
          typeMapWithUser,
          controlMapWithUser
        )
      ).toBe(true);
    });

    it('contains: returns false when no user uid matches', () => {
      const rule: ConditionRule = { field: 'assignee', operator: 'contains', value: 'user-99' };
      expect(
        evaluateCondition(
          rule,
          { assignee: '[{"uid":"user-1","name":"Alice"}]' },
          typeMapWithUser,
          controlMapWithUser
        )
      ).toBe(false);
    });

    it('contains: does not match on name field', () => {
      const rule: ConditionRule = { field: 'assignee', operator: 'contains', value: 'Alice' };
      expect(
        evaluateCondition(
          rule,
          { assignee: '[{"uid":"user-1","name":"Alice"}]' },
          typeMapWithUser,
          controlMapWithUser
        )
      ).toBe(false);
    });

    it('empty: returns true when no users are selected', () => {
      const rule: ConditionRule = { field: 'assignee', operator: 'empty' };
      expect(evaluateCondition(rule, { assignee: '[]' }, typeMapWithUser, controlMapWithUser)).toBe(
        true
      );
    });

    it('not_empty: returns true when at least one user is selected', () => {
      const rule: ConditionRule = { field: 'assignee', operator: 'not_empty' };
      expect(
        evaluateCondition(
          rule,
          { assignee: '[{"uid":"user-1","name":"Alice"}]' },
          typeMapWithUser,
          controlMapWithUser
        )
      ).toBe(true);
    });
  });

  describe('CompoundCondition (all / any)', () => {
    const ruleRed: ConditionRule = { field: 'color', operator: 'eq', value: 'red' };
    const ruleNotEmpty: ConditionRule = { field: 'color', operator: 'not_empty' };

    it('all (default): returns true when all rules pass', () => {
      const compound: CompoundCondition = { combine: 'all', rules: [ruleRed, ruleNotEmpty] };
      expect(evaluateCondition(compound, { color: 'red' }, fieldTypeMap)).toBe(true);
    });

    it('all: returns false when any rule fails', () => {
      const ruleBlue: ConditionRule = { field: 'color', operator: 'eq', value: 'blue' };
      const compound: CompoundCondition = { combine: 'all', rules: [ruleRed, ruleBlue] };
      expect(evaluateCondition(compound, { color: 'red' }, fieldTypeMap)).toBe(false);
    });

    it('any: returns true when at least one rule passes', () => {
      const ruleBlue: ConditionRule = { field: 'color', operator: 'eq', value: 'blue' };
      const compound: CompoundCondition = { combine: 'any', rules: [ruleRed, ruleBlue] };
      expect(evaluateCondition(compound, { color: 'red' }, fieldTypeMap)).toBe(true);
    });

    it('any: returns false when no rules pass', () => {
      const ruleBlue: ConditionRule = { field: 'color', operator: 'eq', value: 'blue' };
      const ruleGreen: ConditionRule = { field: 'color', operator: 'eq', value: 'green' };
      const compound: CompoundCondition = { combine: 'any', rules: [ruleBlue, ruleGreen] };
      expect(evaluateCondition(compound, { color: 'red' }, fieldTypeMap)).toBe(false);
    });
  });
});
