/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck } from './exact_check';
import { foldLeftRight, getErrorPayload } from './__mocks__/utils';
import { getPaths } from './utils';
import { errorSchema } from './error_schema';

describe('error_schema', () => {
  test('it should validate an error with a UUID given for id', () => {
    const error = getErrorPayload();
    const decoded = errorSchema.decode(getErrorPayload());
    const checked = exactCheck(error, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(error);
  });

  test('it should validate an error with a plain string given for id since sometimes we echo the user id which might not be a UUID back out to them', () => {
    const error = getErrorPayload('fake id');
    const decoded = errorSchema.decode(error);
    const checked = exactCheck(error, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(error);
  });
});
