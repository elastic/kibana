/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseSuccess } from '@kbn/zod-helpers';
import { EcsMappingRequestBody } from './ecs_route.gen';
import { getEcsMappingRequestMock } from '../model/api_test.mock';

describe('Ecs Mapping request schema', () => {
  test('full request validate', () => {
    const payload: EcsMappingRequestBody = getEcsMappingRequestMock();

    const result = EcsMappingRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });
});
