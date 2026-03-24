/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { EcsMappingRequestBody } from './ecs_route.gen';
import { getEcsMappingRequestMock } from '../model/api_test.mock';

describe('Ecs Mapping request schema', () => {
  test('accepts valid full request', () => {
    const payload = getEcsMappingRequestMock();
    const result = EcsMappingRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('rejects invalid connectorId', () => {
    expectParseError(
      EcsMappingRequestBody.safeParse({ ...getEcsMappingRequestMock(), connectorId: '' })
    );
  });

  test('rejects rawSamples exceeding max items', () => {
    expectParseError(
      EcsMappingRequestBody.safeParse({
        ...getEcsMappingRequestMock(),
        rawSamples: new Array(101).fill('{}'),
      })
    );
  });

  test('rejects additionalProcessors exceeding max items', () => {
    const processors = new Array(201).fill({ set: { field: 'x', value: 'y' } });
    expectParseError(
      EcsMappingRequestBody.safeParse({
        ...getEcsMappingRequestMock(),
        additionalProcessors: processors,
      })
    );
  });

  test('rejects invalid langSmithOptions when provided', () => {
    expectParseError(
      EcsMappingRequestBody.safeParse({
        ...getEcsMappingRequestMock(),
        langSmithOptions: { projectName: '', apiKey: 'x' },
      })
    );
  });
});
