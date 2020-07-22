/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functionWrapper } from '../../../__tests__/helpers/function_wrapper';
import { testTable, emptyTable } from './__tests__/fixtures/test_tables';
import { staticColumn } from './staticColumn';

describe('staticColumn', () => {
  const fn = functionWrapper(staticColumn);

  it('adds a column to a datatable with a static value in every row', () => {
    const result = fn(testTable, { name: 'foo', value: 'bar' });

    expect(result.type).toBe('datatable');
    expect(result.columns).toEqual([...testTable.columns, { name: 'foo', type: 'string' }]);
    expect(result.rows.every((row) => typeof row.foo === 'string')).toBe(true);
    expect(result.rows.every((row) => row.foo === 'bar')).toBe(true);
  });

  it('overwrites an existing column if provided an existing column name', () => {
    const result = fn(testTable, { name: 'name', value: 'John' });

    expect(result.type).toBe('datatable');
    expect(result.columns).toEqual(testTable.columns);
    expect(result.rows.every((row) => typeof row.name === 'string')).toBe(true);
    expect(result.rows.every((row) => row.name === 'John')).toBe(true);
  });

  it('adds a column with null values', () => {
    const result = fn(testTable, { name: 'empty' });

    expect(result.type).toBe('datatable');
    expect(result.columns).toEqual([...testTable.columns, { name: 'empty', type: 'null' }]);
    expect(result.rows.every((row) => row.empty === null)).toBe(true);
  });

  it('adds a column to empty tables', () => {
    const result = fn(emptyTable, { name: 'empty', value: 1 });

    expect(result.type).toBe('datatable');
    expect(result.columns).toEqual([{ name: 'empty', type: 'number' }]);
    expect(result.rows.length).toBe(0);
  });
});
