/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { environmentSchema } from './environment_rt';
import { ENVIRONMENT_ALL, ENVIRONMENT_NOT_DEFINED } from './environment_filter_values';

describe('environmentSchema', () => {
  it('accepts the special ENVIRONMENT_ALL/ENVIRONMENT_NOT_DEFINED values', () => {
    expectParseSuccess(environmentSchema.safeParse({ environment: ENVIRONMENT_ALL.value }));
    expectParseSuccess(environmentSchema.safeParse({ environment: ENVIRONMENT_NOT_DEFINED.value }));
  });

  it('accepts an arbitrary environment string', () => {
    const result = environmentSchema.safeParse({ environment: 'production' });

    expectParseSuccess(result);
    expect(result.data.environment).toEqual('production');
  });

  it('rejects a missing environment', () => {
    const result = environmentSchema.safeParse({});

    expectParseError(result);
  });
});
