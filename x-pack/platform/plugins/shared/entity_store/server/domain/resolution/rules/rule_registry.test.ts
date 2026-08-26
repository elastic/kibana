/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CROWDSTRIKE_SID_PATTERN,
  ENTRA_GUID_PATTERN,
  WELL_KNOWN_WINDOWS_SID_PATTERN,
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
    ['well-known Windows SID exclusion', WELL_KNOWN_WINDOWS_SID_PATTERN],
    ['Entra GUID inclusion', ENTRA_GUID_PATTERN],
    ['CrowdStrike SID inclusion', CROWDSTRIKE_SID_PATTERN],
  ] as const;

  it.each(patterns)('%s does not use ^ or $ anchors', (_name, pattern) => {
    expect(pattern.startsWith('^')).toBe(false);
    expect(pattern.endsWith('$')).toBe(false);
    expect(pattern.includes('$')).toBe(false);
  });

  it('expresses the CrowdStrike SID prefix with an explicit wildcard', () => {
    expect(CROWDSTRIKE_SID_PATTERN).toBe('S-1-5-.*');
  });

  it('matches well-known SIDs as whole strings', () => {
    expect(WELL_KNOWN_WINDOWS_SID_PATTERN).toBe(
      '(S-1-5-18|S-1-5-19|S-1-5-20|S-1-5-32-54[4-9]|S-1-5-32-55[0-4])'
    );
  });

  it('matches a GUID as a whole string', () => {
    expect(ENTRA_GUID_PATTERN).toBe('[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}');
  });
});
