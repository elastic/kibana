/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import {
  waitForInferenceEndpoint,
  KNOWN_EIS_INFERENCE_ENDPOINT,
} from './wait_for_inference_endpoint';

describe('waitForInferenceEndpoint', () => {
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockLogger = loggingSystemMock.createLogger();
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns true immediately when endpoint is found on first attempt', async () => {
    mockEsClient.inference.get.mockResolvedValue({
      endpoints: [
        {
          inference_id: KNOWN_EIS_INFERENCE_ENDPOINT,
          task_type: 'chat_completion',
          service: 'elastic',
          service_settings: { model_id: 'rainbow-sprinkles' },
        },
      ],
    } as any);

    const resultPromise = waitForInferenceEndpoint(mockEsClient, mockLogger, 3, 1000);
    const result = await resultPromise;

    expect(result).toBe(true);
    expect(mockEsClient.inference.get).toHaveBeenCalledTimes(1);
    expect(mockEsClient.inference.get).toHaveBeenCalledWith({
      task_type: 'chat_completion',
      inference_id: KNOWN_EIS_INFERENCE_ENDPOINT,
    });
  });

  it('returns true when endpoint is found after retries', async () => {
    mockEsClient.inference.get
      .mockRejectedValueOnce(new Error('Not found'))
      .mockRejectedValueOnce(new Error('Not found'))
      .mockResolvedValueOnce({
        endpoints: [
          {
            inference_id: KNOWN_EIS_INFERENCE_ENDPOINT,
            task_type: 'chat_completion',
            service: 'elastic',
            service_settings: { model_id: 'rainbow-sprinkles' },
          },
        ],
      } as any);

    const resultPromise = waitForInferenceEndpoint(mockEsClient, mockLogger, 3, 1000);

    // Advance timers for the delays between retries
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(1000);

    const result = await resultPromise;

    expect(result).toBe(true);
    expect(mockEsClient.inference.get).toHaveBeenCalledTimes(3);
  });

  it('returns false when endpoint is not found after all retries', async () => {
    mockEsClient.inference.get.mockRejectedValue(new Error('Not found'));

    const resultPromise = waitForInferenceEndpoint(mockEsClient, mockLogger, 3, 1000);

    // Advance timers for the delays between retries
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(1000);

    const result = await resultPromise;

    expect(result).toBe(false);
    expect(mockEsClient.inference.get).toHaveBeenCalledTimes(3);
  });

  it('returns false when response has empty endpoints array', async () => {
    mockEsClient.inference.get.mockResolvedValue({
      endpoints: [],
    } as any);

    const resultPromise = waitForInferenceEndpoint(mockEsClient, mockLogger, 3, 1000);

    // Advance timers for the delays between retries
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(1000);

    const result = await resultPromise;

    expect(result).toBe(false);
    expect(mockEsClient.inference.get).toHaveBeenCalledTimes(3);
  });
});
