/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CANONICAL_ESQL_SOURCE_NAME,
  VEGA_SCHEMA,
  dialectFromSchema,
  dialectFromSpec,
  formatMissingParentsError,
  formatParentChildIntegrityError,
  hasParentChildColumns,
  isRawVegaSchema,
  validateParentChildRows,
} from './dialect';

describe('dialect helpers', () => {
  it('recognizes Raw Vega schema URLs and rejects Vega-Lite', () => {
    expect(isRawVegaSchema(VEGA_SCHEMA)).toBe(true);
    expect(isRawVegaSchema('https://vega.github.io/schema/vega-lite/v6.json')).toBe(false);
    expect(dialectFromSchema(VEGA_SCHEMA)).toBe('vega');
    expect(dialectFromSchema('https://vega.github.io/schema/vega-lite/v6.json')).toBe('vega-lite');
  });

  it('pins Dialect from a stored spec for edits', () => {
    expect(dialectFromSpec({ $schema: VEGA_SCHEMA, marks: [] })).toBe('vega');
    expect(
      dialectFromSpec(
        JSON.stringify({ $schema: 'https://vega.github.io/schema/vega-lite/v6.json', mark: 'bar' })
      )
    ).toBe('vega-lite');
    expect(dialectFromSpec('not json')).toBe('vega-lite');
  });

  it('detects Parent–child columns with common aliases', () => {
    expect(
      hasParentChildColumns([
        { name: 'id', type: 'keyword' },
        { name: 'parent', type: 'keyword' },
        { name: 'value', type: 'long' },
      ])
    ).toBe(true);
    expect(
      hasParentChildColumns([
        { name: 'node_id', type: 'keyword' },
        { name: 'parent_id', type: 'keyword' },
      ])
    ).toBe(true);
    expect(hasParentChildColumns([{ name: 'id', type: 'keyword' }])).toBe(false);
    expect(hasParentChildColumns(undefined)).toBe(false);
  });

  it('exports the Canonical ES|QL source name', () => {
    expect(CANONICAL_ESQL_SOURCE_NAME).toBe('source');
  });
});

describe('validateParentChildRows', () => {
  const columns = [
    { name: 'id', type: 'keyword' as const },
    { name: 'parent', type: 'keyword' as const },
    { name: 'name', type: 'keyword' as const },
    { name: 'value', type: 'long' as const },
  ];

  it('passes for a single-root tree with resolvable parents', () => {
    expect(
      validateParentChildRows({
        columns,
        values: [
          ['root', null, 'All', 10],
          ['IT', 'root', 'Italy', 10],
          ['IT::US', 'IT', 'US', 4],
          ['IT::FR', 'IT', 'FR', 6],
        ],
      })
    ).toEqual({ ok: true });
  });

  it('passes vacuously when there are no rows', () => {
    expect(validateParentChildRows({ columns, values: [] })).toEqual({ ok: true });
  });

  it('fails when leaf rows reference missing parent ids', () => {
    expect(
      validateParentChildRows({
        columns,
        values: [
          ['root', null, 'All', 6],
          ['IT::US', 'IT', 'US', 4],
          ['DE::US', 'DE', 'US', 2],
        ],
      })
    ).toEqual({ ok: false, reason: 'missing_parents', missingParents: ['IT', 'DE'] });
  });

  it('fails when multiple roots are present (category rows with parent null)', () => {
    expect(
      validateParentChildRows({
        columns,
        values: [
          ['IT', null, 'Italy', 10],
          ['DE', null, 'Germany', 5],
          ['IT::US', 'IT', 'US', 4],
        ],
      })
    ).toEqual({ ok: false, reason: 'multiple_roots', rootCount: 2 });
  });

  it('fails when there is no root row', () => {
    expect(
      validateParentChildRows({
        columns,
        values: [
          ['IT', 'root', 'Italy', 10],
          ['IT::US', 'IT', 'US', 4],
        ],
      })
    ).toEqual({ ok: false, reason: 'no_root' });
  });

  it('treats the string "null" as an absent parent (TO_STRING(null) footgun)', () => {
    expect(
      validateParentChildRows({
        columns,
        values: [
          ['IT', 'null', 'Italy', 10],
          ['DE', 'null', 'Germany', 5],
        ],
      })
    ).toEqual({ ok: false, reason: 'multiple_roots', rootCount: 2 });
  });

  it('formats regeneration errors for each integrity failure', () => {
    expect(formatMissingParentsError(['IT', 'DE'])).toContain('missing parent ids (IT, DE)');
    expect(
      formatParentChildIntegrityError({ ok: false, reason: 'multiple_roots', rootCount: 3 })
    ).toContain('multiple roots');
    expect(formatParentChildIntegrityError({ ok: false, reason: 'no_root' })).toContain(
      'no root row'
    );
  });
});
