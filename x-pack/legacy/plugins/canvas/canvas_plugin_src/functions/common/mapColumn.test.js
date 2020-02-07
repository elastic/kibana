/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functionWrapper } from '../../../__tests__/helpers/function_wrapper';
import { testTable, emptyTable } from './__tests__/fixtures/test_tables';
import { mapColumn } from './mapColumn';

const pricePlusTwo = datatable => Promise.resolve(datatable.rows[0].price + 2);

describe('mapColumn', () => {
  const fn = functionWrapper(mapColumn);

  it('returns a datatable with a new column with the values from mapping a function over each row in a datatable', () => {
    return fn(testTable, { name: 'pricePlusTwo', expression: pricePlusTwo }).then(result => {
      const arbitraryRowIndex = 2;

      expect(result.type).toBe('datatable');
      expect(result.columns).toEqual([
        ...testTable.columns,
        { name: 'pricePlusTwo', type: 'number' },
      ]);
      expect(result.columns[result.columns.length - 1]).toHaveProperty('name', 'pricePlusTwo');
      expect(result.rows[arbitraryRowIndex]).toHaveProperty('pricePlusTwo');
    });
  });

  it('overwrites existing column with the new column if an existing column name is provided', () => {
    return fn(testTable, { name: 'name', expression: pricePlusTwo }).then(result => {
      const nameColumnIndex = result.columns.findIndex(({ name }) => name === 'name');
      const arbitraryRowIndex = 4;

      expect(result.type).toBe('datatable');
      expect(result.columns).toHaveLength(testTable.columns.length);
      expect(result.columns[nameColumnIndex]).toHaveProperty('name', 'name');
      expect(result.columns[nameColumnIndex]).toHaveProperty('type', 'number');
      expect(result.rows[arbitraryRowIndex]).toHaveProperty('name', 202);
    });
  });

  it('adds a column to empty tables', () => {
    return fn(emptyTable, { name: 'name', expression: pricePlusTwo }).then(result => {
      expect(result.type).toBe('datatable');
      expect(result.columns).toHaveLength(1);
      expect(result.columns[0]).toHaveProperty('name', 'name');
      expect(result.columns[0]).toHaveProperty('type', 'null');
    });
  });

  describe('expression', () => {
    it('maps null values to the new column', () => {
      return fn(testTable, { name: 'empty' }).then(result => {
        const emptyColumnIndex = result.columns.findIndex(({ name }) => name === 'empty');
        const arbitraryRowIndex = 8;

        expect(result.columns[emptyColumnIndex]).toHaveProperty('name', 'empty');
        expect(result.columns[emptyColumnIndex]).toHaveProperty('type', 'null');
        expect(result.rows[arbitraryRowIndex]).toHaveProperty('empty', null);
      });
    });
  });
});
