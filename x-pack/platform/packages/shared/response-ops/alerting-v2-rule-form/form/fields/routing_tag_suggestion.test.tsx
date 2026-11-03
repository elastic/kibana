/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyRoutingTagItem } from '@kbn/alerting-v2-schemas';
import {
  buildRoutingTagOption,
  getPolicyNamesText,
  getSuggestionAriaLabel,
} from './routing_tag_suggestion';

const item = (policyCount: number, names: string[]): ActionPolicyRoutingTagItem => ({
  tag: 'rna',
  policy_count: policyCount,
  policies: names.map((name) => ({ id: `id-${name}`, name })),
});

describe('getPolicyNamesText', () => {
  it('joins the policy names with commas', () => {
    expect(getPolicyNamesText(item(2, ['A', 'B']))).toBe('A, B');
  });

  it('ends with an ellipsis when more policies use the tag than are listed', () => {
    expect(getPolicyNamesText(item(7, ['A', 'B', 'C', 'D', 'E']))).toBe('A, B, C, D, E, …');
  });
});

describe('getSuggestionAriaLabel', () => {
  it('includes the full count and how many policies are not listed', () => {
    expect(getSuggestionAriaLabel(item(7, ['A', 'B', 'C', 'D', 'E']))).toBe(
      'rna, 7 action policies: A, B, C, D, E, and 2 more'
    );
  });

  it('omits the remainder when every policy is listed', () => {
    expect(getSuggestionAriaLabel(item(2, ['A', 'B']))).toBe('rna, 2 action policies: A, B');
  });

  it('uses the singular for a single policy', () => {
    expect(getSuggestionAriaLabel(item(1, ['A']))).toBe('rna, 1 action policy: A');
  });
});

describe('buildRoutingTagOption', () => {
  it('has no key, so selected pills, which have none, hide it from the list', () => {
    expect(buildRoutingTagOption(item(2, ['A', 'B']))).not.toHaveProperty('key');
  });

  it('uses the tag as the label and keeps the suggestion for rendering', () => {
    const suggestion = item(2, ['A', 'B']);

    expect(buildRoutingTagOption(suggestion)).toEqual(
      expect.objectContaining({
        label: 'rna',
        value: suggestion,
        'aria-label': 'rna, 2 action policies: A, B',
      })
    );
  });
});
