/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { AssistantHeader } from '.';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { alertConvo, welcomeConvo } from '../../mock/conversation';
import { useLoadConnectors } from '../../connectorland/use_load_connectors';
import { mockConnectors } from '../../mock/connectors';
import { CLOSE } from './translations';

const onConversationSelected = jest.fn();
const mockConversations = {
  [alertConvo.title]: alertConvo,
  [welcomeConvo.title]: welcomeConvo,
};
const testProps = {
  conversationsLoaded: true,
  selectedConversation: welcomeConvo,
  title: 'Test Title',
  docLinks: {
    ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
    DOC_LINK_VERSION: 'master',
  },
  isLoading: false,
  isDisabled: false,
  isSettingsModalVisible: false,
  onConversationSelected,
  onToggleShowAnonymizedValues: jest.fn(),
  setIsSettingsModalVisible: jest.fn(),
  onConversationCreate: jest.fn(),
  onChatCleared: jest.fn(),
  showAnonymizedValues: false,
  conversations: mockConversations,
  refetchCurrentUserConversations: jest.fn(),
  isAssistantEnabled: true,
  anonymizationFields: { total: 0, page: 1, perPage: 1000, data: [] },
  refetchAnonymizationFieldsResults: jest.fn(),
  allPrompts: [],
  contentReferencesVisible: true,
  setContentReferencesVisible: jest.fn(),
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

  it('Conversation is updated when connector change occurs', async () => {
    const { getByTestId } = render(<AssistantHeader {...testProps} />, {
      wrapper: TestProviders,
    });
    fireEvent.click(getByTestId('connector-selector'));

    await act(async () => {
      fireEvent.click(getByTestId('connectorId'));
    });
    expect(onConversationSelected).toHaveBeenCalledWith({
      cId: alertConvo.id,
      cTitle: alertConvo.title,
    });
  });

  it('renders an accessible close button icon', () => {
    const onCloseFlyout = jest.fn(); // required to render the close button

    render(<AssistantHeader {...testProps} onCloseFlyout={onCloseFlyout} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByRole('button', { name: CLOSE })).toBeInTheDocument();
  });
});
