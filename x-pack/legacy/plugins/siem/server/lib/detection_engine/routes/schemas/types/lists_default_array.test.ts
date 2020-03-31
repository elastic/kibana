/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ListsDefaultArray } from './lists_default_array';
import { pipe } from 'fp-ts/lib/pipeable';
import { foldLeftRight, getPaths } from '../response/__mocks__/utils';
import { left } from 'fp-ts/lib/Either';

describe('lists_default_array', () => {
  test('it should validate an empty array', () => {
    const payload: string[] = [];
    const decoded = ListsDefaultArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an array of lists', () => {
    const payload = [
      {
        field: 'source.ip',
        boolean_operator: 'and',
        values: [
          {
            name: '127.0.0.1',
            type: 'value',
          },
        ],
      },
      {
        field: 'host.name',
        boolean_operator: 'and not',
        values: [
          {
            name: 'rock01',
            type: 'value',
          },
          {
            name: 'mothra',
            type: 'value',
          },
        ],
      },
    ];
    const decoded = ListsDefaultArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate an array with a number', () => {
    const payload = [
      {
        field: 'source.ip',
        boolean_operator: 'and',
        values: [
          {
            name: '127.0.0.1',
            type: 'value',
          },
        ],
      },
      5,
    ];
    const decoded = ListsDefaultArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "5" supplied to ""']);
    expect(message.schema).toEqual({});
  });

  test('it should return a default array entry', () => {
    const payload = null;
    const decoded = ListsDefaultArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([]);
  });
});
