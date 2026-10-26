/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseSuccess } from '@kbn/zod-helpers/v4';
import { serviceSchema } from './agent_configuration_intake_rt';

describe('serviceSchema', () => {
  it('accepts an empty object', () => {
    expectParseSuccess(serviceSchema.safeParse({}));
  });

  it('accepts a partial service', () => {
    const result = serviceSchema.safeParse({ name: 'opbeans-java' });

    expectParseSuccess(result);
    expect(result.data).toEqual({ name: 'opbeans-java' });
  });

  it('accepts both name and environment', () => {
    const result = serviceSchema.safeParse({ name: 'opbeans-java', environment: 'production' });

    expectParseSuccess(result);
  });
});
