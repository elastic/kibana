/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useKnowledgeBase } from './use_knowledge_base';
import { useKibana } from './use_kibana';
import { useAIAssistantAppService } from './use_ai_assistant_app_service';

jest.mock('./use_kibana');
jest.mock('./use_ai_assistant_app_service');
jest.mock('p-retry', () => {
  return (fn: () => Promise<any>) => fn();
});

describe('useKnowledgeBase', () => {
  const mockCallApi = jest.fn();
  const mockSyncSavedObjects = jest.fn();
  const mockAddError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useKibana as jest.Mock).mockReturnValue({
      services: {
        notifications: {
          toasts: {
            addError: mockAddError,
          },
        },
        ml: {
          mlApi: {
            savedObjects: {
              syncSavedObjects: mockSyncSavedObjects,
            },
          },
        },
      },
    });

    (useAIAssistantAppService as jest.Mock).mockReturnValue({
      callApi: mockCallApi,
    });
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useKnowledgeBase());

    expect(result.current.status.value).toBeUndefined();
  });

  it('calls GET /status once on mount', async () => {
    mockCallApi.mockResolvedValueOnce({ ready: false });

    const { result } = renderHook(() => useKnowledgeBase());

    expect(mockCallApi).toHaveBeenCalledWith('GET /internal/observability_ai_assistant/kb/status', {
      signal: expect.any(AbortSignal),
    });

    await waitFor(() => {
      expect(result.current.status.value).toEqual({ ready: false });
    });
  });

  it('calls install function', async () => {
    const successResponse = { ready: true };
    mockCallApi
      .mockResolvedValueOnce({ ready: false }) // Initial GET /status
      .mockResolvedValueOnce(successResponse); // POST /setup succeeds

    const { result } = renderHook(() => useKnowledgeBase());

    // Trigger setup
    act(() => {
      result.current.install('.elser-2-elasticsearch');
    });

    // Verify that the install was called
    await waitFor(() => {
      expect(mockCallApi).toHaveBeenCalledWith(
        'POST /internal/observability_ai_assistant/kb/setup',
        {
          params: {
            query: {
              inference_id: '.elser-2-elasticsearch',
            },
          },
          signal: null,
        }
      );
    });
  });

  it('shows an error toast on install failure', async () => {
    const error = new Error('setup failed');

    mockCallApi.mockResolvedValueOnce({ kbState: 'NOT_INSTALLED' }).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useKnowledgeBase());

    await act(async () => {
      await result.current.install('failing-id');
    });

    expect(mockAddError).toHaveBeenCalledWith(expect.any(Error), {
      title: expect.any(String),
    });
  });
});
