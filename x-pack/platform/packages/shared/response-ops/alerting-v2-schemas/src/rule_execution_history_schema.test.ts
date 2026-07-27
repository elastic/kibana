/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ID_MAX_LENGTH,
  EXECUTION_HISTORY_DEFAULT_PER_PAGE,
  EXECUTION_HISTORY_MAX_PER_PAGE,
  EXECUTION_HISTORY_MAX_RESULT_WINDOW,
  EXECUTION_HISTORY_MAX_RULE_ID_FILTER,
} from './constants';
import {
  listRuleExecutionsQuerySchema,
  listRuleExecutionsResponseSchema,
  ruleExecutionOutcomeSchema,
  ruleExecutionViewSchema,
} from './rule_execution_history_schema';

const validView = {
  id: 'doc-1',
  rule: { id: 'rule-1', version: null },
  spaceId: 'default',
  startedAt: '2026-06-01T00:00:00.000Z',
  endedAt: '2026-06-01T00:00:01.500Z',
  timings: { duration: 1500, scheduledDelay: 250 },
  outcome: 'success' as const,
  reason: null,
  error: null,
};

describe('rule_execution_history_schema', () => {
  describe('ruleExecutionOutcomeSchema', () => {
    it('accepts success', () => {
      expect(ruleExecutionOutcomeSchema.parse('success')).toBe('success');
    });

    it('accepts failure', () => {
      expect(ruleExecutionOutcomeSchema.parse('failure')).toBe('failure');
    });

    it('rejects anything Task Manager does not emit today (incl. the ECS `unknown` value)', () => {
      expect(ruleExecutionOutcomeSchema.safeParse('unknown').success).toBe(false);
      expect(ruleExecutionOutcomeSchema.safeParse('cancelled').success).toBe(false);
      expect(ruleExecutionOutcomeSchema.safeParse('partial').success).toBe(false);
      expect(ruleExecutionOutcomeSchema.safeParse('').success).toBe(false);
    });

    it('rejects non-string values', () => {
      expect(ruleExecutionOutcomeSchema.safeParse(1).success).toBe(false);
      expect(ruleExecutionOutcomeSchema.safeParse(undefined).success).toBe(false);
      expect(ruleExecutionOutcomeSchema.safeParse(null).success).toBe(false);
    });
  });

  describe('listRuleExecutionsQuerySchema', () => {
    describe('defaults', () => {
      it('fills in defaults when no fields are provided', () => {
        const parsed = listRuleExecutionsQuerySchema.parse({});
        expect(parsed).toEqual({
          sort: 'startedAt',
          sortOrder: 'desc',
          page: 1,
          perPage: EXECUTION_HISTORY_DEFAULT_PER_PAGE,
        });
      });

      it('does not inject ruleIds / outcome / from / to when missing', () => {
        const parsed = listRuleExecutionsQuerySchema.parse({});
        expect(parsed).not.toHaveProperty('ruleIds');
        expect(parsed).not.toHaveProperty('outcome');
        expect(parsed).not.toHaveProperty('from');
        expect(parsed).not.toHaveProperty('to');
      });
    });

    describe('ruleIds', () => {
      it('accepts a single string and coerces it to an array', () => {
        const parsed = listRuleExecutionsQuerySchema.parse({ ruleIds: 'rule-x' });
        expect(parsed.ruleIds).toEqual(['rule-x']);
      });

      it('accepts an array of valid rule ids (repeated `?ruleIds=…` style)', () => {
        const parsed = listRuleExecutionsQuerySchema.parse({
          ruleIds: ['rule-x', 'rule-y'],
        });
        expect(parsed.ruleIds).toEqual(['rule-x', 'rule-y']);
      });

      it('rejects an empty string', () => {
        expect(listRuleExecutionsQuerySchema.safeParse({ ruleIds: '' }).success).toBe(false);
      });

      it('rejects an empty array', () => {
        expect(listRuleExecutionsQuerySchema.safeParse({ ruleIds: [] }).success).toBe(false);
      });

      it('rejects an array entry that is an empty string', () => {
        expect(listRuleExecutionsQuerySchema.safeParse({ ruleIds: ['rule-x', ''] }).success).toBe(
          false
        );
      });

      it(`accepts an id of exactly ID_MAX_LENGTH (${ID_MAX_LENGTH}) chars`, () => {
        expect(
          listRuleExecutionsQuerySchema.safeParse({ ruleIds: 'a'.repeat(ID_MAX_LENGTH) }).success
        ).toBe(true);
      });

      it(`rejects strings longer than ID_MAX_LENGTH (${ID_MAX_LENGTH}) chars`, () => {
        expect(
          listRuleExecutionsQuerySchema.safeParse({ ruleIds: 'a'.repeat(ID_MAX_LENGTH + 1) })
            .success
        ).toBe(false);
      });

      it(`rejects an array entry longer than ID_MAX_LENGTH (${ID_MAX_LENGTH}) chars`, () => {
        expect(
          listRuleExecutionsQuerySchema.safeParse({
            ruleIds: ['rule-x', 'a'.repeat(ID_MAX_LENGTH + 1)],
          }).success
        ).toBe(false);
      });

      it('rejects arrays longer than the rule-id filter cap', () => {
        const tooMany = Array.from(
          { length: EXECUTION_HISTORY_MAX_RULE_ID_FILTER + 1 },
          (_, i) => `rule-${i}`
        );
        expect(listRuleExecutionsQuerySchema.safeParse({ ruleIds: tooMany }).success).toBe(false);
      });

      it('accepts an array at the exact rule-id filter cap', () => {
        const justRight = Array.from(
          { length: EXECUTION_HISTORY_MAX_RULE_ID_FILTER },
          (_, i) => `rule-${i}`
        );
        const parsed = listRuleExecutionsQuerySchema.parse({ ruleIds: justRight });
        expect(parsed.ruleIds).toHaveLength(EXECUTION_HISTORY_MAX_RULE_ID_FILTER);
      });
    });

    describe('outcome', () => {
      it('accepts a single string and coerces it to an array', () => {
        const parsed = listRuleExecutionsQuerySchema.parse({ outcome: 'success' });
        expect(parsed.outcome).toEqual(['success']);
      });

      it('accepts an array of valid outcomes', () => {
        const parsed = listRuleExecutionsQuerySchema.parse({
          outcome: ['success', 'failure'],
        });
        expect(parsed.outcome).toEqual(['success', 'failure']);
      });

      it('rejects an empty array', () => {
        expect(listRuleExecutionsQuerySchema.safeParse({ outcome: [] }).success).toBe(false);
      });

      it('rejects outcome values Task Manager does not emit (incl. ECS `unknown`)', () => {
        expect(listRuleExecutionsQuerySchema.safeParse({ outcome: ['skipped'] }).success).toBe(
          false
        );
        expect(listRuleExecutionsQuerySchema.safeParse({ outcome: ['unknown'] }).success).toBe(
          false
        );
      });

      it('rejects arrays longer than the number of distinct outcomes', () => {
        expect(
          listRuleExecutionsQuerySchema.safeParse({
            outcome: ['success', 'failure', 'success'],
          }).success
        ).toBe(false);
      });
    });

    describe('from / to (ISO datetime)', () => {
      it('accepts a Z-suffixed ISO datetime', () => {
        const parsed = listRuleExecutionsQuerySchema.parse({
          from: '2026-06-01T00:00:00Z',
          to: '2026-06-02T00:00:00Z',
        });
        expect(parsed.from).toBe('2026-06-01T00:00:00Z');
        expect(parsed.to).toBe('2026-06-02T00:00:00Z');
      });

      it('rejects free-form date expressions', () => {
        expect(listRuleExecutionsQuerySchema.safeParse({ from: 'yesterday' }).success).toBe(false);
        expect(listRuleExecutionsQuerySchema.safeParse({ to: 'now' }).success).toBe(false);
      });

      it('rejects date-only strings without a time component', () => {
        expect(listRuleExecutionsQuerySchema.safeParse({ from: '2026-06-01' }).success).toBe(false);
      });
    });

    describe('sort / sortOrder', () => {
      it('accepts the supported sort fields', () => {
        expect(listRuleExecutionsQuerySchema.parse({ sort: 'startedAt' }).sort).toBe('startedAt');
        expect(listRuleExecutionsQuerySchema.parse({ sort: 'duration' }).sort).toBe('duration');
      });

      it('rejects unknown sort fields', () => {
        expect(listRuleExecutionsQuerySchema.safeParse({ sort: 'createdAt' }).success).toBe(false);
      });

      it('accepts asc and desc as sort order', () => {
        expect(listRuleExecutionsQuerySchema.parse({ sortOrder: 'asc' }).sortOrder).toBe('asc');
        expect(listRuleExecutionsQuerySchema.parse({ sortOrder: 'desc' }).sortOrder).toBe('desc');
      });

      it('rejects unknown sort orders', () => {
        expect(listRuleExecutionsQuerySchema.safeParse({ sortOrder: 'random' }).success).toBe(
          false
        );
      });
    });

    describe('page', () => {
      it('coerces a numeric string into a number', () => {
        const parsed = listRuleExecutionsQuerySchema.parse({ page: '3' });
        expect(parsed.page).toBe(3);
      });

      it('rejects page below 1', () => {
        expect(listRuleExecutionsQuerySchema.safeParse({ page: 0 }).success).toBe(false);
        expect(listRuleExecutionsQuerySchema.safeParse({ page: -1 }).success).toBe(false);
      });

      it('rejects non-integer pages', () => {
        expect(listRuleExecutionsQuerySchema.safeParse({ page: 1.5 }).success).toBe(false);
      });

      it('rejects page above the result-window cap', () => {
        expect(
          listRuleExecutionsQuerySchema.safeParse({
            page: EXECUTION_HISTORY_MAX_RESULT_WINDOW + 1,
            perPage: 1,
          }).success
        ).toBe(false);
      });

      it('accepts page equal to the result-window cap when perPage=1', () => {
        const parsed = listRuleExecutionsQuerySchema.parse({
          page: EXECUTION_HISTORY_MAX_RESULT_WINDOW,
          perPage: 1,
        });
        expect(parsed.page).toBe(EXECUTION_HISTORY_MAX_RESULT_WINDOW);
        expect(parsed.perPage).toBe(1);
      });
    });

    describe('perPage', () => {
      it('coerces a numeric string into a number', () => {
        const parsed = listRuleExecutionsQuerySchema.parse({ perPage: '25' });
        expect(parsed.perPage).toBe(25);
      });

      it('rejects perPage below 1', () => {
        expect(listRuleExecutionsQuerySchema.safeParse({ perPage: 0 }).success).toBe(false);
      });

      it('rejects perPage above the maximum', () => {
        expect(
          listRuleExecutionsQuerySchema.safeParse({
            perPage: EXECUTION_HISTORY_MAX_PER_PAGE + 1,
          }).success
        ).toBe(false);
      });

      it('rejects non-integer perPage', () => {
        expect(listRuleExecutionsQuerySchema.safeParse({ perPage: 20.5 }).success).toBe(false);
      });
    });

    describe('deep-pagination guard (page * perPage <= max result window)', () => {
      it('accepts the exact boundary', () => {
        const parsed = listRuleExecutionsQuerySchema.parse({
          page: EXECUTION_HISTORY_MAX_RESULT_WINDOW / EXECUTION_HISTORY_MAX_PER_PAGE,
          perPage: EXECUTION_HISTORY_MAX_PER_PAGE,
        });
        expect(parsed.page).toBe(
          EXECUTION_HISTORY_MAX_RESULT_WINDOW / EXECUTION_HISTORY_MAX_PER_PAGE
        );
      });

      it('rejects combinations whose product exceeds the cap', () => {
        const result = listRuleExecutionsQuerySchema.safeParse({
          page: EXECUTION_HISTORY_MAX_RESULT_WINDOW / EXECUTION_HISTORY_MAX_PER_PAGE + 1,
          perPage: EXECUTION_HISTORY_MAX_PER_PAGE,
        });
        expect(result.success).toBe(false);
      });
    });

    it('round-trips a fully populated query (with already-array fields)', () => {
      const input = {
        ruleIds: ['rule-x', 'rule-y'],
        outcome: ['success', 'failure'] as const,
        from: '2026-06-01T00:00:00Z',
        to: '2026-06-02T00:00:00Z',
        sort: 'duration' as const,
        sortOrder: 'asc' as const,
        page: 2,
        perPage: 25,
      };
      expect(listRuleExecutionsQuerySchema.parse(input)).toEqual(input);
    });
  });

  describe('ruleExecutionViewSchema', () => {
    it('accepts a valid row with error=null', () => {
      expect(ruleExecutionViewSchema.parse(validView)).toEqual(validView);
    });

    it('accepts a populated error object with a nullable stack trace', () => {
      const row = {
        ...validView,
        outcome: 'failure' as const,
        reason: 'rule executor threw',
        error: { message: 'boom', stackTrace: null },
      };
      expect(ruleExecutionViewSchema.parse(row)).toEqual(row);
    });

    it('strips unknown rule fields like a previously-supported name', () => {
      const row = {
        ...validView,
        rule: { id: 'rule-1', version: null, name: 'My rule' },
      };

      const parsed = ruleExecutionViewSchema.parse(row);
      expect(parsed.rule).toEqual({ id: 'rule-1', version: null });
    });

    it('requires rule.id', () => {
      const row = { ...validView, rule: { version: null } as unknown as { id: string } };
      expect(ruleExecutionViewSchema.safeParse(row).success).toBe(false);
    });

    it('requires rule.version to be present (may be null until the executor writes it)', () => {
      const row = { ...validView, rule: { id: 'rule-1' } as { id: string } };
      expect(ruleExecutionViewSchema.safeParse(row).success).toBe(false);
    });

    it('accepts a populated rule.version when the upstream document carries one', () => {
      const row = { ...validView, rule: { id: 'rule-1', version: 7 } };
      expect(ruleExecutionViewSchema.parse(row).rule.version).toBe(7);
    });

    it('rejects a non-integer rule.version', () => {
      const row = { ...validView, rule: { id: 'rule-1', version: 1.5 } };
      expect(ruleExecutionViewSchema.safeParse(row).success).toBe(false);
    });

    it('rejects negative duration', () => {
      const row = { ...validView, timings: { duration: -1, scheduledDelay: 0 } };
      expect(ruleExecutionViewSchema.safeParse(row).success).toBe(false);
    });

    it('allows a negative scheduledDelay (run started ahead of scheduled time)', () => {
      const row = { ...validView, timings: { duration: 100, scheduledDelay: -50 } };
      expect(ruleExecutionViewSchema.parse(row).timings.scheduledDelay).toBe(-50);
    });

    it('rejects non-integer timings', () => {
      const row = { ...validView, timings: { duration: 1.5, scheduledDelay: 0 } };
      expect(ruleExecutionViewSchema.safeParse(row).success).toBe(false);
    });

    it('rejects outcomes Task Manager does not emit (incl. ECS `unknown`)', () => {
      expect(ruleExecutionViewSchema.safeParse({ ...validView, outcome: 'unknown' }).success).toBe(
        false
      );
      expect(ruleExecutionViewSchema.safeParse({ ...validView, outcome: 'skipped' }).success).toBe(
        false
      );
    });

    it('requires error.message when error is present', () => {
      const row = { ...validView, error: { stackTrace: null } };
      expect(ruleExecutionViewSchema.safeParse(row).success).toBe(false);
    });

    it('rejects rows missing required fields', () => {
      const { id: _omit, ...rest } = validView;
      expect(ruleExecutionViewSchema.safeParse(rest).success).toBe(false);
    });
  });

  describe('listRuleExecutionsResponseSchema', () => {
    it('accepts a valid empty page', () => {
      const parsed = listRuleExecutionsResponseSchema.parse({
        items: [],
        total: 0,
        page: 1,
        perPage: EXECUTION_HISTORY_DEFAULT_PER_PAGE,
      });
      expect(parsed.items).toEqual([]);
    });

    it('accepts a page of rule execution rows', () => {
      const parsed = listRuleExecutionsResponseSchema.parse({
        items: [validView],
        total: 1,
        page: 1,
        perPage: 20,
      });
      expect(parsed.items).toHaveLength(1);
    });

    it('rejects a negative total', () => {
      expect(
        listRuleExecutionsResponseSchema.safeParse({
          items: [],
          total: -1,
          page: 1,
          perPage: 20,
        }).success
      ).toBe(false);
    });

    it('rejects page or perPage below 1', () => {
      expect(
        listRuleExecutionsResponseSchema.safeParse({
          items: [],
          total: 0,
          page: 0,
          perPage: 20,
        }).success
      ).toBe(false);

      expect(
        listRuleExecutionsResponseSchema.safeParse({
          items: [],
          total: 0,
          page: 1,
          perPage: 0,
        }).success
      ).toBe(false);
    });

    it('rejects items that do not conform to the view schema', () => {
      const badItem = { ...validView, outcome: 'skipped' };
      expect(
        listRuleExecutionsResponseSchema.safeParse({
          items: [badItem],
          total: 1,
          page: 1,
          perPage: 20,
        }).success
      ).toBe(false);
    });
  });
});
