/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { startTransforms } from './start_transforms';

const createEsClientMock = () =>
  ({
    transform: {
      startTransform: jest.fn(),
    },
  } as unknown as ElasticsearchClient & {
    transform: { startTransform: jest.Mock };
  });

const createEsError = (type: string) => ({
  meta: {
    body: {
      error: {
        type,
        reason: type,
      },
    },
  },
});

describe('startTransforms', () => {
  it('retries transient cloud credential encryption key errors', async () => {
    const esClient = createEsClientMock();
    esClient.transform.startTransform
      .mockRejectedValueOnce(createEsError('encryption_key_not_yet_available_exception'))
      .mockResolvedValueOnce({});

    const result = await startTransforms([{ id: 'test-transform' }], esClient, [0]);

    expect(result).toEqual({ 'test-transform': { success: true } });
    expect(esClient.transform.startTransform).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-transient errors', async () => {
    const esClient = createEsClientMock();
    esClient.transform.startTransform.mockRejectedValueOnce(createEsError('security_exception'));

    const result = await startTransforms([{ id: 'test-transform' }], esClient, [0]);

    expect(result).toEqual({
      'test-transform': {
        success: false,
        error: {
          type: 'security_exception',
          reason: 'security_exception',
        },
      },
    });
    expect(esClient.transform.startTransform).toHaveBeenCalledTimes(1);
  });
});
