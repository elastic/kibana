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
  inferRawVegaCatalogId,
  isRawVegaSchema,
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

  it('exports the Canonical ES|QL source name', () => {
    expect(CANONICAL_ESQL_SOURCE_NAME).toBe('source');
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
