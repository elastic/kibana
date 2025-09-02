/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { userEvent } from '@testing-library/user-event';

import { TestProviders } from '../../../mock/test_providers/test_providers';
import { ConversationSettingsMenu } from './conversation_settings_menu';
import { CONVO_ASSISTANT_MENU } from './translations';
import {
  alertConvo,
  conversationWithContentReferences,
  customConvo,
  welcomeConvo,
} from '../../../mock/conversation';
const props = {
  conversations: {},
  onConversationDeleted: jest.fn(),
  onConversationSelected: jest.fn(),
  selectedConversation: welcomeConvo,
  isConversationOwner: true,
  refetchCurrentUserConversations: jest.fn(),
  setCurrentConversation: jest.fn(),
};
describe('ConversationSettingsMenu', () => {
  it('renders an accessible menu button icon', () => {
    render(
      <TestProviders>
        <ConversationSettingsMenu {...props} />
      </TestProviders>
    );

    expect(screen.getByRole('button', { name: CONVO_ASSISTANT_MENU })).toBeInTheDocument();
  });

  it('renders all menu items', async () => {
    render(
      <TestProviders>
        <ConversationSettingsMenu {...props} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('conversation-settings-menu'));
    expect(screen.getByTestId('anonymize-values')).toBeInTheDocument();
    expect(screen.getByTestId('show-citations')).toBeInTheDocument();
    expect(screen.getByTestId('clear-chat')).toBeInTheDocument();
  });

  it('renders menu items without clear-chat when empty convo', async () => {
    render(
      <TestProviders>
        <ConversationSettingsMenu {...props} selectedConversation={customConvo} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('conversation-settings-menu'));
    expect(screen.getByTestId('anonymize-values')).toBeInTheDocument();
    expect(screen.getByTestId('show-citations')).toBeInTheDocument();
    expect(screen.queryByTestId('clear-chat')).not.toBeInTheDocument();
  });

  it('triggers the reset conversation modal when clicking RESET_CONVERSATION', async () => {
    render(
      <TestProviders>
        <ConversationSettingsMenu {...props} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('conversation-settings-menu'));

    await userEvent.click(screen.getByTestId('clear-chat'));
    expect(screen.getByTestId('reset-conversation-modal')).toBeInTheDocument();
  });

  it('disables the anonymize values switch when no anonymized fields are present', async () => {
    render(
      <TestProviders>
        <ConversationSettingsMenu {...props} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('conversation-settings-menu'));

    const anonymizeSwitch = screen.getByTestId('anonymize-switch');
    expect(anonymizeSwitch).toBeDisabled();
  });

  it('enables the anonymize values switch when no anonymized fields are present', async () => {
    render(
      <TestProviders>
        <ConversationSettingsMenu {...props} selectedConversation={alertConvo} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('conversation-settings-menu'));

    const anonymizeSwitch = screen.getByTestId('anonymize-switch');
    expect(anonymizeSwitch).not.toBeDisabled();
  });

  it('disables the show citations switch when no citations are present', async () => {
    render(
      <TestProviders>
        <ConversationSettingsMenu {...props} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('conversation-settings-menu'));

    const citationsSwitch = screen.getByTestId('citations-switch');
    expect(citationsSwitch).toBeDisabled();
  });

  it('enables the show citations switch when no citations are present', async () => {
    render(
      <TestProviders>
        <ConversationSettingsMenu
          {...props}
          selectedConversation={conversationWithContentReferences}
        />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('conversation-settings-menu'));

    const citationsSwitch = screen.getByTestId('citations-switch');
    expect(citationsSwitch).not.toBeDisabled();
  });
});
