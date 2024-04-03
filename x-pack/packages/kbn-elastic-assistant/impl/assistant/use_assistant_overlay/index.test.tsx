/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import { useAssistantOverlay } from '.';

const mockUseAssistantContext = {
  registerPromptContext: jest.fn(),
  showAssistantOverlay: jest.fn(),
  unRegisterPromptContext: jest.fn(),
};
jest.mock('../../assistant_context', () => {
  const original = jest.requireActual('../../assistant_context');

  return {
    ...original,
    useAssistantContext: () => mockUseAssistantContext,
  };
});

describe('useAssistantOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls registerPromptContext with the expected context', async () => {
    const category = 'event';
    const description = 'test description';
    const getPromptContext = jest.fn(() => Promise.resolve('test data'));
    const id = 'test-id';
    const suggestedUserPrompt = 'test user prompt';
    const tooltip = 'test tooltip';

    renderHook(() =>
      useAssistantOverlay(
        category,
        null,
        description,
        getPromptContext,
        id,
        suggestedUserPrompt,
        tooltip
      )
    );

    expect(mockUseAssistantContext.registerPromptContext).toHaveBeenCalledWith({
      category,
      description,
      getPromptContext,
      id,
      suggestedUserPrompt,
      tooltip,
    });
  });

  it('calls unRegisterPromptContext on unmount', () => {
    const { unmount } = renderHook(() =>
      useAssistantOverlay(
        'event',
        null,
        'description',
        () => Promise.resolve('data'),
        'id',
        null,
        'tooltip'
      )
    );

    unmount();

    expect(mockUseAssistantContext.unRegisterPromptContext).toHaveBeenCalledWith('id');
  });

  it('calls `showAssistantOverlay` from the assistant context', () => {
    const { result } = renderHook(() =>
      useAssistantOverlay(
        'event',
        'conversation-id',
        'description',
        () => Promise.resolve('data'),
        'id',
        null,
        'tooltip'
      )
    );

    act(() => {
      result.current.showAssistantOverlay(true);
    });

    expect(mockUseAssistantContext.showAssistantOverlay).toHaveBeenCalledWith({
      showOverlay: true,
      promptContextId: 'id',
      conversationTitle: 'conversation-id',
    });
  });
});
