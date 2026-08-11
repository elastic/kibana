/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ID_MAX_LENGTH,
  MAX_SEARCH_LENGTH,
  EXECUTION_HISTORY_DEFAULT_PER_PAGE,
  EXECUTION_HISTORY_MAX_PER_PAGE,
  EXECUTION_HISTORY_MAX_RESULT_WINDOW,
  EXECUTION_HISTORY_MAX_RULE_ID_FILTER,
} from './constants';
import {
  MAX_EMBEDDED_RULES_PER_ITEM,
  listPolicyExecutionHistoryRequestSchema,
  listPolicyExecutionHistoryResponseSchema,
  policyExecutionHistoryItemSchema,
  policyExecutionOutcomeFilterSchema,
  policyExecutionOutcomeSchema,
  searchMatchCountsSchema,
} from './policy_execution_history_schema';

const validItem = {
  dispatched_at: '2026-06-01T00:00:00.000Z',
  policy: { id: 'policy-1', name: 'My policy' },
  outcome: 'dispatched' as const,
  episode_count: 2,
  action_group_count: 1,
  rules: [{ id: 'rule-1', name: 'Rule 1' }],
  totalRuleCount: 1,
  workflows: [{ id: 'workflow-1', name: 'Workflow 1' }],
};

describe('policy_execution_history_schema', () => {
  describe('policyExecutionOutcomeSchema', () => {
    it('accepts dispatched', () => {
      expect(policyExecutionOutcomeSchema.parse('dispatched')).toBe('dispatched');
    });

    it('accepts throttled', () => {
      expect(policyExecutionOutcomeSchema.parse('throttled')).toBe('throttled');
    });

    it('rejects outcomes the action policy stream does not emit', () => {
      expect(policyExecutionOutcomeSchema.safeParse('success').success).toBe(false);
      expect(policyExecutionOutcomeSchema.safeParse('failure').success).toBe(false);
      expect(policyExecutionOutcomeSchema.safeParse('unknown').success).toBe(false);
      expect(policyExecutionOutcomeSchema.safeParse('').success).toBe(false);
    });

    it('rejects non-string values', () => {
      expect(policyExecutionOutcomeSchema.safeParse(1).success).toBe(false);
      expect(policyExecutionOutcomeSchema.safeParse(undefined).success).toBe(false);
      expect(policyExecutionOutcomeSchema.safeParse(null).success).toBe(false);
    });
  });

  describe('policyExecutionOutcomeFilterSchema', () => {
    it('accepts a single string and coerces it to an array', () => {
      expect(policyExecutionOutcomeFilterSchema.parse('dispatched')).toEqual(['dispatched']);
    });

    it('accepts an array of both outcomes', () => {
      expect(policyExecutionOutcomeFilterSchema.parse(['dispatched', 'throttled'])).toEqual([
        'dispatched',
        'throttled',
      ]);
    });

    it('rejects an empty array', () => {
      expect(policyExecutionOutcomeFilterSchema.safeParse([]).success).toBe(false);
    });

    it('rejects an invalid outcome value', () => {
      expect(policyExecutionOutcomeFilterSchema.safeParse(['dispatched', 'skipped']).success).toBe(
        false
      );
    });

    it('rejects arrays longer than the number of distinct outcomes', () => {
      expect(
        policyExecutionOutcomeFilterSchema.safeParse([
          'dispatched',
          'throttled',
          'dispatch_failed',
          'dispatched',
        ]).success
      ).toBe(false);
    });
  });

  describe('listPolicyExecutionHistoryRequestSchema', () => {
    describe('defaults', () => {
      it('does not inject any defaults when no fields are provided', () => {
        const parsed = listPolicyExecutionHistoryRequestSchema.parse({});
        expect(parsed).toEqual({});
      });

      it('does not inject page / per_page / filters when missing', () => {
        const parsed = listPolicyExecutionHistoryRequestSchema.parse({});
        expect(parsed).not.toHaveProperty('page');
        expect(parsed).not.toHaveProperty('per_page');
        expect(parsed).not.toHaveProperty('search');
        expect(parsed).not.toHaveProperty('rule_ids');
        expect(parsed).not.toHaveProperty('episode_ids');
        expect(parsed).not.toHaveProperty('outcome');
        expect(parsed).not.toHaveProperty('start_date');
      });
    });

    describe('search', () => {
      it('accepts a valid search string', () => {
        expect(listPolicyExecutionHistoryRequestSchema.parse({ search: 'my policy' }).search).toBe(
          'my policy'
        );
      });

      it('trims surrounding whitespace', () => {
        expect(listPolicyExecutionHistoryRequestSchema.parse({ search: '  hello  ' }).search).toBe(
          'hello'
        );
      });

      it('rejects a whitespace-only string (empty after trim)', () => {
        expect(listPolicyExecutionHistoryRequestSchema.safeParse({ search: '   ' }).success).toBe(
          false
        );
      });

      it(`accepts a search of exactly MAX_SEARCH_LENGTH (${MAX_SEARCH_LENGTH}) chars`, () => {
        expect(
          listPolicyExecutionHistoryRequestSchema.safeParse({
            search: 'a'.repeat(MAX_SEARCH_LENGTH),
          }).success
        ).toBe(true);
      });

      it(`rejects a search longer than MAX_SEARCH_LENGTH (${MAX_SEARCH_LENGTH}) chars`, () => {
        expect(
          listPolicyExecutionHistoryRequestSchema.safeParse({
            search: 'a'.repeat(MAX_SEARCH_LENGTH + 1),
          }).success
        ).toBe(false);
      });
    });

    describe('rule_ids', () => {
      it('accepts a single string and coerces it to an array', () => {
        const parsed = listPolicyExecutionHistoryRequestSchema.parse({ rule_ids: 'rule-x' });
        expect(parsed.rule_ids).toEqual(['rule-x']);
      });

      it('accepts an array of valid rule ids (repeated `?rule_ids=…` style)', () => {
        const parsed = listPolicyExecutionHistoryRequestSchema.parse({
          rule_ids: ['rule-x', 'rule-y'],
        });
        expect(parsed.rule_ids).toEqual(['rule-x', 'rule-y']);
      });

      it('trims each id', () => {
        const parsed = listPolicyExecutionHistoryRequestSchema.parse({ rule_ids: ['  rule-x  '] });
        expect(parsed.rule_ids).toEqual(['rule-x']);
      });

      it('rejects an empty string', () => {
        expect(listPolicyExecutionHistoryRequestSchema.safeParse({ rule_ids: '' }).success).toBe(
          false
        );
      });

      it('rejects an empty array', () => {
        expect(listPolicyExecutionHistoryRequestSchema.safeParse({ rule_ids: [] }).success).toBe(
          false
        );
      });

      it(`accepts an id of exactly ID_MAX_LENGTH (${ID_MAX_LENGTH}) chars`, () => {
        expect(
          listPolicyExecutionHistoryRequestSchema.safeParse({ rule_ids: 'a'.repeat(ID_MAX_LENGTH) })
            .success
        ).toBe(true);
      });

      it(`rejects strings longer than ID_MAX_LENGTH (${ID_MAX_LENGTH}) chars`, () => {
        expect(
          listPolicyExecutionHistoryRequestSchema.safeParse({
            rule_ids: 'a'.repeat(ID_MAX_LENGTH + 1),
          }).success
        ).toBe(false);
      });

      it('rejects arrays longer than the rule-id filter cap', () => {
        const tooMany = Array.from(
          { length: EXECUTION_HISTORY_MAX_RULE_ID_FILTER + 1 },
          (_, i) => `rule-${i}`
        );
        expect(
          listPolicyExecutionHistoryRequestSchema.safeParse({ rule_ids: tooMany }).success
        ).toBe(false);
      });

      it('accepts an array at the exact rule-id filter cap', () => {
        const justRight = Array.from(
          { length: EXECUTION_HISTORY_MAX_RULE_ID_FILTER },
          (_, i) => `rule-${i}`
        );
        const parsed = listPolicyExecutionHistoryRequestSchema.parse({ rule_ids: justRight });
        expect(parsed.rule_ids).toHaveLength(EXECUTION_HISTORY_MAX_RULE_ID_FILTER);
      });
    });

    describe('episode_ids', () => {
      it('accepts a single string and coerces it to an array', () => {
        const parsed = listPolicyExecutionHistoryRequestSchema.parse({ episode_ids: 'episode-x' });
        expect(parsed.episode_ids).toEqual(['episode-x']);
      });

      it('accepts an array of valid episode ids', () => {
        const parsed = listPolicyExecutionHistoryRequestSchema.parse({
          episode_ids: ['episode-x', 'episode-y'],
        });
        expect(parsed.episode_ids).toEqual(['episode-x', 'episode-y']);
      });

      it('rejects an empty array', () => {
        expect(listPolicyExecutionHistoryRequestSchema.safeParse({ episode_ids: [] }).success).toBe(
          false
        );
      });

      it(`rejects an entry longer than ID_MAX_LENGTH (${ID_MAX_LENGTH}) chars`, () => {
        expect(
          listPolicyExecutionHistoryRequestSchema.safeParse({
            episode_ids: ['episode-x', 'a'.repeat(ID_MAX_LENGTH + 1)],
          }).success
        ).toBe(false);
      });
    });

    describe('outcome', () => {
      it('accepts a single string and coerces it to an array', () => {
        const parsed = listPolicyExecutionHistoryRequestSchema.parse({ outcome: 'dispatched' });
        expect(parsed.outcome).toEqual(['dispatched']);
      });

      it('accepts an array of valid outcomes', () => {
        const parsed = listPolicyExecutionHistoryRequestSchema.parse({
          outcome: ['dispatched', 'throttled'],
        });
        expect(parsed.outcome).toEqual(['dispatched', 'throttled']);
      });

      it('rejects an empty array', () => {
        expect(listPolicyExecutionHistoryRequestSchema.safeParse({ outcome: [] }).success).toBe(
          false
        );
      });

      it('rejects outcome values the action policy stream does not emit', () => {
        expect(
          listPolicyExecutionHistoryRequestSchema.safeParse({ outcome: ['success'] }).success
        ).toBe(false);
        expect(
          listPolicyExecutionHistoryRequestSchema.safeParse({ outcome: ['unknown'] }).success
        ).toBe(false);
      });
    });

    describe('start_date (ISO datetime)', () => {
      it('accepts a Z-suffixed ISO datetime', () => {
        const parsed = listPolicyExecutionHistoryRequestSchema.parse({
          start_date: '2026-06-01T00:00:00Z',
        });
        expect(parsed.start_date).toBe('2026-06-01T00:00:00Z');
      });

      it('rejects free-form date expressions', () => {
        expect(
          listPolicyExecutionHistoryRequestSchema.safeParse({ start_date: 'yesterday' }).success
        ).toBe(false);
        expect(
          listPolicyExecutionHistoryRequestSchema.safeParse({ start_date: 'now' }).success
        ).toBe(false);
      });

      it('rejects a date-only string without a time component', () => {
        expect(
          listPolicyExecutionHistoryRequestSchema.safeParse({ start_date: '2026-06-01' }).success
        ).toBe(false);
      });
    });

    describe('page', () => {
      it('coerces a numeric string into a number', () => {
        expect(listPolicyExecutionHistoryRequestSchema.parse({ page: '3' }).page).toBe(3);
      });

      it('rejects page below 1', () => {
        expect(listPolicyExecutionHistoryRequestSchema.safeParse({ page: 0 }).success).toBe(false);
        expect(listPolicyExecutionHistoryRequestSchema.safeParse({ page: -1 }).success).toBe(false);
      });

      it('rejects non-integer pages', () => {
        expect(listPolicyExecutionHistoryRequestSchema.safeParse({ page: 1.5 }).success).toBe(
          false
        );
      });
    });

    describe('per_page', () => {
      it('coerces a numeric string into a number', () => {
        expect(listPolicyExecutionHistoryRequestSchema.parse({ per_page: '25' }).per_page).toBe(25);
      });

      it('accepts per_page=0 for a count-only read', () => {
        expect(listPolicyExecutionHistoryRequestSchema.parse({ per_page: 0 }).per_page).toBe(0);
      });

      it('rejects negative per_page', () => {
        expect(listPolicyExecutionHistoryRequestSchema.safeParse({ per_page: -1 }).success).toBe(
          false
        );
      });

      it('rejects per_page above the maximum', () => {
        expect(
          listPolicyExecutionHistoryRequestSchema.safeParse({
            per_page: EXECUTION_HISTORY_MAX_PER_PAGE + 1,
          }).success
        ).toBe(false);
      });

      it('rejects non-integer per_page', () => {
        expect(listPolicyExecutionHistoryRequestSchema.safeParse({ per_page: 20.5 }).success).toBe(
          false
        );
      });
    });

    describe('deep-pagination guard (page * per_page <= max result window)', () => {
      it('accepts the exact boundary with explicit pagination', () => {
        const page = EXECUTION_HISTORY_MAX_RESULT_WINDOW / EXECUTION_HISTORY_MAX_PER_PAGE;
        const parsed = listPolicyExecutionHistoryRequestSchema.parse({
          page,
          per_page: EXECUTION_HISTORY_MAX_PER_PAGE,
        });
        expect(parsed.page).toBe(page);
      });

      it('rejects combinations whose product exceeds the cap', () => {
        expect(
          listPolicyExecutionHistoryRequestSchema.safeParse({
            page: EXECUTION_HISTORY_MAX_RESULT_WINDOW / EXECUTION_HISTORY_MAX_PER_PAGE + 1,
            per_page: EXECUTION_HISTORY_MAX_PER_PAGE,
          }).success
        ).toBe(false);
      });

      it('applies the default per_page (20) in the guard when per_page is omitted', () => {
        // page * 20 must stay <= 10_000, so page 500 is the boundary.
        const boundaryPage =
          EXECUTION_HISTORY_MAX_RESULT_WINDOW / EXECUTION_HISTORY_DEFAULT_PER_PAGE;
        expect(
          listPolicyExecutionHistoryRequestSchema.safeParse({ page: boundaryPage }).success
        ).toBe(true);
        expect(
          listPolicyExecutionHistoryRequestSchema.safeParse({ page: boundaryPage + 1 }).success
        ).toBe(false);
      });

      it('never trips the guard for a count-only read (per_page=0)', () => {
        expect(
          listPolicyExecutionHistoryRequestSchema.safeParse({
            page: EXECUTION_HISTORY_MAX_RESULT_WINDOW,
            per_page: 0,
          }).success
        ).toBe(true);
      });
    });

    it('round-trips a fully populated query (with already-array fields)', () => {
      const input = {
        page: 2,
        per_page: 25,
        start_date: '2026-06-01T00:00:00Z',
        episode_ids: ['episode-x', 'episode-y'],
        search: 'db outage',
        rule_ids: ['rule-x', 'rule-y'],
        outcome: ['dispatched', 'throttled'] as const,
      };
      expect(listPolicyExecutionHistoryRequestSchema.parse(input)).toEqual(input);
    });
  });

  describe('policyExecutionHistoryItemSchema', () => {
    it('accepts a valid item', () => {
      expect(policyExecutionHistoryItemSchema.parse(validItem)).toEqual(validItem);
    });

    it('accepts a null policy name', () => {
      const item = { ...validItem, policy: { id: 'policy-1', name: null } };
      expect(policyExecutionHistoryItemSchema.parse(item).policy.name).toBeNull();
    });

    it('accepts a missing policy name (optional)', () => {
      const item = { ...validItem, policy: { id: 'policy-1' } };
      expect(policyExecutionHistoryItemSchema.safeParse(item).success).toBe(true);
    });

    it('rejects an outcome the item stream does not emit', () => {
      const item = { ...validItem, outcome: 'success' };
      expect(policyExecutionHistoryItemSchema.safeParse(item).success).toBe(false);
    });

    it(`accepts a rules array at the embedded cap (${MAX_EMBEDDED_RULES_PER_ITEM})`, () => {
      const rules = Array.from({ length: MAX_EMBEDDED_RULES_PER_ITEM }, (_, i) => ({
        id: `rule-${i}`,
        name: `Rule ${i}`,
      }));
      expect(policyExecutionHistoryItemSchema.safeParse({ ...validItem, rules }).success).toBe(
        true
      );
    });

    it(`rejects a rules array above the embedded cap (${MAX_EMBEDDED_RULES_PER_ITEM})`, () => {
      const rules = Array.from({ length: MAX_EMBEDDED_RULES_PER_ITEM + 1 }, (_, i) => ({
        id: `rule-${i}`,
      }));
      expect(policyExecutionHistoryItemSchema.safeParse({ ...validItem, rules }).success).toBe(
        false
      );
    });

    it('rejects rows missing a required field', () => {
      const { dispatched_at: _omit, ...rest } = validItem;
      expect(policyExecutionHistoryItemSchema.safeParse(rest).success).toBe(false);
    });
  });

  describe('searchMatchCountsSchema', () => {
    it('accepts valid counts', () => {
      const counts = { policies: 3, rules: 10, cap: 100 };
      expect(searchMatchCountsSchema.parse(counts)).toEqual(counts);
    });

    it('requires all three counts', () => {
      expect(searchMatchCountsSchema.safeParse({ policies: 3, rules: 10 }).success).toBe(false);
    });
  });

  describe('listPolicyExecutionHistoryResponseSchema', () => {
    it('accepts a valid empty page with searchMatches=null', () => {
      const parsed = listPolicyExecutionHistoryResponseSchema.parse({
        items: [],
        page: 1,
        perPage: EXECUTION_HISTORY_DEFAULT_PER_PAGE,
        totalEvents: 0,
        searchMatches: null,
      });
      expect(parsed.items).toEqual([]);
      expect(parsed.searchMatches).toBeNull();
    });

    it('accepts a page of items with populated searchMatches', () => {
      const parsed = listPolicyExecutionHistoryResponseSchema.parse({
        items: [validItem],
        page: 1,
        perPage: 20,
        totalEvents: 1,
        searchMatches: { policies: 1, rules: 1, cap: 100 },
      });
      expect(parsed.items).toHaveLength(1);
    });

    it('accepts perPage=0 for a count-only read', () => {
      expect(
        listPolicyExecutionHistoryResponseSchema.safeParse({
          items: [],
          page: 1,
          perPage: 0,
          totalEvents: 42,
          searchMatches: null,
        }).success
      ).toBe(true);
    });

    it('rejects page below 1', () => {
      expect(
        listPolicyExecutionHistoryResponseSchema.safeParse({
          items: [],
          page: 0,
          perPage: 20,
          totalEvents: 0,
          searchMatches: null,
        }).success
      ).toBe(false);
    });

    it('rejects a negative perPage', () => {
      expect(
        listPolicyExecutionHistoryResponseSchema.safeParse({
          items: [],
          page: 1,
          perPage: -1,
          totalEvents: 0,
          searchMatches: null,
        }).success
      ).toBe(false);
    });

    it('rejects a negative totalEvents', () => {
      expect(
        listPolicyExecutionHistoryResponseSchema.safeParse({
          items: [],
          page: 1,
          perPage: 20,
          totalEvents: -1,
          searchMatches: null,
        }).success
      ).toBe(false);
    });

    it('rejects items that do not conform to the item schema', () => {
      const badItem = { ...validItem, outcome: 'success' };
      expect(
        listPolicyExecutionHistoryResponseSchema.safeParse({
          items: [badItem],
          page: 1,
          perPage: 20,
          totalEvents: 1,
          searchMatches: null,
        }).success
      ).toBe(false);
    });
  });
});
