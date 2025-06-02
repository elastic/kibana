/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useInferenceEndpoints } from './use_inference_endpoints';
import { useAIAssistantAppService } from './use_ai_assistant_app_service';

jest.mock('./use_ai_assistant_app_service');

describe('useInferenceEndpoints', () => {
  const mockCallApi = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useAIAssistantAppService as jest.Mock).mockReturnValue({
      callApi: mockCallApi,
    });
  });

  it('fetches inference endpoints successfully on mount', async () => {
    const mockResponse = {
      endpoints: [
        { id: '1', name: 'Endpoint 1' },
        { id: '2', name: 'Endpoint 2' },
      ],
    };

    mockCallApi.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useInferenceEndpoints());

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockCallApi).toHaveBeenCalledWith(
      'GET /internal/observability_ai_assistant/kb/inference_endpoints',
      {
        signal: expect.any(AbortSignal),
      }
    );

    expect(result.current.inferenceEndpoints).toEqual(mockResponse.endpoints);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it('sets an error state on API errors', async () => {
    const error = new Error('Something went wrong');
    mockCallApi.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useInferenceEndpoints());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.inferenceEndpoints).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toEqual(error);
  });

  it('ignores AbortError and does not set error state', async () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    mockCallApi.mockRejectedValueOnce(abortError);

    const { result } = renderHook(() => useInferenceEndpoints());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.inferenceEndpoints).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });
});
