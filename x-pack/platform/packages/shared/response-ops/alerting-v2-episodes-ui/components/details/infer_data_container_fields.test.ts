/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inferDataContainerFieldSpecs } from './infer_data_container_fields';

const typesOf = (data: Record<string, unknown>) =>
  Object.fromEntries(
    Object.values(inferDataContainerFieldSpecs(data)).map(({ name, type, esTypes }) => [
      name,
      { type, esTypes },
    ])
  );

describe('inferDataContainerFieldSpecs', () => {
  it('guesses scalar types', () => {
    expect(
      typesOf({
        count: 3,
        ratio: 0.5,
        healthy: true,
        message: 'disk full',
        '@timestamp': '2026-04-29T10:00:00.000Z',
        day: '2026-04-29',
      })
    ).toEqual({
      count: { type: 'number', esTypes: ['long'] },
      ratio: { type: 'number', esTypes: ['double'] },
      healthy: { type: 'boolean', esTypes: ['boolean'] },
      message: { type: 'string', esTypes: ['keyword'] },
      '@timestamp': { type: 'date', esTypes: ['date'] },
      day: { type: 'date', esTypes: ['date'] },
    });
  });

  it('does not treat numeric or invalid date-like strings as dates', () => {
    expect(typesOf({ year: '2026', invalid: '2026-13-45' })).toEqual({
      year: { type: 'string', esTypes: ['keyword'] },
      invalid: { type: 'string', esTypes: ['keyword'] },
    });
  });

  it('walks nested objects and keeps dotted keys as they are', () => {
    expect(typesOf({ host: { name: 'web', cpu: { pct: 0.9 } }, 'service.name': 'api' })).toEqual({
      'host.name': { type: 'string', esTypes: ['keyword'] },
      'host.cpu.pct': { type: 'number', esTypes: ['double'] },
      'service.name': { type: 'string', esTypes: ['keyword'] },
    });
  });

  it('types arrays only when all their values agree', () => {
    expect(
      typesOf({
        tags: ['a', null, 'b'],
        values: [1, 2.5],
        mixed: ['a', 1],
        objects: [{ a: 1 }],
        empty: [],
      })
    ).toEqual({
      tags: { type: 'string', esTypes: ['keyword'] },
      values: { type: 'number', esTypes: ['double'] },
    });
  });

  it('skips null values and top level metadata-like names', () => {
    expect(typesOf({ missing: null, _internal: 'x', nested: { _ok: 'y' } })).toEqual({
      'nested._ok': { type: 'string', esTypes: ['keyword'] },
    });
  });

  it('marks fields as not searchable nor aggregatable', () => {
    expect(inferDataContainerFieldSpecs({ count: 1 }).count).toEqual({
      name: 'count',
      type: 'number',
      esTypes: ['long'],
      searchable: false,
      aggregatable: false,
    });
  });
});
