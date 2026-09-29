/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { StartNewConversationButton } from './start_new_conversation_button';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useNavigation } from '../../../hooks/use_navigation';
import { useLastAgentId } from '../../../hooks/use_last_agent_id';

vi.mock('../../../context/conversation/conversation_context', () => {
  const mocked = {
    useConversationContext: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_navigation', () => {
  const mocked = {
    useNavigation: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_last_agent_id', () => {
  const mocked = {
    useLastAgentId: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

// EBT click props helper — irrelevant to these tests
vi.mock('@kbn/ebt-click', () => {
  const mocked = {
    getEbtProps: vi.fn(() => ({})),
  };
  return { ...mocked, default: mocked };
});

const mockUseConversationContext = vi.mocked(useConversationContext);
const mockUseNavigation = vi.mocked(useNavigation);
const mockUseLastAgentId = vi.mocked(useLastAgentId);

const renderButton = () =>
  render(
    <IntlProvider locale="en">
      <StartNewConversationButton />
    </IntlProvider>
  );

describe('StartNewConversationButton', () => {
  let setConversationId: Mock;
  let resetAttachments: Mock;
  let navigateToAgentBuilderUrl: Mock;

  beforeEach(() => {
    setConversationId = vi.fn();
    resetAttachments = vi.fn();
    navigateToAgentBuilderUrl = vi.fn();

    mockUseNavigation.mockReturnValue({
      navigateToAgentBuilderUrl,
    } as unknown as ReturnType<typeof useNavigation>);

    mockUseLastAgentId.mockReturnValue({ agentId: 'agent-1', isReady: true });
  });

  it('calls resetAttachments and setConversationId when in embedded context', () => {
    mockUseConversationContext.mockReturnValue({
      isEmbeddedContext: true,
      setConversationId,
      resetAttachments,
      conversationActions: {} as never,
    });

    renderButton();
    fireEvent.click(screen.getByTestId('startNewConversationButton'));

    expect(resetAttachments).toHaveBeenCalledTimes(1);
    expect(setConversationId).toHaveBeenCalledWith(undefined);
    expect(navigateToAgentBuilderUrl).not.toHaveBeenCalled();
  });

  it('navigates instead of resetting when not in embedded context', () => {
    mockUseConversationContext.mockReturnValue({
      isEmbeddedContext: false,
      setConversationId,
      resetAttachments,
      conversationActions: {} as never,
    });

    renderButton();
    fireEvent.click(screen.getByTestId('startNewConversationButton'));

    expect(navigateToAgentBuilderUrl).toHaveBeenCalledTimes(1);
    expect(resetAttachments).not.toHaveBeenCalled();
    expect(setConversationId).not.toHaveBeenCalled();
  });

  it('is disabled while useLastAgentId is not ready in non-embedded context', () => {
    mockUseConversationContext.mockReturnValue({
      isEmbeddedContext: false,
      setConversationId,
      resetAttachments,
      conversationActions: {} as never,
    });
    mockUseLastAgentId.mockReturnValue({ agentId: 'agent-1', isReady: false });

    renderButton();
    const button = screen.getByTestId('startNewConversationButton');

    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(navigateToAgentBuilderUrl).not.toHaveBeenCalled();
  });

  it('stays enabled in embedded context even while useLastAgentId is not ready', () => {
    mockUseConversationContext.mockReturnValue({
      isEmbeddedContext: true,
      setConversationId,
      resetAttachments,
      conversationActions: {} as never,
    });
    mockUseLastAgentId.mockReturnValue({ agentId: 'agent-1', isReady: false });

    renderButton();
    const button = screen.getByTestId('startNewConversationButton');

    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(resetAttachments).toHaveBeenCalledTimes(1);
  });
});
