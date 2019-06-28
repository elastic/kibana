/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { columns } from '../columns';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { emptyTable, testTable } from './fixtures/test_tables';

describe('columns', () => {
  const fn = functionWrapper(columns);

  it('returns a datatable', () => {
    expect(fn(testTable, { include: 'name' }).type).to.be('datatable');
  });

  describe('args', () => {
    it('returns a datatable with included columns and without excluded columns', () => {
      const arbitraryRowIndex = 7;
      const result = fn(testTable, {
        include: 'name, price, quantity, foo, bar',
        exclude: 'price, quantity, fizz, buzz',
      });

      expect(result.columns[0]).to.have.property('name', 'name');
      expect(result.rows[arbitraryRowIndex])
        .to.have.property('name', testTable.rows[arbitraryRowIndex].name)
        .and.to.not.have.property('price')
        .and.to.not.have.property('quantity')
        .and.to.not.have.property('foo')
        .and.to.not.have.property('bar')
        .and.to.not.have.property('fizz')
        .and.to.not.have.property('buzz');
    });

    it('returns original context if args are not provided', () => {
      expect(fn(testTable)).to.eql(testTable);
    });

    it('returns an empty datatable if include and exclude both reference the same column(s)', () => {
      expect(fn(testTable, { include: 'price', exclude: 'price' })).to.eql(emptyTable);

      expect(
        fn(testTable, {
          include: 'price, quantity, in_stock',
          exclude: 'price, quantity, in_stock',
        })
      ).to.eql(emptyTable);
    });

    describe('include', () => {
      it('returns a datatable with included columns only', () => {
        const arbitraryRowIndex = 3;
        const result = fn(testTable, {
          include: 'name, time, in_stock',
        });

        expect(result.columns).to.have.length(3);
        expect(Object.keys(result.rows[0])).to.have.length(3);

        expect(result.columns[0]).to.have.property('name', 'name');
        expect(result.columns[1]).to.have.property('name', 'time');
        expect(result.columns[2]).to.have.property('name', 'in_stock');
        expect(result.rows[arbitraryRowIndex])
          .to.have.property('name', testTable.rows[arbitraryRowIndex].name)
          .and.to.have.property('time', testTable.rows[arbitraryRowIndex].time)
          .and.to.have.property('in_stock', testTable.rows[arbitraryRowIndex].in_stock);
      });

      it('ignores invalid columns', () => {
        const arbitraryRowIndex = 6;
        const result = fn(testTable, {
          include: 'name, foo, bar',
        });

        expect(result.columns[0]).to.have.property('name', 'name');
        expect(result.rows[arbitraryRowIndex])
          .to.have.property('name', testTable.rows[arbitraryRowIndex].name)
          .and.to.not.have.property('foo')
          .and.to.not.have.property('bar');
      });

      it('returns an empty datable if include only has invalid columns', () => {
        expect(fn(testTable, { include: 'foo, bar' })).to.eql(emptyTable);
      });
    });

    describe('exclude', () => {
      it('returns a datatable without excluded columns', () => {
        const arbitraryRowIndex = 5;
        const result = fn(testTable, { exclude: 'price, quantity, foo, bar' });

        expect(result.columns.length).to.equal(testTable.columns.length - 2);
        expect(Object.keys(result.rows[0])).to.have.length(testTable.columns.length - 2);
        expect(result.rows[arbitraryRowIndex])
          .to.not.have.property('price')
          .and.to.not.have.property('quantity')
          .and.to.not.have.property('foo')
          .and.to.not.have.property('bar');
      });

      it('ignores invalid columns', () => {
        const arbitraryRowIndex = 1;
        const result = fn(testTable, { exclude: 'time, foo, bar' });

        expect(result.columns.length).to.equal(testTable.columns.length - 1);
        expect(result.rows[arbitraryRowIndex])
          .to.not.have.property('time')
          .and.to.not.have.property('foo')
          .and.to.not.have.property('bar');
      });

      it('returns original context if exclude only references invalid column name(s)', () => {
        expect(fn(testTable, { exclude: 'foo, bar, fizz, buzz' })).to.eql(testTable);
      });
    });
  });
});
