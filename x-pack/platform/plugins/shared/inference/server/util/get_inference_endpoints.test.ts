/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInferenceEndpoints } from './get_inference_endpoints';

describe('getInferenceEndpoints', () => {
  let mockInferenceGet: jest.Mock;
  let esClient: any;

  beforeEach(() => {
    mockInferenceGet = jest.fn();
    esClient = { inference: { get: mockInferenceGet } };
  });

  it('returns all endpoints when no taskType filter is provided', async () => {
    mockInferenceGet.mockResolvedValue({
      endpoints: [
        {
          inference_id: 'ep-1',
          task_type: 'chat_completion',
          service: 'openai',
          service_settings: { model_id: 'gpt-4o' },
        },
        {
          inference_id: 'ep-2',
          task_type: 'text_embedding',
          service: 'elasticsearch',
        },
      ],
    });

    const result = await getInferenceEndpoints({ esClient });

    expect(result).toEqual([
      {
        inferenceId: 'ep-1',
        taskType: 'chat_completion',
        service: 'openai',
        serviceSettings: { model_id: 'gpt-4o' },
        metadata: {},
      },
      {
        inferenceId: 'ep-2',
        taskType: 'text_embedding',
        service: 'elasticsearch',
        serviceSettings: undefined,
        metadata: {},
      },
    ]);
  });

  it('filters by taskType when provided', async () => {
    mockInferenceGet.mockResolvedValue({
      endpoints: [
        {
          inference_id: 'ep-1',
          task_type: 'chat_completion',
          service: 'openai',
        },
        {
          inference_id: 'ep-2',
          task_type: 'text_embedding',
          service: 'elasticsearch',
        },
        {
          inference_id: 'ep-3',
          task_type: 'chat_completion',
          service: 'anthropic',
        },
      ],
    });

    const result = await getInferenceEndpoints({ esClient, taskType: 'chat_completion' });

    expect(result).toHaveLength(2);
    expect(result.map((e) => e.inferenceId)).toEqual(['ep-1', 'ep-3']);
  });

  it('returns empty array when no endpoints exist', async () => {
    mockInferenceGet.mockResolvedValue({ endpoints: [] });

    const result = await getInferenceEndpoints({ esClient });

    expect(result).toEqual([]);
  });

  it('calls esClient.inference.get', async () => {
    mockInferenceGet.mockResolvedValue({ endpoints: [] });

    await getInferenceEndpoints({ esClient });

    expect(mockInferenceGet).toHaveBeenCalledWith();
  });
});
