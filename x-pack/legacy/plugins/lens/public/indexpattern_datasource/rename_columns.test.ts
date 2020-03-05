/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renameColumns } from './rename_columns';
import { KibanaDatatable } from '../../../../../../src/plugins/expressions/public';
import { createMockExecutionContext } from '../../../../../../src/plugins/expressions/common/mocks';

describe('rename_columns', () => {
  it('should rename columns of a given datatable', () => {
    const input: KibanaDatatable = {
      type: 'kibana_datatable',
      columns: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
      rows: [
        { a: 1, b: 2 },
        { a: 3, b: 4 },
        { a: 5, b: 6 },
        { a: 7, b: 8 },
      ],
    };

    const idMap = {
      a: {
        id: 'b',
        label: 'Austrailia',
      },
      b: {
        id: 'c',
        label: 'Boomerang',
      },
    };

    const result = renameColumns.fn(
      input,
      { idMap: JSON.stringify(idMap) },
      createMockExecutionContext()
    );

    expect(result).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          Object {
            "id": "b",
            "name": "Austrailia",
          },
          Object {
            "id": "c",
            "name": "Boomerang",
          },
        ],
        "rows": Array [
          Object {
            "b": 1,
            "c": 2,
          },
          Object {
            "b": 3,
            "c": 4,
          },
          Object {
            "b": 5,
            "c": 6,
          },
          Object {
            "b": 7,
            "c": 8,
          },
        ],
        "type": "kibana_datatable",
      }
    `);
  });

  it('should replace "" with a visible value', () => {
    const input: KibanaDatatable = {
      type: 'kibana_datatable',
      columns: [{ id: 'a', name: 'A' }],
      rows: [{ a: '' }],
    };

    const idMap = {
      a: {
        id: 'a',
        label: 'Austrailia',
      },
    };

    const result = renameColumns.fn(
      input,
      { idMap: JSON.stringify(idMap) },
      createMockExecutionContext()
    );

    expect(result.rows[0].a).toEqual('(empty)');
  });

  it('should keep columns which are not mapped', () => {
    const input: KibanaDatatable = {
      type: 'kibana_datatable',
      columns: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
      rows: [
        { a: 1, b: 2 },
        { a: 3, b: 4 },
        { a: 5, b: 6 },
        { a: 7, b: 8 },
      ],
    };

    const idMap = {
      b: { id: 'c', label: 'Catamaran' },
    };

    const result = renameColumns.fn(
      input,
      { idMap: JSON.stringify(idMap) },
      createMockExecutionContext()
    );

    expect(result).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          Object {
            "id": "a",
            "name": "A",
          },
          Object {
            "id": "c",
            "name": "Catamaran",
          },
        ],
        "rows": Array [
          Object {
            "a": 1,
            "c": 2,
          },
          Object {
            "a": 3,
            "c": 4,
          },
          Object {
            "a": 5,
            "c": 6,
          },
          Object {
            "a": 7,
            "c": 8,
          },
        ],
        "type": "kibana_datatable",
      }
    `);
  });

  it('should rename date histograms', () => {
    const input: KibanaDatatable = {
      type: 'kibana_datatable',
      columns: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'banana per 30 seconds' },
      ],
      rows: [
        { a: 1, b: 2 },
        { a: 3, b: 4 },
        { a: 5, b: 6 },
        { a: 7, b: 8 },
      ],
    };

    const idMap = {
      b: { id: 'c', label: 'Apple', operationType: 'date_histogram', sourceField: 'banana' },
    };

    const result = renameColumns.fn(
      input,
      { idMap: JSON.stringify(idMap) },
      createMockExecutionContext()
    );

    expect(result).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          Object {
            "id": "a",
            "name": "A",
          },
          Object {
            "id": "c",
            "name": "Apple per 30 seconds",
          },
        ],
        "rows": Array [
          Object {
            "a": 1,
            "c": 2,
          },
          Object {
            "a": 3,
            "c": 4,
          },
          Object {
            "a": 5,
            "c": 6,
          },
          Object {
            "a": 7,
            "c": 8,
          },
        ],
        "type": "kibana_datatable",
      }
    `);
  });
});
