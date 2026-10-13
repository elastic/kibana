/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createEmptyRuleDraft,
  getRuleDraftErrors,
  hasRuleDraftErrors,
  ruleDraftToInput,
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

  it('rejects negative and fractional priorities', () => {
    expect(getRuleDraftErrors({ ...validDraft, priority: '-1' }, []).priority).toBe('out_of_range');
    expect(getRuleDraftErrors({ ...validDraft, priority: '1.5' }, []).priority).toBe(
      'out_of_range'
    );
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
