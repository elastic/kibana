/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers';
import { AnalyzeApiRequestBody } from './analyze_api_route.gen';
import { getAnalyzeApiRequestBody } from '../model/api_test.mock';

describe('Analyze API request schema', () => {
  test('accepts valid full request', () => {
    const payload = getAnalyzeApiRequestBody();
    const result = AnalyzeApiRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('rejects invalid dataStreamTitle', () => {
    expectParseError(
      AnalyzeApiRequestBody.safeParse({ ...getAnalyzeApiRequestBody(), dataStreamTitle: '   ' })
    );
  });
});
