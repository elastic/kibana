/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDiagnosticBag } from './diagnostics';
import { collectLensStatePredicates, lowerKibanaFilterToEsql } from './lens_filters';

describe('lowerKibanaFilterToEsql', () => {
  it('lowers a phrase filter', () => {
    expect(
      lowerKibanaFilterToEsql({
        meta: {
          type: 'phrase',
          field: 'reporter.type',
          params: { query: 'ftr' },
        },
      })
    ).toBe('`reporter.type` == "ftr"');
  });

  it('lowers a phrases filter to IN', () => {
    expect(
      lowerKibanaFilterToEsql({
        meta: {
          type: 'phrases',
          key: 'test.status',
          params: ['failed', 'passed'],
        },
      })
    ).toBe('`test.status` IN ("failed", "passed")');
  });

  it('honors negate and skips disabled', () => {
    expect(
      lowerKibanaFilterToEsql({
        meta: {
          type: 'phrase',
          field: 'env',
          params: { query: 'prod' },
          negate: true,
        },
      })
    ).toBe('NOT (env == "prod")');
    expect(
      lowerKibanaFilterToEsql({
        meta: {
          disabled: true,
          type: 'phrase',
          field: 'env',
          params: { query: 'prod' },
        },
      })
    ).toBeUndefined();
  });
});

describe('collectLensStatePredicates', () => {
  it('combines state.filters with a kuery query', () => {
    const bag = createDiagnosticBag('panel');
    const predicates = collectLensStatePredicates(
      {
        filters: [
          {
            meta: {
              type: 'phrase',
              field: 'event.action',
              params: { query: 'test-end' },
            },
          },
        ],
        query: { query: 'reporter.type: "ftr"', language: 'kuery' },
      },
      bag
    );
    expect(predicates).toEqual(['`event.action` == "test-end"', '`reporter.type` == "ftr"']);
    expect(bag.list).toEqual([]);
  });
  it('keeps numeric and boolean phrase values unquoted', () => {
    // Kibana stores a status-code filter as the number 404. Quoting it
    // compares a numeric field against a string, which matches nothing;
    // rejecting it outright dropped the predicate and silently widened the
    // result set.
    expect(
      lowerKibanaFilterToEsql({
        meta: {
          type: 'phrase',
          field: 'http.response.status_code',
          params: { query: 404 },
        },
      })
    ).toBe('`http.response.status_code` == 404');

    expect(
      lowerKibanaFilterToEsql({
        meta: {
          type: 'phrase',
          field: 'event.outcome',
          params: { query: false },
        },
      })
    ).toBe('`event.outcome` == false');
  });

  it('keeps a numeric phrases list unquoted', () => {
    expect(
      lowerKibanaFilterToEsql({
        meta: {
          type: 'phrases',
          field: 'http.response.status_code',
          params: { query: [404, 500] },
        },
      })
    ).toBe('`http.response.status_code` IN (404, 500)');
  });

  it('still quotes strings, and mixed lists per element', () => {
    expect(
      lowerKibanaFilterToEsql({
        meta: {
          type: 'phrases',
          field: 'code',
          params: { query: ['a', 2] },
        },
      })
    ).toBe('code IN ("a", 2)');
  });
});
