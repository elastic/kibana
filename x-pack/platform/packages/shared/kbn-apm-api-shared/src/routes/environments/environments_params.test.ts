/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { environmentsRoute } from './environments';

describe('environmentsRoute params', () => {
  it('accepts a range without serviceName', () => {
    const result = environmentsRoute.params!.shape.query.safeParse({
      start: '2023-01-01T00:00:00.000Z',
      end: '2023-01-02T00:00:00.000Z',
    });

    expectParseSuccess(result);
  });

  it('accepts an optional serviceName', () => {
    const result = environmentsRoute.params!.shape.query.safeParse({
      start: '2023-01-01T00:00:00.000Z',
      end: '2023-01-02T00:00:00.000Z',
      serviceName: 'opbeans-java',
    });

    expectParseSuccess(result);
  });

  it('rejects a missing required range field', () => {
    expectParseError(environmentsRoute.params!.shape.query.safeParse({ serviceName: 'x' }));
  });
});
