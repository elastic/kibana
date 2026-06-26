/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_INDEX_PATTERNS } from './default_index_patterns';
import { parseSigEventsIndexPatterns } from './parse_sig_events_index_patterns';

describe('parseSigEventsIndexPatterns', () => {
  it('splits comma-separated patterns and trims whitespace', () => {
    expect(parseSigEventsIndexPatterns('logs*, metrics* , traces-*')).toEqual([
      'logs*',
      'metrics*',
      'traces-*',
    ]);
  });

  it('falls back to the default when undefined', () => {
    expect(parseSigEventsIndexPatterns(undefined)).toEqual([DEFAULT_INDEX_PATTERNS]);
  });

  it('falls back to the default when empty', () => {
    expect(parseSigEventsIndexPatterns('')).toEqual([DEFAULT_INDEX_PATTERNS]);
  });

  it('falls back to the default when only whitespace', () => {
    expect(parseSigEventsIndexPatterns('  ,  ')).toEqual([DEFAULT_INDEX_PATTERNS]);
  });
});
