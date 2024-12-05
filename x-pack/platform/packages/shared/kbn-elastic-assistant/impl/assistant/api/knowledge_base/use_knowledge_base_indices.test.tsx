/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import {
  useKnowledgeBaseIndices,
  UseKnowledgeBaseIndicesParams,
} from './use_knowledge_base_indices';
import { getKnowledgeBaseIndices as _getKnowledgeBaseIndices } from './api';

const getKnowledgeBaseIndicesMock = _getKnowledgeBaseIndices as jest.Mock;

jest.mock('./api', () => {
  const actual = jest.requireActual('./api');
  return {
    ...actual,
    getKnowledgeBaseIndices: jest.fn((...args) => actual.getKnowledgeBaseIndices(...args)),
  };
});

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn().mockImplementation(async (queryKey, fn, opts) => {
    try {
      const res = await fn({});
      return Promise.resolve(res);
    } catch (e) {
      opts.onError(e);
    }
  }),
}));

const indicesResponse = ['index-1', 'index-2', 'index-3'];

const http = {
  fetch: jest.fn().mockResolvedValue(indicesResponse),
};
const toasts = {
  addError: jest.fn(),
};
const defaultProps = { http, toasts } as unknown as UseKnowledgeBaseIndicesParams;
describe('useKnowledgeBaseIndices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call api to get knowledge base indices', async () => {
    await act(async () => {
      const { waitForNextUpdate } = renderHook(() => useKnowledgeBaseIndices(defaultProps));
      await waitForNextUpdate();

      expect(defaultProps.http.fetch).toHaveBeenCalledWith(
        '/internal/elastic_assistant/knowledge_base/_indices',
        {
          method: 'GET',
          signal: undefined,
          version: '1',
        }
      );
      expect(toasts.addError).not.toHaveBeenCalled();
    });
  });

  it('should return indices response', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useKnowledgeBaseIndices(defaultProps));
      await waitForNextUpdate();

      await expect(result.current).resolves.toStrictEqual(indicesResponse);
    });
  });

  it('should display error toast when api throws error', async () => {
    getKnowledgeBaseIndicesMock.mockRejectedValue(new Error('this is an error'));
    await act(async () => {
      const { waitForNextUpdate } = renderHook(() => useKnowledgeBaseIndices(defaultProps));
      await waitForNextUpdate();

      expect(toasts.addError).toHaveBeenCalled();
    });
  });
});
