/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildNerModelsAvailabilityQueryFn } from './use_get_ner_models_availability';

describe('buildNerModelsAvailabilityQueryFn', () => {
  const getTrainedModelStats = jest.fn();
  const client = { getTrainedModelStats };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns unavailable model ids when deployment is not started', async () => {
    getTrainedModelStats
      .mockResolvedValueOnce({
        trained_model_stats: [{ deployment_stats: { state: 'started' } }],
      })
      .mockResolvedValueOnce({
        trained_model_stats: [{ deployment_stats: { state: 'stopped' } }],
      });

    const queryFn = buildNerModelsAvailabilityQueryFn(client, ['model-a', 'model-b']);
    await expect(queryFn()).resolves.toEqual(['model-b']);
  });

  it('marks model as unavailable when stats request fails', async () => {
    getTrainedModelStats.mockRejectedValue(new Error('not found'));

    const queryFn = buildNerModelsAvailabilityQueryFn(client, ['model-a']);
    await expect(queryFn()).resolves.toEqual(['model-a']);
  });

  it('does not mark model as unavailable when stats request is unauthorized', async () => {
    getTrainedModelStats.mockRejectedValue({ statusCode: 403 });

    const queryFn = buildNerModelsAvailabilityQueryFn(client, ['model-a']);
    await expect(queryFn()).resolves.toEqual([]);
  });

  it('treats fully allocated deployments as available', async () => {
    getTrainedModelStats.mockResolvedValue({
      trained_model_stats: [
        {
          deployment_stats: {
            allocation_status: {
              state: 'fully_allocated',
            },
          },
        },
      ],
    });

    const queryFn = buildNerModelsAvailabilityQueryFn(client, ['model-a']);
    await expect(queryFn()).resolves.toEqual([]);
  });
});
