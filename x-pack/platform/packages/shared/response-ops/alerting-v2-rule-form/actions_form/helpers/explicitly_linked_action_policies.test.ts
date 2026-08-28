/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { buildRuleScopedMatcher } from './rule_scoped_action_policies';
import {
  isExplicitlyLinkedToRule,
  isRuleScopedCatchAllMatcher,
  summarizeExplicitlyLinkedActionPolicies,
} from './explicitly_linked_action_policies';

const RULE_ID = 'rule-abc-123';

const buildPolicy = (overrides: Partial<ActionPolicyResponse> = {}): ActionPolicyResponse =>
  ({
    id: 'policy-1',
    name: 'Policy Alpha',
    description: '',
    enabled: true,
    destinations: [{ type: 'workflow', id: 'workflow-1' }],
    matcher: buildRuleScopedMatcher(RULE_ID),
    groupBy: null,
    tags: null,
    groupingMode: 'per_episode',
    throttle: null,
    snoozedUntil: null,
    auth: { owner: 'user', createdByUser: true },
    createdBy: 'user',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'user',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as ActionPolicyResponse);

describe('isExplicitlyLinkedToRule', () => {
  it('returns true for the simple-action rule.id matcher', () => {
    expect(isExplicitlyLinkedToRule(buildRuleScopedMatcher(RULE_ID), RULE_ID)).toBe(true);
  });

  it('returns true for a structured matcher with the rule id in the rules array', () => {
    expect(isExplicitlyLinkedToRule({ rules: [RULE_ID] }, RULE_ID)).toBe(true);
    expect(isExplicitlyLinkedToRule({ rules: [RULE_ID], expression: 'severity: "high"' }, RULE_ID)).toBe(true);
  });

  it('returns true when rules contains the rule id alongside other rules', () => {
    expect(isExplicitlyLinkedToRule({ rules: [RULE_ID, 'other-rule'] }, RULE_ID)).toBe(true);
  });

  it('returns false for null, empty, or matchers without a rules array', () => {
    expect(isExplicitlyLinkedToRule(null, RULE_ID)).toBe(false);
    expect(isExplicitlyLinkedToRule({}, RULE_ID)).toBe(false);
    expect(isExplicitlyLinkedToRule({ rules: [] }, RULE_ID)).toBe(false);
    expect(isExplicitlyLinkedToRule({ expression: 'invalid kql (((' }, RULE_ID)).toBe(false);
  });

  it('returns false when the matcher references a different rule id', () => {
    expect(isExplicitlyLinkedToRule(buildRuleScopedMatcher('other-rule'), RULE_ID)).toBe(false);
  });

  it('returns false for global catch-all matchers', () => {
    expect(isExplicitlyLinkedToRule(null, RULE_ID)).toBe(false);
    expect(isExplicitlyLinkedToRule({ expression: 'severity: "high"' }, RULE_ID)).toBe(false);
  });
});

describe('isRuleScopedCatchAllMatcher', () => {
  it('returns true for a matcher that only scopes to the rule id', () => {
    expect(isRuleScopedCatchAllMatcher(buildRuleScopedMatcher(RULE_ID), RULE_ID)).toBe(true);
    expect(isRuleScopedCatchAllMatcher({ rules: [RULE_ID] }, RULE_ID)).toBe(true);
  });

  it('returns false when additional matching criteria are present', () => {
    expect(isRuleScopedCatchAllMatcher({ rules: [RULE_ID], expression: 'severity: "high"' }, RULE_ID)).toBe(false);
    expect(isRuleScopedCatchAllMatcher({ rules: [RULE_ID], tags: ['prod'] }, RULE_ID)).toBe(false);
  });

  it('returns false when the matcher is not explicitly linked', () => {
    expect(isRuleScopedCatchAllMatcher({ rules: ['other-rule'] }, RULE_ID)).toBe(false);
  });
});

describe('summarizeExplicitlyLinkedActionPolicies', () => {
  it('filters, sorts, and counts linked policies', () => {
    const summary = summarizeExplicitlyLinkedActionPolicies(
      [
        buildPolicy({
          id: 'policy-b',
          name: 'Bravo',
          matcher: { rules: [RULE_ID], expression: 'severity: "high"' },
        }),
        buildPolicy({ id: 'policy-a', name: 'Alpha' }),
        buildPolicy({
          id: 'policy-global',
          name: 'Global',
          matcher: null,
        }),
        buildPolicy({
          id: 'policy-other',
          name: 'Other rule',
          matcher: buildRuleScopedMatcher('other-rule'),
        }),
      ],
      RULE_ID
    );

    expect(summary.totalCount).toBe(2);
    expect(summary.matchingCriteriaCount).toBe(1);
    expect(summary.catchAllCount).toBe(1);
    expect(summary.policies.map((policy) => policy.id)).toEqual(['policy-a', 'policy-b']);
  });
});
