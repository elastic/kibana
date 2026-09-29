/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { waitFor, renderHook } from '@testing-library/react';
import type { UseSetupKnowledgeBaseParams } from './use_setup_knowledge_base';
import { useSetupKnowledgeBase } from './use_setup_knowledge_base';
import { postKnowledgeBase as _postKnowledgeBase } from './api';
import { useMutation as _useMutation } from '@kbn/react-query';
import { API_VERSIONS } from '@kbn/elastic-assistant-common';

const postKnowledgeBaseMock = _postKnowledgeBase as Mock;
const useMutationMock = _useMutation as Mock;
vi.mock('./api', async () => {
  const actual = (await vi.importActual('./api'));
  return {
    ...actual,
    postKnowledgeBase: vi.fn((...args) => actual.postKnowledgeBase(...args)),
  };
});
vi.mock('./use_knowledge_base_status');
vi.mock('./entries/use_knowledge_base_entries');

vi.mock('@kbn/react-query', () => {
      const mocked = {
      useMutation: vi.fn().mockImplementation(async (queryKey, fn, opts) => {
        try {
          const res = await fn();
          return Promise.resolve(res);
        } catch (e) {
          opts.onError(e);
        }
      }),
    };
      return { ...mocked, default: mocked };
    });

const statusResponse = {
  success: true,
};

const http = {
  fetch: vi.fn().mockResolvedValue(statusResponse),
};
const toasts = {
  addError: vi.fn(),
};
const defaultProps = { http, toasts } as unknown as UseSetupKnowledgeBaseParams;

describe('useSetupKnowledgeBase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
