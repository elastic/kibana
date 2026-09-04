/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENTRA_GUID_INCLUSION,
  NT_AUTHORITY_SID_INCLUSION,
  WINDOWS_NON_PERSON_SID_EXCLUSION,
} from './rule_registry';

/**
 * ES|QL `RLIKE` compiles through Lucene's automaton (`RegExp.ALL`). `^` / `$`
 * are not anchors — they match literal characters — and the pattern already
 * has to cover the entire string. A PCRE-style `^S-1-5-` therefore matches
 * nothing; `NOT RLIKE '^(S-1-5-18|…)$'` is vacuously true and lets LocalSystem
 * merge. See regexp-syntax.md ("Unsupported operators").
 */
describe('RLIKE value gates use Lucene automaton syntax', () => {
  const patterns = [
    ['Windows non-person SID exclusion', WINDOWS_NON_PERSON_SID_EXCLUSION],
    ['Entra GUID inclusion', ENTRA_GUID_INCLUSION],
    ['NT-authority SID inclusion', NT_AUTHORITY_SID_INCLUSION],
  ] as const;

  it.each(patterns)('%s does not use ^ or $ anchors', (_name, pattern) => {
    expect(pattern.startsWith('^')).toBe(false);
    expect(pattern.endsWith('$')).toBe(false);
    expect(pattern.includes('$')).toBe(false);
  });

  it('expresses the NT-authority SID prefix with an explicit wildcard', () => {
    expect(NT_AUTHORITY_SID_INCLUSION).toBe('S-1-5-.*');
  });

  it('matches well-known SIDs as whole strings', () => {
    expect(WINDOWS_NON_PERSON_SID_EXCLUSION).toBe(
      '(S-1-5-18|S-1-5-19|S-1-5-20|S-1-5-32-54[4-9]|S-1-5-32-55[0-4])'
    );
  });

  it('matches a GUID as a whole string', () => {
    expect(ENTRA_GUID_INCLUSION).toBe('[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}');
  });
});
