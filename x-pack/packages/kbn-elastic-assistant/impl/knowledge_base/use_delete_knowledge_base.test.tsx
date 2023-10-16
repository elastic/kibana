/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { useDeleteKnowledgeBase, UseDeleteKnowledgeBaseParams } from './use_delete_knowledge_base';
import { deleteKnowledgeBase as _deleteKnowledgeBase } from '../assistant/api';
import { useMutation as _useMutation } from '@tanstack/react-query';

const useMutationMock = _useMutation as jest.Mock;
const deleteKnowledgeBaseMock = _deleteKnowledgeBase as jest.Mock;

jest.mock('../assistant/api', () => {
  const actual = jest.requireActual('../assistant/api');
  return {
    ...actual,
    deleteKnowledgeBase: jest.fn((...args) => actual.deleteKnowledgeBase(...args)),
  };
});
jest.mock('./use_knowledge_base_status');

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
  fetch: jest.fn().mockResolvedValue(statusResponse),
};
const toasts = {
  addError: jest.fn(),
};
const defaultProps = { http, toasts } as unknown as UseDeleteKnowledgeBaseParams;

describe('useDeleteKnowledgeBase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should call api to delete knowledge base', async () => {
    await act(async () => {
      const { waitForNextUpdate } = renderHook(() => useDeleteKnowledgeBase(defaultProps));
      await waitForNextUpdate();

      expect(defaultProps.http.fetch).toHaveBeenCalledWith(
        '/internal/elastic_assistant/knowledge_base/',
        {
          method: 'DELETE',
        }
      );
      expect(toasts.addError).not.toHaveBeenCalled();
    });
  });
  it('should call api to delete knowledge base with resource arg', async () => {
    useMutationMock.mockImplementation(async (queryKey, fn, opts) => {
      try {
        const res = await fn('something');
        return Promise.resolve(res);
      } catch (e) {
        opts.onError(e);
      }
    });
    await act(async () => {
      const { waitForNextUpdate } = renderHook(() => useDeleteKnowledgeBase(defaultProps));
      await waitForNextUpdate();

      expect(defaultProps.http.fetch).toHaveBeenCalledWith(
        '/internal/elastic_assistant/knowledge_base/something',
        {
          method: 'DELETE',
        }
      );
    });
  });

  it('should return delete response', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useDeleteKnowledgeBase(defaultProps));
      await waitForNextUpdate();

      await expect(result.current).resolves.toStrictEqual(statusResponse);
    });
  });

  it('should display error toast when api throws error', async () => {
    deleteKnowledgeBaseMock.mockRejectedValue(new Error('this is an error'));
    await act(async () => {
      const { waitForNextUpdate } = renderHook(() => useDeleteKnowledgeBase(defaultProps));
      await waitForNextUpdate();

      expect(toasts.addError).toHaveBeenCalled();
    });
  });
});
