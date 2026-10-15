/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_RULE_PRIORITY } from '../../../common/validation';
import {
  createEmptyRuleDraft,
  getRuleDraftErrors,
  hasRuleDraftErrors,
  normalizePriority,
  ruleDraftToInput,
  ruleToDraft,
} from './rule_draft';

const validDraft = {
  ...createEmptyRuleDraft('storefront-search'),
  name: 'storefront-catalogs',
  pattern: ' catalog-* ',
};

describe('rule drafts', () => {
  it('requires a name, a profile, and a pattern for a new rule', () => {
    expect(getRuleDraftErrors(createEmptyRuleDraft(), [])).toEqual({
      name: 'required',
      profile: 'required',
      pattern: 'required',
      picked: undefined,
      priority: undefined,
    });
  });

  it('rejects names that are already taken, including the default rules', () => {
    expect(getRuleDraftErrors(validDraft, ['storefront-catalogs']).name).toBe('already_exists');
  });

  it('only validates the fields of the selected target mode', () => {
    const picking = { ...validDraft, mode: 'pick' as const, pattern: '' };

    expect(getRuleDraftErrors(picking, []).pattern).toBeUndefined();
    expect(getRuleDraftErrors(picking, []).picked).toBe('required');
    expect(hasRuleDraftErrors(getRuleDraftErrors({ ...picking, picked: ['products'] }, []))).toBe(
      false
    );
  });

  it("corrects a priority it can't use rather than rejecting it", () => {
    expect(hasRuleDraftErrors(getRuleDraftErrors({ ...validDraft, priority: '-1' }, []))).toBe(
      false
    );
    expect(normalizePriority('')).toBe('0');
    expect(normalizePriority('-1')).toBe('0');
    expect(normalizePriority('1.5')).toBe('1');
    expect(normalizePriority('7')).toBe('7');
    expect(normalizePriority('1e12')).toBe(String(MAX_RULE_PRIORITY));
    expect(ruleDraftToInput({ ...validDraft, priority: '' }).priority).toBe(0);
  });

  it('converts either target mode into index patterns', () => {
    expect(ruleDraftToInput(validDraft)).toEqual({
      name: 'storefront-catalogs',
      index_patterns: ['catalog-*'],
      boost_profile: 'storefront-search',
      priority: 0,
    });
    expect(
      ruleDraftToInput({ ...validDraft, mode: 'pick', picked: ['products', 'users'] })
        .index_patterns
    ).toEqual(['products', 'users']);
  });
});

describe('ruleToDraft', () => {
  const rule = {
    name: 'storefront',
    boost_profile: 'storefront-search',
    priority: 10,
    is_builtin: false,
  };
  const existing = new Set(['products', 'users']);

  it('opens patterns and unknown names in pattern mode', () => {
    expect(ruleToDraft({ ...rule, index_patterns: ['catalog-*'] }, existing)).toMatchObject({
      mode: 'pattern',
      pattern: 'catalog-*',
      priority: '10',
    });
    expect(ruleToDraft({ ...rule, index_patterns: ['outlet'] }, existing).mode).toBe('pattern');
  });

  it('opens existing names in pick mode', () => {
    expect(ruleToDraft({ ...rule, index_patterns: ['products'] }, existing)).toMatchObject({
      mode: 'pick',
      picked: ['products'],
    });
    expect(
      ruleToDraft({ ...rule, index_patterns: ['products', 'users'] }, existing).picked
    ).toEqual(['products', 'users']);
  });
});
