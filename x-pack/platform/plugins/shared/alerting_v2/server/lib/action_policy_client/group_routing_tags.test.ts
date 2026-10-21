/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyRoutingTagSource } from '../services/action_policy_saved_object_service/types';
import { groupRoutingTags } from './group_routing_tags';

const policy = (
  id: string,
  name: string,
  enabled: boolean,
  matcher: ActionPolicyRoutingTagSource['matcher']
): ActionPolicyRoutingTagSource => ({ id, name, enabled, matcher });

const group = (
  policies: ActionPolicyRoutingTagSource[],
  options: { search?: string; policiesPerTag?: number; tagsLimit?: number } = {}
) => groupRoutingTags({ policiesPerTag: 5, tagsLimit: 20, policies, ...options });

describe('groupRoutingTags', () => {
  it('returns nothing when there are no policies', () => {
    expect(group([])).toEqual({ items: [], totalTags: 0 });
  });

  it('does not attribute catch-all and expression-only policies to any tag', () => {
    const result = group([
      policy('1', 'Missing matcher', true, undefined),
      policy('2', 'Null matcher', true, null),
      policy('3', 'Empty matcher', true, {}),
      policy('4', 'Null tags', true, { tags: null, expression: 'severity: "critical"' }),
      policy('5', 'Empty tags', true, { tags: [], expression: 'severity: "critical"' }),
    ]);

    expect(result).toEqual({ items: [], totalTags: 0 });
  });

  it('counts a tag repeated within one policy once', () => {
    const { items } = group([policy('1', 'Dup tags', true, { tags: ['dup', 'dup'] })]);

    expect(items).toEqual([
      { tag: 'dup', policy_count: 1, policies: [{ id: '1', name: 'Dup tags' }] },
    ]);
  });

  it('includes disabled policies in policy_count', () => {
    const { items } = group([
      policy('1', 'Enabled', true, { tags: ['rna'] }),
      policy('2', 'Disabled', false, { tags: ['rna'] }),
    ]);

    expect(items).toHaveLength(1);
    expect(items[0].policy_count).toBe(2);
  });

  it('lists enabled policies first, then by name', () => {
    const { items } = group([
      policy('1', 'Zulu', true, { tags: ['rna'] }),
      policy('2', 'Alpha', false, { tags: ['rna'] }),
      policy('3', 'Mike', true, { tags: ['rna'] }),
      policy('4', 'Bravo', false, { tags: ['rna'] }),
    ]);

    expect(items[0].policies.map(({ name }) => name)).toEqual(['Mike', 'Zulu', 'Alpha', 'Bravo']);
  });

  it('orders tags by enabled policies, then total policies, then name', () => {
    const { items } = group([
      policy('1', 'One', true, { tags: ['b-one-enabled'] }),
      policy('2', 'Two', true, { tags: ['a-one-enabled'] }),
      policy('3', 'Three', true, { tags: ['two-enabled'] }),
      policy('4', 'Four', true, { tags: ['two-enabled'] }),
      policy('5', 'Five', true, { tags: ['one-enabled-one-disabled'] }),
      policy('6', 'Six', false, { tags: ['one-enabled-one-disabled'] }),
      policy('7', 'Seven', false, { tags: ['disabled-only-wide'] }),
      policy('8', 'Eight', false, { tags: ['disabled-only-wide'] }),
      policy('9', 'Nine', false, { tags: ['disabled-only'] }),
    ]);

    expect(items.map(({ tag }) => tag)).toEqual([
      'two-enabled',
      'one-enabled-one-disabled',
      'a-one-enabled',
      'b-one-enabled',
      'disabled-only-wide',
      'disabled-only',
    ]);
  });

  it('treats tags as case-sensitive', () => {
    const { items } = group([
      policy('1', 'Lower', true, { tags: ['rna'] }),
      policy('2', 'Upper', true, { tags: ['RNA'] }),
    ]);

    expect(items.map(({ tag }) => tag)).toEqual(['RNA', 'rna']);
  });

  describe('policiesPerTag', () => {
    const policies = Array.from({ length: 8 }, (_, i) =>
      policy(`p${i}`, `Policy ${i}`, true, { tags: ['wide'] })
    );

    it('limits the listed policies but not policy_count', () => {
      const { items } = group(policies, { policiesPerTag: 2 });

      expect(items[0].policy_count).toBe(8);
      expect(items[0].policies).toEqual([
        { id: 'p0', name: 'Policy 0' },
        { id: 'p1', name: 'Policy 1' },
      ]);
    });

    it('lists every policy when the limit is above the count', () => {
      expect(group(policies, { policiesPerTag: 20 }).items[0].policies).toHaveLength(8);
    });
  });

  describe('search', () => {
    const policies = [
      policy('1', 'One', true, { tags: ['rna', 'program', 'RNA'] }),
      policy('2', 'Two', true, { tags: ['rna-extra'] }),
      policy('3', 'Three', true, { tags: ['sre'] }),
    ];

    it('keeps tags that start with the search prefix', () => {
      const { items, totalTags } = group(policies, { search: 'rna' });

      expect(items.map(({ tag }) => tag)).toEqual(['rna', 'rna-extra']);
      expect(totalTags).toBe(2);
    });

    it('is case-sensitive', () => {
      expect(group(policies, { search: 'RN' }).items.map(({ tag }) => tag)).toEqual(['RNA']);
    });

    it('does not match in the middle of a tag', () => {
      expect(group(policies, { search: 'na' })).toEqual({ items: [], totalTags: 0 });
    });

    it('counts only the policies that use the matching tag', () => {
      const { items } = group(policies, { search: 'rna-' });

      expect(items).toEqual([
        { tag: 'rna-extra', policy_count: 1, policies: [{ id: '2', name: 'Two' }] },
      ]);
    });

    it('returns every tag for an empty search', () => {
      expect(group(policies, { search: '' }).totalTags).toBe(5);
    });
  });

  describe('tagsLimit', () => {
    const policies = Array.from({ length: 25 }, (_, i) =>
      policy(`p${i}`, `Policy ${i}`, true, { tags: [`tag-${String(i).padStart(2, '0')}`] })
    );

    it('limits items but reports the number of distinct tags in totalTags', () => {
      const { items, totalTags } = group(policies, { tagsLimit: 20 });

      expect(items).toHaveLength(20);
      expect(totalTags).toBe(25);
    });

    it('does not truncate when tags are under the limit', () => {
      const { items, totalTags } = group(policies.slice(0, 3), { tagsLimit: 20 });

      expect(items).toHaveLength(3);
      expect(totalTags).toBe(3);
    });
  });
});
