/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInferenceEndpointById } from './get_inference_endpoint_by_id';

describe('getInferenceEndpointById', () => {
  let mockTransportRequest: jest.Mock;
  let esClient: any;

  beforeEach(() => {
    mockTransportRequest = jest.fn();
    esClient = { transport: { request: mockTransportRequest } };
  });

  it('returns endpoint metadata', async () => {
    mockTransportRequest.mockResolvedValue({
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
    });
  });

  it('calls the correct ES API path', async () => {
    mockTransportRequest.mockResolvedValue({
      endpoints: [
        {
          inference_id: 'my-endpoint',
          task_type: 'chat_completion',
          service: 'openai',
        },
      ],
    });

    await getInferenceEndpointById({ inferenceId: 'my-endpoint', esClient });

    expect(mockTransportRequest).toHaveBeenCalledWith({
      method: 'GET',
      path: '/_inference/my-endpoint',
    });
  });

  it('throws if the endpoint is not found', async () => {
    mockTransportRequest.mockResolvedValue({ endpoints: [] });

    await expect(getInferenceEndpointById({ inferenceId: 'missing', esClient })).rejects.toThrow(
      "Inference endpoint 'missing' not found"
    );
  });

  it('propagates ES client errors', async () => {
    mockTransportRequest.mockRejectedValue(new Error('Connection refused'));

    await expect(
      getInferenceEndpointById({ inferenceId: 'my-endpoint', esClient })
    ).rejects.toThrow('Connection refused');
  });
});
