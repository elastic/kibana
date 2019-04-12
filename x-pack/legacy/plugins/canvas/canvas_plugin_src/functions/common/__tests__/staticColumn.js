/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { staticColumn } from '../staticColumn';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { testTable, emptyTable } from './fixtures/test_tables';

describe('staticColumn', () => {
  const fn = functionWrapper(staticColumn);

  it('adds a column to a datatable with a static value in every row', () => {
    const result = fn(testTable, { name: 'foo', value: 'bar' });

    expect(result.type).to.be('datatable');
    expect(result.columns).to.eql([...testTable.columns, { name: 'foo', type: 'string' }]);
    expect(result.rows.every(row => typeof row.foo === 'string')).to.be(true);
    expect(result.rows.every(row => row.foo === 'bar')).to.be(true);
  });

  it('overwrites an existing column if provided an existing column name', () => {
    const result = fn(testTable, { name: 'name', value: 'John' });

    expect(result.type).to.be('datatable');
    expect(result.columns).to.eql(testTable.columns);
    expect(result.rows.every(row => typeof row.name === 'string')).to.be(true);
    expect(result.rows.every(row => row.name === 'John')).to.be(true);
  });

  it('adds a column with null values', () => {
    const result = fn(testTable, { name: 'empty' });

    expect(result.type).to.be('datatable');
    expect(result.columns).to.eql([...testTable.columns, { name: 'empty', type: 'null' }]);
    expect(result.rows.every(row => row.empty === null)).to.be(true);
  });

  it('adds a column to empty tables', () => {
    const result = fn(emptyTable, { name: 'empty', value: 1 });

    expect(result.type).to.be('datatable');
    expect(result.columns).to.eql([{ name: 'empty', type: 'number' }]);
    expect(result.rows.length).to.be(0);
  });
});
