/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useChatComplete } from './use_chat_complete';
import { useLoadConnectors } from '@kbn/inference-connectors';
import { useAssistantContext } from '../../../..';
import type { ChatCompleteResponse } from './post_chat_complete';
import { postChatComplete } from './post_chat_complete';

jest.mock('../../../..', () => ({
  useAssistantContext: jest.fn(),
}));

jest.mock('@kbn/inference-connectors', () => ({
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

  it('should load the connectors from the elastic_assistant feature by default', () => {
    renderHook(() => useChatComplete({ connectorId: 'mock-connector-id' }));

    expect(useLoadConnectors).toHaveBeenCalledWith(
      expect.objectContaining({ featureId: 'elastic_assistant' })
    );
  });

  it('should resolve the action type from the connectors of the given feature', async () => {
    (useLoadConnectors as jest.Mock).mockImplementation(({ featureId }) => ({
      data:
        featureId === 'custom_feature'
          ? [{ id: 'bedrock-connector-id', actionTypeId: '.bedrock' }]
          : [{ id: 'mock-connector-id', actionTypeId: '.gen-ai' }],
    }));
    (postChatComplete as jest.Mock).mockResolvedValue({});

    const { result } = renderHook(() =>
      useChatComplete({ connectorId: 'bedrock-connector-id', featureId: 'custom_feature' })
    );

    await act(async () => {
      await result.current.sendMessage({ message: 'test message', replacements: {} });
    });

    expect(useLoadConnectors).toHaveBeenCalledWith(
      expect.objectContaining({ featureId: 'custom_feature' })
    );
    expect(postChatComplete).toHaveBeenCalledWith(
      expect.objectContaining({ actionTypeId: '.bedrock', connectorId: 'bedrock-connector-id' })
    );
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
