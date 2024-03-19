/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { AssistantHeader } from '.';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { alertConvo, emptyWelcomeConvo, welcomeConvo } from '../../mock/conversation';
import { useLoadConnectors } from '../../connectorland/use_load_connectors';
import { mockConnectors } from '../../mock/connectors';

const onConversationSelected = jest.fn();
const setCurrentConversation = jest.fn();
const mockConversations = {
  [alertConvo.title]: alertConvo,
  [welcomeConvo.title]: welcomeConvo,
};
const testProps = {
  currentConversation: welcomeConvo,
  title: 'Test Title',
  docLinks: {
    ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
    DOC_LINK_VERSION: 'master',
  },
  isDisabled: false,
  isSettingsModalVisible: false,
  onConversationSelected,
  onToggleShowAnonymizedValues: jest.fn(),
  selectedConversationId: emptyWelcomeConvo.id,
  setIsSettingsModalVisible: jest.fn(),
  setCurrentConversation,
  onConversationDeleted: jest.fn(),
  showAnonymizedValues: false,
  conversations: mockConversations,
  refetchConversationsState: jest.fn(),
};

jest.mock('../../connectorland/use_load_connectors', () => ({
  useLoadConnectors: jest.fn(() => {
    return {
      data: [],
      error: null,
      isSuccess: true,
    };
  }),
}));

(useLoadConnectors as jest.Mock).mockReturnValue({
  data: mockConnectors,
  error: null,
  isSuccess: true,
});
const mockSetApiConfig = alertConvo;
jest.mock('../use_conversation', () => ({
  useConversation: jest.fn(() => {
    return {
      setApiConfig: jest.fn().mockReturnValue(mockSetApiConfig),
    };
  }),
}));

describe('AssistantHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('showAnonymizedValues is not checked when currentConversation.replacements is null', () => {
    const { getByText, getByTestId } = render(<AssistantHeader {...testProps} />, {
      wrapper: TestProviders,
    });
    expect(getByText('Test Title')).toBeInTheDocument();
    expect(getByTestId('showAnonymizedValues')).toHaveAttribute('aria-checked', 'false');
  });

  it('showAnonymizedValues is not checked when currentConversation.replacements is empty', () => {
    const { getByText, getByTestId } = render(
      <AssistantHeader
        {...testProps}
        currentConversation={{ ...emptyWelcomeConvo, replacements: [] }}
      />,
      {
        wrapper: TestProviders,
      }
    );
    expect(getByText('Test Title')).toBeInTheDocument();
    expect(getByTestId('showAnonymizedValues')).toHaveAttribute('aria-checked', 'false');
  });

  it('showAnonymizedValues is not checked when currentConversation.replacements has values and showAnonymizedValues is false', () => {
    const { getByTestId } = render(
      <AssistantHeader {...testProps} currentConversation={alertConvo} />,
      {
        wrapper: TestProviders,
      }
    );
    expect(getByTestId('showAnonymizedValues')).toHaveAttribute('aria-checked', 'false');
  });

  it('showAnonymizedValues is checked when currentConversation.replacements has values and showAnonymizedValues is true', () => {
    const { getByTestId } = render(
      <AssistantHeader {...testProps} currentConversation={alertConvo} showAnonymizedValues />,
      {
        wrapper: TestProviders,
      }
    );
    expect(getByTestId('showAnonymizedValues')).toHaveAttribute('aria-checked', 'true');
  });

  it('Conversation is updated when connector change occurs', async () => {
    const { getByTestId } = render(<AssistantHeader {...testProps} />, {
      wrapper: TestProviders,
    });
    fireEvent.click(getByTestId('connectorSelectorPlaceholderButton'));
    fireEvent.click(getByTestId('connector-selector'));

    await act(async () => {
      fireEvent.click(getByTestId('connectorId'));
    });
    expect(setCurrentConversation).toHaveBeenCalledWith(alertConvo);
    expect(onConversationSelected).toHaveBeenCalledWith({
      cId: alertConvo.id,
      cTitle: alertConvo.title,
    });
  });
});
