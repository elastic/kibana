/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { waitFor, renderHook } from '@testing-library/react';
import type { UseKnowledgeBaseStatusParams } from './use_knowledge_base_status';
import { useKnowledgeBaseStatus } from './use_knowledge_base_status';
import { getKnowledgeBaseStatus as _getKnowledgeBaseStatus } from './api';
import { API_VERSIONS } from '@kbn/elastic-assistant-common';

const getKnowledgeBaseStatusMock = _getKnowledgeBaseStatus as Mock;

vi.mock('./api', async () => {
  const actual = (await vi.importActual('./api'));
  return {
    ...actual,
    getKnowledgeBaseStatus: vi.fn((...args) => actual.getKnowledgeBaseStatus(...args)),
  };
});

vi.mock('@kbn/react-query', () => {
      const mocked = {
      useQuery: vi.fn().mockImplementation(async (queryKey, fn, opts) => {
        try {
          const res = await fn({});
          return Promise.resolve(res);
        } catch (e) {
          opts.onError(e);
        }
      }),
    };
      return { ...mocked, default: mocked };
    });

const statusResponse = {
  elser_exists: true,
  security_labs_exists: true,
};

const http = {
  fetch: vi.fn().mockResolvedValue(statusResponse),
};
const toasts = {
  addError: vi.fn(),
};
const defaultProps = { http, toasts } as unknown as UseKnowledgeBaseStatusParams;
describe('useKnowledgeBaseStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('should call api to get knowledge base status without resource arg', async () => {
    renderHook(() => useKnowledgeBaseStatus(defaultProps));
    await waitFor(() => {
      expect(defaultProps.http.fetch).toHaveBeenCalledWith(
        '/api/security_ai_assistant/knowledge_base/',
        {
          method: 'GET',
          signal: undefined,
          version: API_VERSIONS.public.v1,
        }
      );
      expect(toasts.addError).not.toHaveBeenCalled();
    });
  });
  it('should call api to get knowledge base status with resource arg', async () => {
    renderHook(() => useKnowledgeBaseStatus({ ...defaultProps, resource: 'something' }));
    await waitFor(() =>
      expect(defaultProps.http.fetch).toHaveBeenCalledWith(
        '/api/security_ai_assistant/knowledge_base/something',
        {
          method: 'GET',
          signal: undefined,
          version: API_VERSIONS.public.v1,
        }
      )
    );
  });

  it('should return status response', async () => {
    const { result } = renderHook(() => useKnowledgeBaseStatus(defaultProps));
    await waitFor(() => expect(result.current).resolves.toStrictEqual(statusResponse));
  });

  it('should display error toast when api throws error', async () => {
    getKnowledgeBaseStatusMock.mockRejectedValue(new Error('this is an error'));
    renderHook(() => useKnowledgeBaseStatus(defaultProps));
    await waitFor(() => expect(toasts.addError).toHaveBeenCalled());
  });
});
