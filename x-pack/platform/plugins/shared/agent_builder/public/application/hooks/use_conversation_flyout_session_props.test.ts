/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY } from '@kbn/agent-builder-browser';
import { useConversationContext } from '../context/conversation/conversation_context';
import { useConversationFlyoutSessionProps } from './use_conversation_flyout_session_props';

jest.mock('../context/conversation/conversation_context', () => ({
  useConversationContext: jest.fn(),
}));

const mockUseConversationContext = jest.mocked(useConversationContext);

const mockContext = (isEmbeddedContext: boolean) =>
  mockUseConversationContext.mockReturnValue({
    isEmbeddedContext,
    conversationActions: {} as never,
  });

describe('useConversationFlyoutSessionProps', () => {
  it('stacks the flyout in the shared conversation session in full screen', () => {
    mockContext(false);

    const { result } = renderHook(() => useConversationFlyoutSessionProps('Trace'));

    expect(result.current).toEqual({
      session: 'start',
      historyKey: CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY,
      outsideClickCloses: false,
      flyoutMenuProps: { title: 'Trace' },
    });
  });

  it('returns no session props in the embeddable', () => {
    mockContext(true);

    const { result } = renderHook(() => useConversationFlyoutSessionProps('Trace'));

    expect(result.current).toEqual({});
  });

  it('keeps the same props object across re-renders', () => {
    mockContext(false);

    const { result, rerender } = renderHook(() => useConversationFlyoutSessionProps('Trace'));
    const first = result.current;
    rerender();

    expect(result.current).toBe(first);
  });
});
