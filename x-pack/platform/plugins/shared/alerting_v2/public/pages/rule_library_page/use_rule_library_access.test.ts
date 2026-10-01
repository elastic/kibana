/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefaultRuleLibraryEngine } from './use_rule_library_access';

describe('getDefaultRuleLibraryEngine', () => {
  it('returns v2 when the user can read v2 rules', () => {
    expect(getDefaultRuleLibraryEngine({ canAccessV1: true, canAccessV2: true })).toBe('v2');
    expect(getDefaultRuleLibraryEngine({ canAccessV1: false, canAccessV2: true })).toBe('v2');
  });

  it('returns v1 when that is the only library', () => {
    expect(getDefaultRuleLibraryEngine({ canAccessV1: true, canAccessV2: false })).toBe('v1');
  });

  it('returns null when the user can read neither library', () => {
    expect(getDefaultRuleLibraryEngine({ canAccessV1: false, canAccessV2: false })).toBeNull();
  });
});
