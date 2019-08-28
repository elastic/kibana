/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { emptyTable, testTable } from '../common/__tests__/fixtures/test_tables';
import { getExpressionType } from './pointseries/lib/get_expression_type';

describe('getExpressionType', () => {
  it('returns the result type of an evaluated math expression', () => {
    expect(getExpressionType(testTable.columns, '2')).toBe('number');
    expect(getExpressionType(testTable.colunns, '2 + 3')).toBe('number');
    expect(getExpressionType(testTable.columns, 'name')).toBe('string');
    expect(getExpressionType(testTable.columns, 'time')).toBe('date');
    expect(getExpressionType(testTable.columns, 'price')).toBe('number');
    expect(getExpressionType(testTable.columns, 'quantity')).toBe('number');
    expect(getExpressionType(testTable.columns, 'in_stock')).toBe('boolean');
    expect(getExpressionType(testTable.columns, 'mean(price)')).toBe('number');
    expect(getExpressionType(testTable.columns, 'count(name)')).toBe('string');
    expect(getExpressionType(testTable.columns, 'random()')).toBe('number');
    expect(getExpressionType(testTable.columns, 'mean(multiply(price,quantity))')).toBe('number');
  });
  it('returns date instead of number when referencing date column', () => {
    expect(getExpressionType(testTable.columns, 'mean(time)')).toBe('date');
  });
  it(`returns 'null' if referenced field does not exist in datatable`, () => {
    expect(getExpressionType(testTable.columns, 'foo')).toBe('null');
    expect(getExpressionType(emptyTable.columns, 'foo')).toBe('null');
    expect(getExpressionType(emptyTable.columns, 'mean(foo)')).toBe('string');
  });
});
