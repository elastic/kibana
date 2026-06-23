/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';
import { escapeDottedFieldReferences } from './vega_field_escaping';

const columns = (...names: string[]): EsqlEsqlColumnInfo[] =>
  names.map((name) => ({ name, type: 'keyword' } as EsqlEsqlColumnInfo));

describe('escapeDottedFieldReferences', () => {
  it('escapes dots in "field" references that match dotted columns', () => {
    const spec = {
      mark: 'circle',
      encoding: { y: { field: 'geo.src', type: 'nominal' } },
    };

    const result = escapeDottedFieldReferences(spec, columns('geo.src', 'geo.dest', 'Count'));

    expect(result).toEqual({
      mark: 'circle',
      encoding: { y: { field: 'geo\\.src', type: 'nominal' } },
    });
  });

  it('escapes dotted columns inside "groupby" arrays', () => {
    const spec = {
      transform: [
        { joinaggregate: [{ op: 'sum', field: 'Count', as: 'srcTotal' }], groupby: ['geo.src'] },
      ],
    };

    const result = escapeDottedFieldReferences(spec, columns('geo.src', 'Count'));

    expect(result).toEqual({
      transform: [
        { joinaggregate: [{ op: 'sum', field: 'Count', as: 'srcTotal' }], groupby: ['geo\\.src'] },
      ],
    });
  });

  it('leaves dot-free columns, computed fields and expressions untouched', () => {
    const spec = {
      transform: [{ filter: 'datum.srcRank <= 10 && datum.destRank <= 10' }],
      encoding: {
        x: { field: 'Count', type: 'quantitative' },
        y: { field: 'srcTotal', sort: { field: 'srcTotal', order: 'descending' } },
      },
    };

    const result = escapeDottedFieldReferences(spec, columns('geo.src', 'Count'));

    expect(result).toEqual(spec);
  });

  it('does not double-escape an already-escaped reference', () => {
    const spec = { encoding: { y: { field: 'geo\\.src' } } };

    const result = escapeDottedFieldReferences(spec, columns('geo.src'));

    expect(result).toEqual(spec);
  });

  it('returns the spec unchanged when there are no dotted columns', () => {
    const spec = { encoding: { y: { field: 'geo.src' } } };

    const result = escapeDottedFieldReferences(spec, columns('Count', 'Source'));

    expect(result).toBe(spec);
  });
});
