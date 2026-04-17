/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SML_HTTP_SEARCH_QUERY_MAX_LENGTH } from '../../../../common/http_api/sml';
import { normalizeSmlSearchQuery } from './normalize_sml_search_query';

describe('normalizeSmlSearchQuery', () => {
  it('maps empty and whitespace-only input to wildcard', () => {
    expect(normalizeSmlSearchQuery('')).toBe('*');
    expect(normalizeSmlSearchQuery('   ')).toBe('*');
    expect(normalizeSmlSearchQuery('\t\n')).toBe('*');
  });

  it('returns trimmed non-empty queries unchanged aside from trim', () => {
    expect(normalizeSmlSearchQuery('  visu  ')).toBe('visu');
    expect(normalizeSmlSearchQuery('type/title')).toBe('type/title');
    expect(normalizeSmlSearchQuery('*')).toBe('*');
  });

  it('truncates queries longer than the HTTP max length', () => {
    const long = 'a'.repeat(SML_HTTP_SEARCH_QUERY_MAX_LENGTH + 10);
    const normalized = normalizeSmlSearchQuery(long);
    expect(normalized.length).toBe(SML_HTTP_SEARCH_QUERY_MAX_LENGTH);
  });
});
