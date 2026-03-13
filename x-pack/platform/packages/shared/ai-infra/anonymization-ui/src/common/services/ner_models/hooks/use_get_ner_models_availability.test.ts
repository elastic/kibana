/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useGetNerModelsAvailability } from './use_get_ner_models_availability';

jest.mock('@kbn/react-query', () => ({
  useQuery: jest.fn(),
}));

describe('useGetNerModelsAvailability', () => {
  const getTrainedModelStats = jest.fn();
  const client = { getTrainedModelStats };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useQuery).mockImplementation((params: unknown) => params as never);
  });

  it('returns unavailable model ids when deployment is not started', async () => {
    getTrainedModelStats
      .mockResolvedValueOnce({
        trained_model_stats: [{ deployment_stats: { state: 'started' } }],
      })
      .mockResolvedValueOnce({
        trained_model_stats: [{ deployment_stats: { state: 'stopped' } }],
      });

    const query = useGetNerModelsAvailability({
      client,
      modelIds: ['model-a', 'model-b'],
      enabled: true,
    }) as {
      queryFn: () => Promise<unknown>;
    };

    await expect(query.queryFn()).resolves.toEqual(['model-b']);
  });

  it('marks model as unavailable when stats request fails', async () => {
    getTrainedModelStats.mockRejectedValue(new Error('not found'));

    const query = useGetNerModelsAvailability({
      client,
      modelIds: ['model-a'],
      enabled: true,
    }) as {
      queryFn: () => Promise<unknown>;
    };

    await expect(query.queryFn()).resolves.toEqual(['model-a']);
  });

  it('does not mark model as unavailable when stats request is unauthorized', async () => {
    getTrainedModelStats.mockRejectedValue({ statusCode: 403 });

    const query = useGetNerModelsAvailability({
      client,
      modelIds: ['model-a'],
      enabled: true,
    }) as {
      queryFn: () => Promise<unknown>;
    };

    await expect(query.queryFn()).resolves.toEqual([]);
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

    const query = useGetNerModelsAvailability({
      client,
      modelIds: ['model-a'],
      enabled: true,
    }) as {
      queryFn: () => Promise<unknown>;
    };

    await expect(query.queryFn()).resolves.toEqual([]);
  });
});
