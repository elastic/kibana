/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CE_HTTP_SEARCH_QUERY_MAX_LENGTH } from '@kbn/context-engine-plugin/public';
import { normalizeCeSearchQuery } from './normalize_ce_search_query';

describe('normalizeCeSearchQuery', () => {
  it('maps empty and whitespace-only input to wildcard', () => {
    expect(normalizeCeSearchQuery('')).toBe('*');
    expect(normalizeCeSearchQuery('   ')).toBe('*');
    expect(normalizeCeSearchQuery('\t\n')).toBe('*');
  });

  it('returns trimmed non-empty queries unchanged aside from trim', () => {
    expect(normalizeCeSearchQuery('  visu  ')).toBe('visu');
    expect(normalizeCeSearchQuery('type/title')).toBe('type/title');
    expect(normalizeCeSearchQuery('*')).toBe('*');
  });

  it('truncates queries longer than the HTTP max length', () => {
    const long = 'a'.repeat(CE_HTTP_SEARCH_QUERY_MAX_LENGTH + 10);
    const normalized = normalizeCeSearchQuery(long);
    expect(normalized.length).toBe(CE_HTTP_SEARCH_QUERY_MAX_LENGTH);
  });
});
