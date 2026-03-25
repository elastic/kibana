/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers';
import { getCelRequestMock } from '../model/api_test.mock';
import { CelInputRequestBody } from './cel_input_route.gen';

describe('Cel request schema', () => {
  test('accepts valid full request', () => {
    const payload = getCelRequestMock();
    const result = CelInputRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('rejects invalid celDetails.path', () => {
    const mock = getCelRequestMock();
    expectParseError(
      CelInputRequestBody.safeParse({
        ...mock,
        celDetails: { ...mock.celDetails, path: '   ' },
      })
    );
  });
});
