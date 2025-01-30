/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import { useSetupKnowledgeBase, UseSetupKnowledgeBaseParams } from './use_setup_knowledge_base';
import { postKnowledgeBase as _postKnowledgeBase } from './api';
import { useMutation as _useMutation } from '@tanstack/react-query';
import { API_VERSIONS } from '@kbn/elastic-assistant-common';

const postKnowledgeBaseMock = _postKnowledgeBase as jest.Mock;
const useMutationMock = _useMutation as jest.Mock;
jest.mock('./api', () => {
  const actual = jest.requireActual('./api');
  return {
    ...actual,
    postKnowledgeBase: jest.fn((...args) => actual.postKnowledgeBase(...args)),
  };
});
jest.mock('./use_knowledge_base_status');
jest.mock('./entries/use_knowledge_base_entries');

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
const defaultProps = { http, toasts } as unknown as UseSetupKnowledgeBaseParams;

describe('useSetupKnowledgeBase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should call api to post knowledge base setup', async () => {
    renderHook(() => useSetupKnowledgeBase(defaultProps));
    await waitFor(() => {
      expect(defaultProps.http.fetch).toHaveBeenCalledWith(
        '/api/security_ai_assistant/knowledge_base/',
        {
          method: 'POST',
          version: API_VERSIONS.public.v1,
        }
      );
      expect(toasts.addError).not.toHaveBeenCalled();
    });
  });
  it('should call api to post knowledge base setup with resource arg', async () => {
    useMutationMock.mockImplementation(async (queryKey, fn, opts) => {
      try {
        const res = await fn('something');
        return Promise.resolve(res);
      } catch (e) {
        opts.onError(e);
      }
    });

    renderHook(() => useSetupKnowledgeBase(defaultProps));
    await waitFor(() =>
      expect(defaultProps.http.fetch).toHaveBeenCalledWith(
        '/api/security_ai_assistant/knowledge_base/something',
        {
          method: 'POST',
          version: API_VERSIONS.public.v1,
        }
      )
    );
  });

  it('should return setup response', async () => {
    const { result } = renderHook(() => useSetupKnowledgeBase(defaultProps));
    await waitFor(() => expect(result.current).resolves.toStrictEqual(statusResponse));
  });

  it('should display error toast when api throws error', async () => {
    postKnowledgeBaseMock.mockRejectedValue(new Error('this is an error'));
    renderHook(() => useSetupKnowledgeBase(defaultProps));
    await waitFor(() => expect(toasts.addError).toHaveBeenCalled());
  });
});
