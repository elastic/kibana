/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInferenceEndpointById } from './get_inference_endpoint_by_id';

describe('getInferenceEndpointById', () => {
  let mockInferenceGet: jest.Mock;
  let esClient: any;

  beforeEach(() => {
    mockInferenceGet = jest.fn();
    esClient = { inference: { get: mockInferenceGet } };
  });

  it('returns endpoint metadata and calls correct endpoint', async () => {
    mockInferenceGet.mockResolvedValue({
      endpoints: [
        {
          inference_id: 'my-endpoint',
          task_type: 'chat_completion',
          service: 'openai',
          service_settings: { model_id: 'gpt-4o' },
        },
      ],
    });

    const result = await getInferenceEndpointById({
      inferenceId: 'my-endpoint',
      esClient,
    });

    expect(result).toEqual({
      inferenceId: 'my-endpoint',
      taskType: 'chat_completion',
      service: 'openai',
      serviceSettings: { model_id: 'gpt-4o' },
      metadata: {},
    });

    expect(mockInferenceGet).toHaveBeenCalledWith(
      { inference_id: 'my-endpoint' },
      expect.objectContaining({ ignore: [404] })
    );
  });

  it('throws a 404 error if the endpoint is not found', async () => {
    mockInferenceGet.mockResolvedValue({ endpoints: [] });

    await expect(getInferenceEndpointById({ inferenceId: 'missing', esClient })).rejects.toThrow(
      "Inference endpoint 'missing' not found"
    );

    await expect(getInferenceEndpointById({ inferenceId: 'missing', esClient })).rejects.toEqual(
      expect.objectContaining({
        meta: expect.objectContaining({ status: 404 }),
      })
    );
  });

  it('propagates ES client errors', async () => {
    mockInferenceGet.mockRejectedValue(new Error('Connection refused'));

    await expect(
      getInferenceEndpointById({ inferenceId: 'my-endpoint', esClient })
    ).rejects.toThrow('Connection refused');
  });
});
