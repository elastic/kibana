/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { ply } from '../ply';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { getFunctionErrors } from '../../../strings';
import { testTable } from './fixtures/test_tables';

const errors = getFunctionErrors().ply;

const averagePrice = datatable => {
  const average = datatable.rows.reduce((sum, row) => sum + row.price, 0) / datatable.rows.length;

  return Promise.resolve({
    type: 'datatable',
    columns: [{ name: 'average_price', type: 'number' }],
    rows: [{ average_price: average }],
  });
};

const doublePrice = datatable => {
  const newRows = datatable.rows.map(row => ({ double_price: row.price * 2 }));

  return Promise.resolve({
    type: 'datatable',
    columns: [{ name: 'double_price', type: 'number' }],
    rows: newRows,
  });
};

const rowCount = datatable => {
  return Promise.resolve({
    type: 'datatable',
    columns: [{ name: 'row_count', type: 'number' }],
    rows: [
      {
        row_count: datatable.rows.length,
      },
    ],
  });
};

describe('ply', () => {
  const fn = functionWrapper(ply);

  it('maps a function over sub datatables grouped by specified columns and merges results into one datatable', () => {
    const arbitaryRowIndex = 0;

    return fn(testTable, { by: ['name', 'in_stock'], expression: [averagePrice, rowCount] }).then(
      result => {
        expect(result.type).to.be('datatable');
        expect(result.columns).to.eql([
          { name: 'name', type: 'string' },
          { name: 'in_stock', type: 'boolean' },
          { name: 'average_price', type: 'number' },
          { name: 'row_count', type: 'number' },
        ]);
        expect(result.rows[arbitaryRowIndex])
          .to.have.property('average_price')
          .and.to.have.property('row_count');
      }
    );
  });

  describe('missing args', () => {
    it('returns the original datatable if both args are missing', () => {
      return fn(testTable).then(result => expect(result).to.eql(testTable));
    });

    describe('by', () => {
      it('passes the entire context into the expression when no columns are provided', () => {
        return fn(testTable, { expression: [rowCount] }).then(result =>
          expect(result).to.eql({
            type: 'datatable',
            rows: [{ row_count: testTable.rows.length }],
            columns: [{ name: 'row_count', type: 'number' }],
          })
        );
      });

      it('throws when by is an invalid column', () => {
        expect(() => fn(testTable, { by: [''], expression: [averagePrice] })).to.throwException(
          new RegExp(errors.columnNotFound('').message)
        );
        expect(() => fn(testTable, { by: ['foo'], expression: [averagePrice] })).to.throwException(
          new RegExp(errors.columnNotFound('foo').message)
        );
      });
    });

    describe('expression', () => {
      it('returns the original datatable grouped by the specified columns', () => {
        const arbitaryRowIndex = 6;

        return fn(testTable, { by: ['price', 'quantity'] }).then(result => {
          expect(result.columns[0]).to.have.property('name', 'price');
          expect(result.columns[1]).to.have.property('name', 'quantity');
          expect(result.rows[arbitaryRowIndex])
            .to.have.property('price')
            .and.to.have.property('quantity');
        });
      });

      it('throws when row counts do not match across resulting datatables', () => {
        return fn(testTable, {
          by: ['name'],
          expression: [doublePrice, rowCount],
        }).catch(e => expect(e).to.eql(errors.rowCountMismatch()));
      });
    });
  });
});
