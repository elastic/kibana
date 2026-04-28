/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers';
import { RelatedRequestBody } from './related_route.gen';
import { getRelatedRequestMock } from '../model/api_test.mock';

describe('Related request schema', () => {
  test('accepts valid full request', () => {
    const payload = getRelatedRequestMock();
    const result = RelatedRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('rejects rawSamples exceeding max items', () => {
    expectParseError(
      RelatedRequestBody.safeParse({
        ...getRelatedRequestMock(),
        rawSamples: new Array(101).fill('{}'),
      })
    );
  });
});
