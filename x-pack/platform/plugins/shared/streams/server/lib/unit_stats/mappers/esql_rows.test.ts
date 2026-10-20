/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupById, indexById, numberOrNull, toRows } from './esql_rows';

describe('toRows', () => {
  it('keys each row by column name', () => {
    const rows = toRows({
      columns: [
        { name: 'incoming_rate', type: 'double' },
        { name: 'id', type: 'keyword' },
      ],
      values: [
        [4.6, 'es-prod'],
        [null, 'es-dev'],
      ],
    });

    expect(rows).toEqual([
      { incoming_rate: 4.6, id: 'es-prod' },
      { incoming_rate: null, id: 'es-dev' },
    ]);
  });

  it('reads anything that is not a number or a string as no value', () => {
    const rows = toRows({
      columns: [{ name: 'tags', type: 'keyword' }],
      values: [[['a', 'b']]],
    });

    expect(rows).toEqual([{ tags: null }]);
  });

  it('returns no rows for no values', () => {
    expect(toRows({ columns: [{ name: 'rate', type: 'double' }], values: [] })).toEqual([]);
  });
});

describe('indexById', () => {
  it('maps each row by its id, without the id column', () => {
    const rows = [
      { id: 'es-prod', incoming_rate: 4.6 },
      { id: 'es-dev', incoming_rate: null },
    ];

    expect(indexById(rows, 'id')).toEqual({
      'es-prod': { incoming_rate: 4.6 },
      'es-dev': { incoming_rate: null },
    });
  });
});

describe('groupById', () => {
  it('groups the rows by id, in row order and without the id column', () => {
    const rows = [
      { id: 'es-prod', bucket: 'b1', sum_items: 60 },
      { id: 'es-dev', bucket: 'b1', sum_items: 30 },
      { id: 'es-prod', bucket: 'b2', sum_items: 270 },
    ];

    expect(groupById(rows, 'id')).toEqual({
      'es-prod': [
        { bucket: 'b1', sum_items: 60 },
        { bucket: 'b2', sum_items: 270 },
      ],
      'es-dev': [{ bucket: 'b1', sum_items: 30 }],
    });
  });

  it('has no groups for no rows', () => {
    expect(groupById([], 'id')).toEqual({});
  });
});

describe('numberOrNull', () => {
  it('keeps numbers, including zero', () => {
    expect(numberOrNull(0)).toBe(0);
    expect(numberOrNull(4.6)).toBe(4.6);
  });

  it.each([null, undefined, '4.6'])('is null for %p', (value) => {
    expect(numberOrNull(value)).toBeNull();
  });
});
