/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { suggestionsRoute } from './suggestions';

describe('suggestionsRoute params', () => {
  it('accepts the required fields without serviceName', () => {
    const result = suggestionsRoute.params!.shape.query.safeParse({
      fieldName: 'service.name',
      fieldValue: 'opbe',
      start: '2023-01-01T00:00:00.000Z',
      end: '2023-01-02T00:00:00.000Z',
    });

    expectParseSuccess(result);
  });

  it('accepts an optional serviceName', () => {
    const result = suggestionsRoute.params!.shape.query.safeParse({
      fieldName: 'service.name',
      fieldValue: 'opbe',
      start: '2023-01-01T00:00:00.000Z',
      end: '2023-01-02T00:00:00.000Z',
      serviceName: 'opbeans-java',
    });

    expectParseSuccess(result);
  });

  it('rejects a missing fieldValue', () => {
    const result = suggestionsRoute.params!.shape.query.safeParse({
      fieldName: 'service.name',
      start: '2023-01-01T00:00:00.000Z',
      end: '2023-01-02T00:00:00.000Z',
    });

    expectParseError(result);
  });
});
