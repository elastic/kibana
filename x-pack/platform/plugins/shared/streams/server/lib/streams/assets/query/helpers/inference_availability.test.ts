/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { checkInferenceAvailability, getElserInferenceId } from './inference_availability';

describe('getElserInferenceId', () => {
  it('returns the self-managed endpoint for non-serverless', () => {
    expect(getElserInferenceId(false)).toBe('.elser-2-elasticsearch');
  });

  it('returns the EIS endpoint for serverless', () => {
    expect(getElserInferenceId(true)).toBe('.elser-2-elastic');
  });
});

describe('checkInferenceAvailability', () => {
  it('returns true when the inference endpoint exists', async () => {
    const esClient = {
      inference: {
        get: jest
          .fn()
          .mockResolvedValue({ endpoints: [{ inference_id: '.elser-2-elasticsearch' }] }),
      },
    } as unknown as ElasticsearchClient;

    const result = await checkInferenceAvailability(esClient, '.elser-2-elasticsearch');
    expect(result).toBe(true);
    expect(esClient.inference.get).toHaveBeenCalledWith({
      inference_id: '.elser-2-elasticsearch',
    });
  });

  it('returns false when the inference endpoint does not exist (404)', async () => {
    const esClient = {
      inference: {
        get: jest.fn().mockRejectedValue({ statusCode: 404, message: 'Not found' }),
      },
    } as unknown as ElasticsearchClient;

    const result = await checkInferenceAvailability(esClient, '.elser-2-elasticsearch');
    expect(result).toBe(false);
  });

  it('returns false when the ES call throws any error', async () => {
    const esClient = {
      inference: {
        get: jest.fn().mockRejectedValue(new Error('Connection refused')),
      },
    } as unknown as ElasticsearchClient;

    const result = await checkInferenceAvailability(esClient, '.elser-2-elasticsearch');
    expect(result).toBe(false);
  });
});
