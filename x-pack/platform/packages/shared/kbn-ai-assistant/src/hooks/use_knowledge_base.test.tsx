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
    expect(result.current.isInstalling).toBe(false);
    expect(result.current.installError).toBeUndefined();
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

  it('install() handles error and sets installError state', async () => {
    const error = new Error('Setup failed');
    mockCallApi
      .mockResolvedValueOnce({ ready: false }) // Initial GET /status
      .mockRejectedValueOnce(error); // POST /setup fails

    const { result } = renderHook(() => useKnowledgeBase());

    // Trigger install
    act(() => {
      result.current.install();
    });

    // Wait for error state
    await waitFor(() => {
      expect(result.current.isInstalling).toBe(false);
      expect(result.current.installError).toBe(error);
    });

    // Verify the error toast was shown
    expect(mockAddError).toHaveBeenCalledWith(error, {
      title: expect.any(String),
    });
  });
});
