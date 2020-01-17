/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { findRulesSchema } from './find_rules_schema';
import { FindParamsRest } from '../../rules/types';

describe('find rules schema', () => {
  test('empty objects do validate', () => {
    expect(findRulesSchema.validate<Partial<FindParamsRest>>({}).error).toBeFalsy();
  });

  test('all values validate', () => {
    expect(
      findRulesSchema.validate<Partial<FindParamsRest>>({
        per_page: 5,
        page: 1,
        sort_field: 'some field',
        fields: ['field 1', 'field 2'],
        filter: 'some filter',
        sort_order: 'asc',
      }).error
    ).toBeFalsy();
  });

  test('made up parameters do not validate', () => {
    expect(
      findRulesSchema.validate<Partial<FindParamsRest & { madeUp: string }>>({
        madeUp: 'hi',
      }).error
    ).toBeTruthy();
  });

  test('per_page validates', () => {
    expect(
      findRulesSchema.validate<Partial<FindParamsRest>>({ per_page: 5 }).error
    ).toBeFalsy();
  });

  test('page validates', () => {
    expect(
      findRulesSchema.validate<Partial<FindParamsRest>>({ page: 5 }).error
    ).toBeFalsy();
  });

  test('sort_field validates', () => {
    expect(
      findRulesSchema.validate<Partial<FindParamsRest>>({ sort_field: 'some value' }).error
    ).toBeFalsy();
  });

  test('fields validates with a string', () => {
    expect(
      findRulesSchema.validate<Partial<FindParamsRest>>({ fields: ['some value'] }).error
    ).toBeFalsy();
  });

  test('fields validates with multiple strings', () => {
    expect(
      findRulesSchema.validate<Partial<FindParamsRest>>({
        fields: ['some value 1', 'some value 2'],
      }).error
    ).toBeFalsy();
  });

  test('fields does not validate with a number', () => {
    expect(
      findRulesSchema.validate<Partial<Omit<FindParamsRest, 'fields'>> & { fields: number[] }>({
        fields: [5],
      }).error.message
    ).toEqual(
      'child "fields" fails because ["fields" at position 0 fails because ["0" must be a string]]'
    );
  });

  test('per page has a default of 20', () => {
    expect(findRulesSchema.validate<Partial<FindParamsRest>>({}).value.per_page).toEqual(20);
  });

  test('page has a default of 1', () => {
    expect(findRulesSchema.validate<Partial<FindParamsRest>>({}).value.page).toEqual(1);
  });

  test('filter works with a string', () => {
    expect(
      findRulesSchema.validate<Partial<FindParamsRest>>({
        filter: 'some value 1',
      }).error
    ).toBeFalsy();
  });

  test('filter does not work with a number', () => {
    expect(
      findRulesSchema.validate<Partial<Omit<FindParamsRest, 'filter'>> & { filter: number }>({
        filter: 5,
      }).error.message
    ).toEqual('child "filter" fails because ["filter" must be a string]');
  });

  test('sort_order requires sort_field to work', () => {
    expect(
      findRulesSchema.validate<Partial<FindParamsRest>>({
        sort_order: 'asc',
      }).error.message
    ).toEqual('child "sort_field" fails because ["sort_field" is required]');
  });

  test('sort_order and sort_field validate together', () => {
    expect(
      findRulesSchema.validate<Partial<FindParamsRest>>({
        sort_order: 'asc',
        sort_field: 'some field',
      }).error
    ).toBeFalsy();
  });

  test('sort_order validates with desc and sort_field', () => {
    expect(
      findRulesSchema.validate<Partial<FindParamsRest>>({
        sort_order: 'desc',
        sort_field: 'some field',
      }).error
    ).toBeFalsy();
  });

  test('sort_order does not validate with a string other than asc and desc', () => {
    expect(
      findRulesSchema.validate<
        Partial<Omit<FindParamsRest, 'sort_order'>> & { sort_order: string }
      >({
        sort_order: 'some other string',
        sort_field: 'some field',
      }).error.message
    ).toEqual('child "sort_order" fails because ["sort_order" must be one of [asc, desc]]');
  });
});
