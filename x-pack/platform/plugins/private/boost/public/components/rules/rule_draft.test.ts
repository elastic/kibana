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
    });
  });

  it('rejects names that are already taken, including the default rules', () => {
    expect(getRuleDraftErrors(validDraft, ['storefront-catalogs']).name).toBe('already_exists');
  });

  it('takes one name or pattern, as Elasticsearch does', () => {
    expect(getRuleDraftErrors({ ...validDraft, pattern: 'products' }, []).pattern).toBeUndefined();
    expect(getRuleDraftErrors({ ...validDraft, pattern: 'products, users' }, []).pattern).toBe(
      'invalid_characters'
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

  it('converts the field into index patterns', () => {
    expect(ruleDraftToInput(validDraft)).toEqual({
      name: 'storefront-catalogs',
      index_patterns: ['catalog-*'],
      boost_profile: 'storefront-search',
      priority: 0,
    });
  });
});

describe('ruleToDraft', () => {
  const rule = {
    name: 'storefront',
    boost_profile: 'storefront-search',
    priority: 10,
    is_builtin: false,
  };

  it('opens a pattern or a name in the same field, whether or not the name exists', () => {
    expect(ruleToDraft({ ...rule, index_patterns: ['catalog-*'] })).toEqual({
      name: 'storefront',
      profileName: 'storefront-search',
      pattern: 'catalog-*',
      priority: '10',
    });
    expect(ruleToDraft({ ...rule, index_patterns: ['outlet'] }).pattern).toBe('outlet');
  });

  it('lists the names of a rule saved with several, which the prototype once allowed, with commas', () => {
    expect(ruleToDraft({ ...rule, index_patterns: ['products', 'users'] }).pattern).toBe(
      'products, users'
    );
  });
});
