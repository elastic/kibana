/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import { useKnowledgeBaseStatus, UseKnowledgeBaseStatusParams } from './use_knowledge_base_status';
import { getKnowledgeBaseStatus as _getKnowledgeBaseStatus } from './api';
import { API_VERSIONS } from '@kbn/elastic-assistant-common';

const getKnowledgeBaseStatusMock = _getKnowledgeBaseStatus as jest.Mock;

jest.mock('./api', () => {
  const actual = jest.requireActual('./api');
  return {
    ...actual,
    getKnowledgeBaseStatus: jest.fn((...args) => actual.getKnowledgeBaseStatus(...args)),
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

const statusResponse = {
  elser_exists: true,
  index_exists: true,
  pipeline_exists: true,
  security_labs_exists: true,
};

const http = {
  fetch: jest.fn().mockResolvedValue(statusResponse),
};
const toasts = {
  addError: jest.fn(),
};
const defaultProps = { http, toasts } as unknown as UseKnowledgeBaseStatusParams;
describe('useKnowledgeBaseStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
