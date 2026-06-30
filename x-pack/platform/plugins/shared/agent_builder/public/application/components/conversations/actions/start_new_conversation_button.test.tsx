/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { StartNewConversationButton } from './start_new_conversation_button';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useConversationStream } from '../../../hooks/use_conversation_stream';
import { useNavigation } from '../../../hooks/use_navigation';
import { useLastAgentId } from '../../../hooks/use_last_agent_id';

jest.mock('../../../context/conversation/conversation_context', () => ({
  useConversationContext: jest.fn(),
}));

jest.mock('../../../hooks/use_conversation_stream', () => ({
  useConversationStream: jest.fn(),
}));

jest.mock('../../../hooks/use_navigation', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../hooks/use_last_agent_id', () => ({
  useLastAgentId: jest.fn(),
}));

// EBT click props helper — irrelevant to these tests
jest.mock('@kbn/ebt-click', () => ({
  getEbtProps: jest.fn(() => ({})),
}));

const mockUseConversationContext = jest.mocked(useConversationContext);
const mockUseConversationStream = jest.mocked(useConversationStream);
const mockUseNavigation = jest.mocked(useNavigation);
const mockUseLastAgentId = jest.mocked(useLastAgentId);

const renderButton = () =>
  render(
    <IntlProvider locale="en">
      <StartNewConversationButton />
    </IntlProvider>
  );

describe('StartNewConversationButton', () => {
  let setConversationId: jest.Mock;
  let resetAttachments: jest.Mock;
  let removeError: jest.Mock;
  let navigateToAgentBuilderUrl: jest.Mock;

  beforeEach(() => {
    setConversationId = jest.fn();
    resetAttachments = jest.fn();
    removeError = jest.fn();
    navigateToAgentBuilderUrl = jest.fn();

    mockUseConversationStream.mockReturnValue({
      removeError,
    } as unknown as ReturnType<typeof useConversationStream>);

    mockUseNavigation.mockReturnValue({
      navigateToAgentBuilderUrl,
    } as unknown as ReturnType<typeof useNavigation>);

    mockUseLastAgentId.mockReturnValue('agent-1');
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
});
