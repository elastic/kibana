/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as EsErrors } from '@elastic/elasticsearch';

import { TRANSFORM_STATE } from '../../../../common/constants';

import type { ResetTransformsResponseSchema } from '../../api_schemas/reset_transforms';

import { resetTransforms } from './reset_transforms';

const createEsClient = (resetTransform: jest.Mock) => ({
  transform: { resetTransform },
});

const createCtx = (esClient: unknown) =>
  ({ core: { elasticsearch: { client: { asCurrentUser: esClient } } } } as any);

const createRequest = (
  transformsInfo = [{ id: 'transform-1', state: TRANSFORM_STATE.STOPPED }]
) => ({
  transformsInfo,
});

describe('resetTransforms', () => {
  it('returns nested timeout results and stops the loop when a request times out', async () => {
    const resetTransform = jest
      .fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new EsErrors.TimeoutError('Request timed out'));
    const response = { forbidden: jest.fn() };

    const results = (await resetTransforms(
      createRequest([
        { id: 'transform-1', state: TRANSFORM_STATE.STOPPED },
        { id: 'transform-2', state: TRANSFORM_STATE.STOPPED },
        { id: 'transform-3', state: TRANSFORM_STATE.STOPPED },
      ]),
      createCtx(createEsClient(resetTransform)),
      response as any
    )) as ResetTransformsResponseSchema;

    expect(results['transform-1'].transformReset.success).toBe(true);
    expect(results['transform-2'].transformReset.success).toBe(false);
    expect(results['transform-2'].transformReset.error?.reason).toMatch(/timed out/);
    expect(results['transform-3'].transformReset.success).toBe(false);
    expect(results['transform-3'].transformReset.error?.reason).toMatch(/timed out/);
    expect(resetTransform).toHaveBeenCalledTimes(2);
  });

  it('returns a forbidden response when resetting the transform fails with 403', async () => {
    const resetTransform = jest.fn().mockRejectedValue({ statusCode: 403 });
    const response = { forbidden: jest.fn().mockReturnValue({ status: 403 }) };

    const result = await resetTransforms(
      createRequest(),
      createCtx(createEsClient(resetTransform)),
      response as any
    );

    expect(result).toEqual({ status: 403 });
    expect(response.forbidden).toHaveBeenCalledTimes(1);
  });
});
