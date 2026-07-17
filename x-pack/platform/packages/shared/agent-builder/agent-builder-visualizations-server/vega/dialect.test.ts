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
  formatRadarIntegrityError,
  formatSankeyIntegrityError,
  hasParentChildColumns,
  hasRadarColumns,
  hasSankeyColumns,
  inferRawVegaCatalogId,
  isRawVegaSchema,
  validateParentChildRows,
  validateRadarRows,
  validateSankeyRows,
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

describe('validateRadarRows', () => {
  const columns = [
    { name: 'key', type: 'keyword' as const },
    { name: 'value', type: 'long' as const },
  ];

  it('detects radar columns with aliases', () => {
    expect(hasRadarColumns(columns)).toBe(true);
    expect(
      hasRadarColumns([
        { name: 'category', type: 'keyword' },
        { name: 'metric', type: 'double' },
      ])
    ).toBe(true);
    expect(hasRadarColumns([{ name: 'key', type: 'keyword' }])).toBe(false);
  });

  it('passes for ≥3 distinct keys with numeric values', () => {
    expect(
      validateRadarRows({
        columns,
        values: [
          ['A', 1],
          ['B', 2],
          ['C', 3],
        ],
      })
    ).toEqual({ ok: true });
  });

  it('passes vacuously when there are no rows', () => {
    expect(validateRadarRows({ columns, values: [] })).toEqual({ ok: true });
  });

  it('fails when there are fewer than 3 distinct keys', () => {
    expect(
      validateRadarRows({
        columns,
        values: [
          ['A', 1],
          ['B', 2],
        ],
      })
    ).toEqual({ ok: false, reason: 'too_few_keys', keyCount: 2 });
  });

  it('fails when values are non-numeric', () => {
    expect(
      validateRadarRows({
        columns,
        values: [
          ['A', 'x'],
          ['B', 2],
          ['C', 3],
        ],
      })
    ).toEqual({ ok: false, reason: 'non_numeric_values' });
  });

  it('formats radar regeneration errors', () => {
    expect(formatRadarIntegrityError({ ok: false, reason: 'too_few_keys', keyCount: 1 })).toContain(
      'at least 3'
    );
    expect(formatRadarIntegrityError({ ok: false, reason: 'missing_columns' })).toContain(
      'key/value'
    );
  });
});

describe('validateSankeyRows', () => {
  const columns = [
    { name: 'stk1', type: 'keyword' as const },
    { name: 'stk2', type: 'keyword' as const },
    { name: 'size', type: 'long' as const },
  ];

  it('detects sankey columns with aliases', () => {
    expect(hasSankeyColumns(columns)).toBe(true);
    expect(
      hasSankeyColumns([
        { name: 'source', type: 'keyword' },
        { name: 'dest', type: 'keyword' },
        { name: 'count', type: 'long' },
      ])
    ).toBe(true);
    expect(hasSankeyColumns([{ name: 'stk1', type: 'keyword' }])).toBe(false);
  });

  it('passes for ≥2 flows with numeric size', () => {
    expect(
      validateSankeyRows({
        columns,
        values: [
          ['US', 'IT', 10],
          ['US', 'JP', 4],
        ],
      })
    ).toEqual({ ok: true });
  });

  it('fails when there are fewer than 2 flows', () => {
    expect(
      validateSankeyRows({
        columns,
        values: [['US', 'IT', 10]],
      })
    ).toEqual({ ok: false, reason: 'too_few_flows', flowCount: 1 });
  });

  it('fails when endpoints are blank', () => {
    expect(
      validateSankeyRows({
        columns,
        values: [
          ['US', 'IT', 10],
          [null, 'JP', 4],
        ],
      })
    ).toEqual({ ok: false, reason: 'blank_endpoints' });
  });

  it('formats sankey regeneration errors', () => {
    expect(formatSankeyIntegrityError({ ok: false, reason: 'missing_columns' })).toContain(
      'stk1/stk2/size'
    );
    expect(
      formatSankeyIntegrityError({ ok: false, reason: 'too_few_flows', flowCount: 1 })
    ).toContain('at least 2');
  });
});

describe('inferRawVegaCatalogId', () => {
  it('infers sunburst from stratify/partition transforms', () => {
    expect(
      inferRawVegaCatalogId({
        $schema: VEGA_SCHEMA,
        data: [{ transform: [{ type: 'stratify' }, { type: 'partition' }] }],
      })
    ).toBe('sunburst');
  });

  it('infers sankey from linkpath or fold+stk1/stk2', () => {
    expect(
      inferRawVegaCatalogId({
        $schema: VEGA_SCHEMA,
        data: [{ transform: [{ type: 'linkpath' }] }],
      })
    ).toBe('sankey');
    expect(
      inferRawVegaCatalogId({
        $schema: VEGA_SCHEMA,
        data: [
          {
            transform: [
              { type: 'fold', fields: ['stk1', 'stk2'] },
              { type: 'stack', field: 'size' },
            ],
          },
        ],
      })
    ).toBe('sankey');
  });

  it('infers radar from angular/radial scales or linear-closed marks', () => {
    expect(
      inferRawVegaCatalogId({
        $schema: VEGA_SCHEMA,
        scales: [{ name: 'angular' }, { name: 'radial' }],
      })
    ).toBe('radar');
    expect(
      inferRawVegaCatalogId({
        $schema: VEGA_SCHEMA,
        marks: [{ encode: { enter: { interpolate: { value: 'linear-closed' } } } }],
      })
    ).toBe('radar');
  });
});
