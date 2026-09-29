/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook, act, waitFor } from '@testing-library/react';
import { useChatComplete } from './use_chat_complete';
import { useLoadConnectors } from '@kbn/inference-connectors';
import { useAssistantContext } from '../../../..';
import type { ChatCompleteResponse } from './post_chat_complete';
import { postChatComplete } from './post_chat_complete';

vi.mock('../../../..', () => {
  const mocked = {
    useAssistantContext: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/inference-connectors', () => {
  const mocked = {
    useLoadConnectors: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./post_chat_complete', () => {
  const mocked = {
    postChatComplete: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

describe('useChatComplete', () => {
  const mockAbortController = {
    abort: vi.fn(),
    signal: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.AbortController = vi.fn(() => mockAbortController) as unknown as typeof AbortController;

    (useAssistantContext as Mock).mockReturnValue({
      alertsIndexPattern: 'mock-alerts-index-pattern',
      http: {},
      traceOptions: {},
    });

    (useLoadConnectors as Mock).mockReturnValue({
      data: [{ id: 'mock-connector-id', actionTypeId: '.gen-ai' }],
    });
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useChatComplete({ connectorId: 'mock-connector-id' }));

    expect(result.current.isLoading).toBe(false);
    expect(typeof result.current.sendMessage).toBe('function');
    expect(typeof result.current.abortStream).toBe('function');
  });

  it('should call postChatComplete when sendMessage is invoked', async () => {
    const mockResponse = { data: 'mock-response' };
    (postChatComplete as Mock).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useChatComplete({ connectorId: 'mock-connector-id' }));

    await act(async () => {
      const response = await result.current.sendMessage({
        message: 'test message',
        replacements: {},
      });

      expect(postChatComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          actionTypeId: '.gen-ai',
          connectorId: 'mock-connector-id',
          message: 'test message',
        })
      );
      expect(response).toEqual(mockResponse);
    });
  });

  it('should handle abortStream correctly', () => {
    const { result } = renderHook(() => useChatComplete({ connectorId: 'mock-connector-id' }));

    act(() => {
      result.current.abortStream();
    });

    expect(mockAbortController.abort).toHaveBeenCalled();
  });

  it('should set isLoading to true while sending a message and false after completion', async () => {
    (postChatComplete as Mock).mockResolvedValue({});

    const { result } = renderHook(() => useChatComplete({ connectorId: 'mock-connector-id' }), {
      // TODO: fails with concurrent mode
      legacyRoot: true,
    });

    expect(result.current.isLoading).toBe(false);

    let sendMessagePromise: Promise<ChatCompleteResponse>;

    await act(async () => {
      sendMessagePromise = result.current.sendMessage({
        message: 'test message',
        replacements: {},
      });

      // Wait until isLoading becomes true
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });
    });

    await act(async () => {
      await sendMessagePromise;
    });

    expect(result.current.isLoading).toBe(false);
  });
});
