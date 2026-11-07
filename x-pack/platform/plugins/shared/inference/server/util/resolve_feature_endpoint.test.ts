/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceTaskErrorCode } from '@kbn/inference-common';
import { resolveFeatureEndpointOrThrow } from './resolve_feature_endpoint';

describe('resolveFeatureEndpointOrThrow', () => {
  it('returns the resolver result', async () => {
    const endpoint = { connectorId: 'feature-connector', temperature: 0.3, reasoning: 'low' };
    const resolveFeatureEndpoint = jest.fn().mockResolvedValue(endpoint);

    await expect(
      resolveFeatureEndpointOrThrow({ featureId: 'my_feature', resolveFeatureEndpoint })
    ).resolves.toEqual(endpoint);

    expect(resolveFeatureEndpoint).toHaveBeenCalledTimes(1);
    expect(resolveFeatureEndpoint).toHaveBeenCalledWith('my_feature');
  });

  it('throws an internal error when no resolver is registered', async () => {
    await expect(resolveFeatureEndpointOrThrow({ featureId: 'my_feature' })).rejects.toMatchObject({
      code: InferenceTaskErrorCode.internalError,
      message: 'Cannot resolve feature "my_feature": no feature endpoint resolver is registered',
    });
  });

  it('throws an aborted error when the signal is already aborted and does not call the resolver', async () => {
    const resolveFeatureEndpoint = jest
      .fn()
      .mockResolvedValue({ connectorId: 'feature-connector' });
    const abortController = new AbortController();
    abortController.abort();

    await expect(
      resolveFeatureEndpointOrThrow({
        featureId: 'my_feature',
        resolveFeatureEndpoint,
        abortSignal: abortController.signal,
      })
    ).rejects.toMatchObject({ code: InferenceTaskErrorCode.abortedError });

    expect(resolveFeatureEndpoint).not.toHaveBeenCalled();
  });

  it('throws a 400 request error when the resolver returns undefined', async () => {
    const resolveFeatureEndpoint = jest.fn().mockResolvedValue(undefined);

    await expect(
      resolveFeatureEndpointOrThrow({ featureId: 'my_feature', resolveFeatureEndpoint })
    ).rejects.toMatchObject({
      code: InferenceTaskErrorCode.requestError,
      meta: { status: 400 },
      message: expect.stringContaining('No endpoint is available for feature "my_feature"'),
    });
  });

  it('rethrows the resolver error', async () => {
    const resolverError = new Error('resolver failure');
    const resolveFeatureEndpoint = jest.fn().mockRejectedValue(resolverError);

    await expect(
      resolveFeatureEndpointOrThrow({ featureId: 'my_feature', resolveFeatureEndpoint })
    ).rejects.toBe(resolverError);
  });
});
