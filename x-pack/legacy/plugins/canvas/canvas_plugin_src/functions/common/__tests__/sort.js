/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { sort } from '../sort';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { testTable } from './fixtures/test_tables';

describe('sort', () => {
  const fn = functionWrapper(sort);

  const isSorted = (rows, column, reverse) => {
    if (reverse) {
      return !rows.some((row, i) => rows[i + 1] && row[column] < rows[i + 1][column]);
    }
    return !rows.some((row, i) => rows[i + 1] && row[column] > rows[i + 1][column]);
  };

  it('returns a datatable sorted by a specified column in asc order', () => {
    const result = fn(testTable, { by: 'price', reverse: false });

    expect(result.type).to.be('datatable');
    expect(result.columns).to.eql(testTable.columns);
    expect(isSorted(result.rows, 'price', false)).to.be(true);
  });

  describe('args', () => {
    describe('by', () => {
      it('sorts on a specified column', () => {
        const result = fn(testTable, { by: 'quantity', reverse: true });

        expect(isSorted(result.rows, 'quantity', true)).to.be(true);
      });

      it('sorts on the first column if not specified', () => {
        const result = fn(testTable, { reverse: false });

        expect(isSorted(result.rows, result.columns[0].name, false)).to.be(true);
      });

      it('returns the original datatable if given an invalid column', () => {
        expect(fn(testTable, { by: 'foo' })).to.eql(testTable);
      });
    });

    describe('reverse', () => {
      it('sorts in asc order', () => {
        const result = fn(testTable, { by: 'in_stock', reverse: false });

        expect(isSorted(result.rows, 'in_stock', false)).to.be(true);
      });

      it('sorts in desc order', () => {
        const result = fn(testTable, { by: 'price', reverse: true });

        expect(isSorted(result.rows, 'price', true)).to.be(true);
      });

      it('sorts in asc order by default', () => {
        const result = fn(testTable, { by: 'time' });

        expect(isSorted(result.rows, 'time', false)).to.be(true);
      });
    });
  });
});
