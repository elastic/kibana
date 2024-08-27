/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { usePerformEvaluation, UsePerformEvaluationParams } from './use_perform_evaluation';
import { postEvaluation as _postEvaluation } from './evaluate';
import { useMutation as _useMutation } from '@tanstack/react-query';
import { API_VERSIONS, PostEvaluateRequestBodyInput } from '@kbn/elastic-assistant-common';

const useMutationMock = _useMutation as jest.Mock;
const postEvaluationMock = _postEvaluation as jest.Mock;

jest.mock('./evaluate', () => {
  const actual = jest.requireActual('./evaluate');
  return {
    ...actual,
    postEvaluation: jest.fn((...args) => actual.postEvaluation(...args)),
  };
});

jest.mock('@tanstack/react-query', () => ({
  useMutation: jest.fn().mockImplementation(async (queryKey, fn, opts) => {
    try {
      const res = await fn();
      return Promise.resolve(res);
    } catch (e) {
      opts.onError(e);
    }
  }),
}));

const statusResponse = {
  success: true,
};

const http = {
  post: jest.fn().mockResolvedValue(statusResponse),
};
const toasts = {
  addError: jest.fn(),
};
const defaultProps = { http, toasts } as unknown as UsePerformEvaluationParams;

describe('usePerformEvaluation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should call api with undefined evalParams', async () => {
    await act(async () => {
      const { waitForNextUpdate } = renderHook(() => usePerformEvaluation(defaultProps));
      await waitForNextUpdate();

      expect(defaultProps.http.post).toHaveBeenCalledWith('/internal/elastic_assistant/evaluate', {
        body: undefined,
        headers: {
          'Content-Type': 'application/json',
        },
        signal: undefined,
        version: API_VERSIONS.internal.v1,
      });
      expect(toasts.addError).not.toHaveBeenCalled();
    });
  });
  it('Correctly passes and formats evalParams', async () => {
    useMutationMock.mockImplementation(async (queryKey, fn, opts) => {
      try {
        const evalParams: PostEvaluateRequestBodyInput = {
          graphs: ['d', 'c'],
          datasetName: 'kewl',
          connectorIds: ['h', 'g'],
          runName: 'test run',
        };
        const res = await fn(evalParams);
        return Promise.resolve(res);
      } catch (e) {
        opts.onError(e);
      }
    });
    await act(async () => {
      const { waitForNextUpdate } = renderHook(() => usePerformEvaluation(defaultProps));
      await waitForNextUpdate();

      expect(defaultProps.http.post).toHaveBeenCalledWith('/internal/elastic_assistant/evaluate', {
        body: '{"graphs":["d","c"],"datasetName":"kewl","connectorIds":["h","g"],"runName":"test run"}',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: undefined,
        version: API_VERSIONS.internal.v1,
      });
    });
  });

  it('should return evaluation response', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => usePerformEvaluation(defaultProps));
      await waitForNextUpdate();

      await expect(result.current).resolves.toStrictEqual(statusResponse);
    });
  });

  it('should display error toast when api throws error', async () => {
    postEvaluationMock.mockRejectedValue(new Error('this is an error'));
    await act(async () => {
      const { waitForNextUpdate } = renderHook(() => usePerformEvaluation(defaultProps));
      await waitForNextUpdate();

      expect(toasts.addError).toHaveBeenCalled();
    });
  });
});
