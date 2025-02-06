/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import {
  useDeleteKnowledgeBaseEntries,
  UseDeleteKnowledgeEntriesParams,
} from './use_delete_knowledge_base_entries';
import { useInvalidateKnowledgeBaseEntries } from './use_knowledge_base_entries';
import { API_VERSIONS } from '@kbn/elastic-assistant-common';

jest.mock('./use_knowledge_base_entries', () => ({
  useInvalidateKnowledgeBaseEntries: jest.fn(),
}));

jest.mock('@tanstack/react-query', () => ({
  useMutation: jest.fn().mockImplementation((queryKey, fn, opts) => {
    return {
      mutate: async (variables: unknown) => {
        try {
          const res = await fn(variables);
          opts.onSuccess(res);
          opts.onSettled();
          return Promise.resolve(res);
        } catch (e) {
          opts.onError(e);
          opts.onSettled();
        }
      },
    };
  }),
}));

const http = {
  post: jest.fn(),
};
const toasts = {
  addError: jest.fn(),
};
const defaultProps = { http, toasts } as unknown as UseDeleteKnowledgeEntriesParams;
const defaultArgs = { ids: ['1'], query: '' };

describe('useDeleteKnowledgeBaseEntries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call the mutation function on success', async () => {
    const invalidateKnowledgeBaseEntries = jest.fn();
    (useInvalidateKnowledgeBaseEntries as jest.Mock).mockReturnValue(
      invalidateKnowledgeBaseEntries
    );
    http.post.mockResolvedValue({});

    const { result } = renderHook(() => useDeleteKnowledgeBaseEntries(defaultProps));

    await act(async () => {
      // @ts-ignore
      await result.current.mutate(defaultArgs);
    });

    expect(http.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ delete: { query: '', ids: ['1'] } }),
        version: API_VERSIONS.public.v1,
      })
    );
    expect(invalidateKnowledgeBaseEntries).toHaveBeenCalled();
  });

  it('should call the onError function on error', async () => {
    const error = new Error('Test Error');
    http.post.mockRejectedValue(error);

    const { result } = renderHook(() => useDeleteKnowledgeBaseEntries(defaultProps));

    await act(async () => {
      // @ts-ignore
      await result.current.mutate(defaultArgs);
    });

    expect(toasts.addError).toHaveBeenCalledWith(error, {
      title: expect.any(String),
    });
  });

  it('should call the onSettled function after mutation', async () => {
    const invalidateKnowledgeBaseEntries = jest.fn();
    (useInvalidateKnowledgeBaseEntries as jest.Mock).mockReturnValue(
      invalidateKnowledgeBaseEntries
    );
    http.post.mockResolvedValue({});

    const { result } = renderHook(() => useDeleteKnowledgeBaseEntries(defaultProps));

    await act(async () => {
      // @ts-ignore
      await result.current.mutate(defaultArgs);
    });

    expect(invalidateKnowledgeBaseEntries).toHaveBeenCalled();
  });
});
