/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { resolveInferenceEndpoint } from './resolve_inference_endpoint';

describe('resolveInferenceEndpoint', () => {
  let mockInferenceGet: jest.Mock;
  let esClient: any;

  beforeEach(() => {
    mockInferenceGet = jest.fn();
    esClient = { inference: { get: mockInferenceGet } };
  });

  it('returns endpoint metadata from the ES response', async () => {
    mockInferenceGet.mockResolvedValue({
      endpoints: [
        {
          inference_id: 'my-endpoint',
          task_type: 'chat_completion',
          service: 'openai',
          service_settings: {
            model_id: 'gpt-4o',
          },
        },
      ],
    });

    const result = await resolveInferenceEndpoint({
      inferenceId: 'my-endpoint',
      esClient,
    });

    expect(result).toEqual({
      inferenceId: 'my-endpoint',
      provider: 'openai',
      modelId: 'gpt-4o',
      taskType: 'chat_completion',
    });
  });

  it('falls back to model field when model_id is not present', async () => {
    mockInferenceGet.mockResolvedValue({
      endpoints: [
        {
          inference_id: 'my-endpoint',
          task_type: 'chat_completion',
          service: 'anthropic',
          service_settings: {
            model: 'claude-3-5-sonnet',
          },
        },
      ],
    });

    const result = await resolveInferenceEndpoint({
      inferenceId: 'my-endpoint',
      esClient,
    });

    expect(result).toEqual({
      inferenceId: 'my-endpoint',
      provider: 'anthropic',
      modelId: 'claude-3-5-sonnet',
      taskType: 'chat_completion',
    });
  });

  it('throws when the endpoint does not exist', async () => {
    mockInferenceGet.mockResolvedValue({ endpoints: [] });

    await expect(
      resolveInferenceEndpoint({
        inferenceId: 'missing-endpoint',
        esClient,
      })
    ).rejects.toThrow("Inference endpoint 'missing-endpoint' not found");
  });

  it('throws when the endpoint task type is not chat_completion', async () => {
    mockInferenceGet.mockResolvedValue({
      endpoints: [
        {
          inference_id: 'my-embedding-endpoint',
          task_type: 'text_embedding',
          service: 'openai',
        },
      ],
    });

    await expect(
      resolveInferenceEndpoint({
        inferenceId: 'my-embedding-endpoint',
        esClient,
      })
    ).rejects.toThrow("expected 'chat_completion'");
  });

  it('propagates errors from the ES client', async () => {
    mockInferenceGet.mockRejectedValue(new Error('Connection refused'));

    await expect(
      resolveInferenceEndpoint({
        inferenceId: 'bad-endpoint',
        esClient,
      })
    ).rejects.toThrow('Connection refused');
  });

  it('handles missing service_settings gracefully', async () => {
    mockInferenceGet.mockResolvedValue({
      endpoints: [
        {
          inference_id: 'my-endpoint',
          task_type: 'chat_completion',
          service: 'openai',
        },
      ],
    });

    const result = await resolveInferenceEndpoint({
      inferenceId: 'my-endpoint',
      esClient,
    });

    expect(result).toEqual({
      inferenceId: 'my-endpoint',
      provider: 'openai',
      modelId: undefined,
      taskType: 'chat_completion',
    });
  });
});
