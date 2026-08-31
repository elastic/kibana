/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BULK_QUERY_SAMPLE_SIZE,
  bulkByIdsSchema,
  bulkByQuerySchema,
  bulkResponseSchema,
  dryRunResponseSchema,
  ID_MAX_LENGTH,
  MAX_BULK_ITEMS,
  MAX_KQL_LENGTH,
  MAX_SEARCH_LENGTH,
} from '.';

describe('bulkByIdsSchema', () => {
  it('accepts a valid non-empty ids array', () => {
    const parsed = bulkByIdsSchema.safeParse({ ids: ['a', 'b'] });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.ids).toEqual(['a', 'b']);
    }
  });

  it('rejects an empty ids array', () => {
    const parsed = bulkByIdsSchema.safeParse({ ids: [] });
    expect(parsed.success).toBe(false);
  });

  it('rejects a missing ids field', () => {
    const parsed = bulkByIdsSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });

  it('rejects id strings longer than ID_MAX_LENGTH', () => {
    const parsed = bulkByIdsSchema.safeParse({ ids: ['x'.repeat(ID_MAX_LENGTH + 1)] });
    expect(parsed.success).toBe(false);
  });

  it('rejects id arrays longer than MAX_BULK_ITEMS', () => {
    const parsed = bulkByIdsSchema.safeParse({
      ids: Array.from({ length: MAX_BULK_ITEMS + 1 }, (_, i) => `id-${i}`),
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    const parsed = bulkByIdsSchema.safeParse({ ids: ['a'], filter: 'kind: alert' });
    expect(parsed.success).toBe(false);
  });

  it('rejects match_all combined with ids (strict mode)', () => {
    const parsed = bulkByIdsSchema.safeParse({ ids: ['a'], match_all: true });
    expect(parsed.success).toBe(false);
  });

  it('rejects force combined with ids (strict mode)', () => {
    const parsed = bulkByIdsSchema.safeParse({ ids: ['a'], force: true });
    expect(parsed.success).toBe(false);
  });
});

describe('bulkByQuerySchema', () => {
  it('accepts a filter-only body and defaults force to false', () => {
    const parsed = bulkByQuerySchema.safeParse({ filter: 'kind: alert' });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.force).toBe(false);
    }
  });

  it('accepts a search-only body', () => {
    const parsed = bulkByQuerySchema.safeParse({ search: 'prod' });
    expect(parsed.success).toBe(true);
  });

  it('accepts match_all: true', () => {
    const parsed = bulkByQuerySchema.safeParse({ match_all: true });
    expect(parsed.success).toBe(true);
  });

  it('accepts force: true', () => {
    const parsed = bulkByQuerySchema.safeParse({ match_all: true, force: true });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.force).toBe(true);
    }
  });

  it('rejects an empty body (no selector) — the safety refinement', () => {
    const parsed = bulkByQuerySchema.safeParse({});
    expect(parsed.success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    const parsed = bulkByQuerySchema.safeParse({
      filter: 'kind: alert',
      matchAll: true,
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects ids on the by-query schema (strict mode)', () => {
    const parsed = bulkByQuerySchema.safeParse({ ids: ['a'], filter: 'kind: alert' });
    expect(parsed.success).toBe(false);
  });

  it('rejects filter strings longer than MAX_KQL_LENGTH', () => {
    const parsed = bulkByQuerySchema.safeParse({ filter: 'x'.repeat(MAX_KQL_LENGTH + 1) });
    expect(parsed.success).toBe(false);
  });

  it('rejects search strings longer than MAX_SEARCH_LENGTH', () => {
    const parsed = bulkByQuerySchema.safeParse({ search: 'x'.repeat(MAX_SEARCH_LENGTH + 1) });
    expect(parsed.success).toBe(false);
  });

  // An empty or whitespace-only filter/search would match every resource,
  // becoming a second, implicit way to "match all" that bypasses the explicit
  // `match_all: true` opt-in. Reject them so `match_all` stays the only path.
  it('rejects an empty filter string', () => {
    const parsed = bulkByQuerySchema.safeParse({ filter: '' });
    expect(parsed.success).toBe(false);
  });

  it('rejects a whitespace-only filter string', () => {
    const parsed = bulkByQuerySchema.safeParse({ filter: '   ' });
    expect(parsed.success).toBe(false);
  });

  it('rejects an empty search string', () => {
    const parsed = bulkByQuerySchema.safeParse({ search: '' });
    expect(parsed.success).toBe(false);
  });

  it('rejects a whitespace-only search string', () => {
    const parsed = bulkByQuerySchema.safeParse({ search: '   ' });
    expect(parsed.success).toBe(false);
  });

  it('trims surrounding whitespace from filter and search', () => {
    const parsed = bulkByQuerySchema.safeParse({ filter: '  kind: alert  ', search: '  prod  ' });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.filter).toBe('kind: alert');
      expect(parsed.data.search).toBe('prod');
    }
  });

  it('rejects match_all: false (literal true only)', () => {
    const parsed = bulkByQuerySchema.safeParse({ match_all: false });
    expect(parsed.success).toBe(false);
  });

  it('rejects match_all combined with filter (mutual exclusion)', () => {
    const parsed = bulkByQuerySchema.safeParse({ match_all: true, filter: 'kind: alert' });
    expect(parsed.success).toBe(false);
  });

  it('rejects match_all combined with search (mutual exclusion)', () => {
    const parsed = bulkByQuerySchema.safeParse({ match_all: true, search: 'prod' });
    expect(parsed.success).toBe(false);
  });

  it('accepts filter and search together (they AND, not mutually exclusive)', () => {
    const parsed = bulkByQuerySchema.safeParse({ filter: 'kind: alert', search: 'prod' });
    expect(parsed.success).toBe(true);
  });
});

describe('bulkResponseSchema', () => {
  it('accepts a well-formed executed response', () => {
    const parsed = bulkResponseSchema.safeParse({
      affected_count: 2,
      errors: [{ id: 'a', error: { code: 'RULE_NOT_FOUND', message: 'Not found' } }],
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts an error with an optional `details` payload for structured context', () => {
    const parsed = bulkResponseSchema.safeParse({
      affected_count: 0,
      errors: [
        {
          id: 'a',
          error: {
            code: 'RULE_VERSION_CONFLICT',
            message: 'Version conflict',
            details: { expected_version: 'v1', actual_version: 'v2' },
          },
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a response missing affected_count', () => {
    const parsed = bulkResponseSchema.safeParse({ errors: [] });
    expect(parsed.success).toBe(false);
  });

  it('rejects errors whose shape uses the old statusCode key', () => {
    const parsed = bulkResponseSchema.safeParse({
      affected_count: 0,
      errors: [{ id: 'a', error: { message: 'Not found', statusCode: 404 } }],
    });
    expect(parsed.success).toBe(false);
  });
});

describe('dryRunResponseSchema', () => {
  it('accepts a well-formed dry-run response', () => {
    const parsed = dryRunResponseSchema.safeParse({
      match_count: 5,
      sample: ['a', 'b', 'c'],
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a sample longer than BULK_QUERY_SAMPLE_SIZE', () => {
    const parsed = dryRunResponseSchema.safeParse({
      match_count: BULK_QUERY_SAMPLE_SIZE + 1,
      sample: Array.from({ length: BULK_QUERY_SAMPLE_SIZE + 1 }, (_, i) => `id-${i}`),
    });
    expect(parsed.success).toBe(false);
  });
});
