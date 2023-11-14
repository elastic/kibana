/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { useKnowledgeBaseStatus, UseKnowledgeBaseStatusParams } from './use_knowledge_base_status';
import { getKnowledgeBaseStatus as _getKnowledgeBaseStatus } from '../assistant/api';

const getKnowledgeBaseStatusMock = _getKnowledgeBaseStatus as jest.Mock;

jest.mock('../assistant/api', () => {
  const actual = jest.requireActual('../assistant/api');
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
  esql_exists: true,
  index_exists: true,
  pipeline_exists: true,
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
    await act(async () => {
      const { waitForNextUpdate } = renderHook(() => useKnowledgeBaseStatus(defaultProps));
      await waitForNextUpdate();

      expect(defaultProps.http.fetch).toHaveBeenCalledWith(
        '/internal/elastic_assistant/knowledge_base/',
        {
          method: 'GET',
        }
      );
      expect(toasts.addError).not.toHaveBeenCalled();
    });
  });
  it('should call api to get knowledge base status with resource arg', async () => {
    await act(async () => {
      const { waitForNextUpdate } = renderHook(() =>
        useKnowledgeBaseStatus({ ...defaultProps, resource: 'something' })
      );
      await waitForNextUpdate();

      expect(defaultProps.http.fetch).toHaveBeenCalledWith(
        '/internal/elastic_assistant/knowledge_base/something',
        {
          method: 'GET',
        }
      );
    });
  });

  it('should return status response', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useKnowledgeBaseStatus(defaultProps));
      await waitForNextUpdate();

      await expect(result.current).resolves.toStrictEqual(statusResponse);
    });
  });

  it('should display error toast when api throws error', async () => {
    getKnowledgeBaseStatusMock.mockRejectedValue(new Error('this is an error'));
    await act(async () => {
      const { waitForNextUpdate } = renderHook(() => useKnowledgeBaseStatus(defaultProps));
      await waitForNextUpdate();

      expect(toasts.addError).toHaveBeenCalled();
    });
  });
});
