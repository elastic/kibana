/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setSignalsStatusSchema } from './set_signal_status_schema';
import { SignalsRestParams } from '../../signals/types';

describe('set signal status schema', () => {
  test('signal_ids and status is valid', () => {
    expect(
      setSignalsStatusSchema.validate<Partial<SignalsRestParams>>({
        signal_ids: ['somefakeid'],
        status: 'open',
      }).error
    ).toBeFalsy();
  });

  test('query and status is valid', () => {
    expect(
      setSignalsStatusSchema.validate<Partial<SignalsRestParams>>({
        query: {},
        status: 'open',
      }).error
    ).toBeFalsy();
  });

  test('signal_ids and missing status is invalid', () => {
    expect(
      setSignalsStatusSchema.validate<Partial<SignalsRestParams>>({
        signal_ids: ['somefakeid'],
      }).error
    ).toBeTruthy();
  });

  test('query and missing status is invalid', () => {
    expect(
      setSignalsStatusSchema.validate<Partial<SignalsRestParams>>({
        query: {},
      }).error
    ).toBeTruthy();
  });

  test('status is present but query or signal_ids is missing is invalid', () => {
    expect(
      setSignalsStatusSchema.validate<Partial<SignalsRestParams>>({
        status: 'closed',
      }).error
    ).toBeTruthy();
  });

  test('signal_ids is present but status has wrong value', () => {
    expect(
      setSignalsStatusSchema.validate<
        Partial<
          Omit<SignalsRestParams, 'status'> & {
            status: string;
          }
        >
      >({
        status: 'fakeVal',
      }).error
    ).toBeTruthy();
  });
});
