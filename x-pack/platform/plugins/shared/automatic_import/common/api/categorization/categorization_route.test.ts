/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers';
import { CategorizationRequestBody } from './categorization_route.gen';
import { getCategorizationRequestMock } from '../model/api_test.mock';

describe('Categorization request schema', () => {
  test('accepts valid full request', () => {
    const payload = getCategorizationRequestMock();
    const result = CategorizationRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('rejects invalid packageName', () => {
    expectParseError(
      CategorizationRequestBody.safeParse({ ...getCategorizationRequestMock(), packageName: '   ' })
    );
  });

  test('rejects rawSamples exceeding max items', () => {
    expectParseError(
      CategorizationRequestBody.safeParse({
        ...getCategorizationRequestMock(),
        rawSamples: new Array(101).fill('{}'),
      })
    );
  });
});
