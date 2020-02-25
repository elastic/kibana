/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { left, right } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { getPaths } from './utils';
import { foldLeftRight } from './__mocks__/utils';
import { exactCheck } from './exact_check';

describe('exact_check', () => {
  test('it returns an error if given extra object properties', () => {
    const someType = t.exact(
      t.type({
        a: t.string,
      })
    );
    const payload = { a: 'test', b: 'test' };
    const decoded = someType.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "b"']);
    expect(message.schema).toEqual({});
  });

  test('it returns an error if the data type is not as expected', () => {
    const someType = t.exact(
      t.type({
        a: t.string,
      })
    );
    const payload = { a: 1 };
    const decoded = someType.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "1" supplied to "a"']);
    expect(message.schema).toEqual({});
  });

  test('it does NOT return an error if given normal object properties', () => {
    const someType = t.exact(
      t.type({
        a: t.string,
      })
    );
    const payload = { a: 'test' };
    const decoded = someType.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it will return an existing error and not validate', () => {
    const payload = { a: 'test' };
    const validationError: t.ValidationError = {
      value: 'Some existing error',
      context: [],
      message: 'some error',
    };
    const error: t.Errors = [validationError];
    const leftValue = left(error);
    const checked = exactCheck(payload, leftValue);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['some error']);
    expect(message.schema).toEqual({});
  });

  test('it will work with a regular "right" payload without any decoding', () => {
    const payload = { a: 'test' };
    const rightValue = right(payload);
    const checked = exactCheck(payload, rightValue);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual({ a: 'test' });
  });
});
