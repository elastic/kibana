/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { dropdownControl } from '../dropdownControl';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { testTable } from './fixtures/test_tables';

describe('dropdownControl', () => {
  const fn = functionWrapper(dropdownControl);
  const uniqueNames = testTable.rows.reduce(
    (unique, { name }) => (unique.includes(name) ? unique : unique.concat([name])),
    []
  );

  it('returns a render as dropdown_filter', () => {
    expect(fn(testTable, { filterColumn: 'name', valueColumn: 'name' }))
      .to.have.property('type', 'render')
      .and.to.have.property('as', 'dropdown_filter');
  });

  describe('args', () => {
    describe('valueColumn', () => {
      it('populates dropdown choices with unique values in valueColumn', () => {
        expect(fn(testTable, { valueColumn: 'name' }).value.choices).to.eql(uniqueNames);
      });

      it('returns an empty array when provided an invalid column', () => {
        expect(fn(testTable, { valueColumn: 'foo' }).value.choices).to.be.empty();
        expect(fn(testTable, { valueColumn: '' }).value.choices).to.be.empty();
      });
    });
  });

  describe('filterColumn', () => {
    it('sets which column the filter is applied to', () => {
      expect(fn(testTable, { filterColumn: 'name' }).value).to.have.property('column', 'name');
      expect(fn(testTable, { filterColumn: 'name', valueColumn: 'price' }).value).to.have.property(
        'column',
        'name'
      );
    });

    it('defaults to valueColumn if not provided', () => {
      expect(fn(testTable, { valueColumn: 'price' }).value).to.have.property('column', 'price');
    });

    it('sets column to undefined if no args are provided', () => {
      expect(fn(testTable).value).to.have.property('column', undefined);
    });
  });
});
