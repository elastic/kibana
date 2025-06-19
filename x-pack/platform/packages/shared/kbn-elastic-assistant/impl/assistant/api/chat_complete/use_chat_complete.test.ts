/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useChatComplete } from './use_chat_complete';
import { useAssistantContext, useLoadConnectors } from '../../../..';
import { postChatComplete, ChatCompleteResponse } from './post_chat_complete';

jest.mock('../../../..', () => ({
  useAssistantContext: jest.fn(),
  useLoadConnectors: jest.fn(),
}));

jest.mock('./post_chat_complete', () => ({
  postChatComplete: jest.fn(),
}));

describe('useChatComplete', () => {
  const mockAbortController = {
    abort: jest.fn(),
    signal: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.AbortController = jest.fn(
      () => mockAbortController
    ) as unknown as typeof AbortController;

    (useAssistantContext as jest.Mock).mockReturnValue({
      alertsIndexPattern: 'mock-alerts-index-pattern',
      http: {},
      traceOptions: {},
    });

    (useLoadConnectors as jest.Mock).mockReturnValue({
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
    (postChatComplete as jest.Mock).mockResolvedValue(mockResponse);

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
    (postChatComplete as jest.Mock).mockResolvedValue({});

    const { result } = renderHook(() => useChatComplete({ connectorId: 'mock-connector-id' }), {
      // TODO: fails with concurrent mode
      legacyRoot: true,
    });

    expect(result.current.isLoading).toBe(false);

    let sendMessagePromise: Promise<ChatCompleteResponse>;

    act(() => {
      result.current.sendMessage({ message: 'test message', replacements: {} });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    await act(async () => {
      await sendMessagePromise;
    });

    expect(result.current.isLoading).toBe(false);
  });
});
