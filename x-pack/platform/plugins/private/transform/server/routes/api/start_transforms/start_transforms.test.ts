/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as EsErrors, type DiagnosticResult } from '@elastic/elasticsearch';

import type { StartTransformsResponseSchema } from '../../api_schemas/start_transforms';

import { startTransforms } from './start_transforms';

const createEsClient = (startTransform: jest.Mock) => ({ transform: { startTransform } } as any);

describe('startTransforms', () => {
  it('returns per-transform timeout results and stops the loop when a request times out', async () => {
    const startTransform = jest
      .fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(
        new EsErrors.TimeoutError('Request timed out', {} as DiagnosticResult)
      );

    const results = (await startTransforms(
      [{ id: 'transform-1' }, { id: 'transform-2' }, { id: 'transform-3' }],
      createEsClient(startTransform)
    )) as StartTransformsResponseSchema;

    expect(results['transform-1']).toEqual({ success: true });
    expect(results['transform-2'].success).toBe(false);
    expect(results['transform-2'].error?.reason).toMatch(/timed out/);
    expect(results['transform-3'].success).toBe(false);
    expect(results['transform-3'].error?.reason).toMatch(/timed out/);
    expect(startTransform).toHaveBeenCalledTimes(2);
  });

  it('returns a failure result with an error body when the request fails without an ES error body', async () => {
    const startTransform = jest
      .fn()
      .mockRejectedValue(new EsErrors.ConnectionError('connection reset'));

    const results = (await startTransforms(
      [{ id: 'transform-1' }],
      createEsClient(startTransform)
    )) as StartTransformsResponseSchema;

    expect(results['transform-1'].success).toBe(false);
    expect(results['transform-1'].error).toEqual(
      expect.objectContaining({ reason: 'connection reset' })
    );
  });

  it('passes the ES error body through when present', async () => {
    const esError = { type: 'status_exception', reason: 'cannot start transform' };
    const startTransform = jest.fn().mockRejectedValue({ meta: { body: { error: esError } } });

    const results = (await startTransforms(
      [{ id: 'transform-1' }],
      createEsClient(startTransform)
    )) as StartTransformsResponseSchema;

    expect(results['transform-1']).toEqual({ success: false, error: esError });
  });
});
