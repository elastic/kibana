/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSendMessages } from '../../use_send_messages';
import { ConversationSelector } from '.';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../mock/test_providers/test_providers';
import { alertConvo, welcomeConvo } from '../../../mock/conversation';
// import { useConversation } from '../../use_conversation';

jest.mock('../../use_send_messages');
jest.mock('../../use_conversation');

const sendMessages = jest.fn();
const onConversationSelected = jest.fn();
const defaultProps = {
  isDisabled: false,
  onConversationSelected,
  selectedConversationId: 'Welcome',
};
const robotMessage = 'Response message from the robot';
describe('Conversation selector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSendMessages as jest.Mock).mockReturnValue({
      isLoading: false,
      sendMessages: sendMessages.mockReturnValue(robotMessage),
    });
  });
  it('has a test', () => {
    const { debug, getByTestId } = render(
      <TestProviders
        providerContext={{ getInitialConversations: () => [alertConvo, welcomeConvo] }}
      >
        <ConversationSelector {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('conversation-selector')).toBeInTheDocument();
    debug();
  });
});
