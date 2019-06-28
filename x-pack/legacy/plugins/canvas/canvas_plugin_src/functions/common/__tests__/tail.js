/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { tail } from '../tail';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { emptyTable, testTable } from './fixtures/test_tables';

describe('tail', () => {
  const fn = functionWrapper(tail);
  const lastIndex = testTable.rows.length - 1;

  it('returns a datatable with the last N rows of the context', () => {
    const result = fn(testTable, { count: 2 });

    expect(result.type).to.be('datatable');
    expect(result.columns).to.eql(testTable.columns);
    expect(result.rows).to.have.length(2);
    expect(result.rows[0]).to.eql(testTable.rows[lastIndex - 1]);
    expect(result.rows[1]).to.eql(testTable.rows[lastIndex]);
  });

  it('returns the original context if N >= context.rows.length', () => {
    expect(fn(testTable, { count: testTable.rows.length + 5 })).to.eql(testTable);
    expect(fn(testTable, { count: testTable.rows.length })).to.eql(testTable);
    expect(fn(emptyTable)).to.eql(emptyTable);
  });

  it('returns the last row if N is not specified', () => {
    const result = fn(testTable);

    expect(result.rows).to.have.length(1);
    expect(result.rows[0]).to.eql(testTable.rows[lastIndex]);
  });
});
