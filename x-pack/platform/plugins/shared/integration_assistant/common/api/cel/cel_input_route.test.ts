/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseSuccess } from '@kbn/zod-helpers';
import { getCelRequestMock } from '../model/api_test.mock';
import { CelInputRequestBody } from './cel_input_route.gen';

describe('Cel request schema', () => {
  test('full request validate', () => {
    const payload: CelInputRequestBody = getCelRequestMock();

    const result = CelInputRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });
});
