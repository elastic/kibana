/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { welcomeConvo } from '../../mock/conversation';
import { SharedConversationCallout } from '.';
import type { DataStreamApis } from '../use_data_stream_apis';
import type { Conversation } from '../../..';
import { DEFAULT_ASSISTANT_NAMESPACE } from '../../..';
import { SHARED_CONVERSATION_CALLOUT } from '../../assistant_context/constants';

const mockRefetchCurrentUserConversations = jest.fn();
const mockSetCurrentConversation = jest.fn();

const testProps = {
  refetchCurrentUserConversations:
    mockRefetchCurrentUserConversations as DataStreamApis['refetchCurrentUserConversations'],
  selectedConversation: welcomeConvo as Conversation,
  setCurrentConversation: mockSetCurrentConversation as React.Dispatch<
    React.SetStateAction<Conversation | undefined>
  >,
};

describe('SharedConversationCallout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders the callout when localStorage is true', () => {
    render(
      <TestProviders>
        <SharedConversationCallout {...testProps} />
      </TestProviders>
    );
    expect(screen.getByTestId('sharedConversationCallout')).toBeInTheDocument();
  });

  it('hides the callout after dismissing', () => {
    render(
      <TestProviders>
        <SharedConversationCallout {...testProps} />
      </TestProviders>
    );
    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissButton);
    expect(screen.queryByTestId('sharedConversationCallout')).not.toBeInTheDocument();
  });

  it('does not render the callout if localStorage is false', () => {
    // Simulate previously dismissed
    const localStorageId = `${DEFAULT_ASSISTANT_NAMESPACE}.${SHARED_CONVERSATION_CALLOUT}.${welcomeConvo.id}`;
    localStorage.setItem(localStorageId, 'false');
    render(
      <TestProviders>
        <SharedConversationCallout {...testProps} />
      </TestProviders>
    );
    expect(screen.queryByTestId('sharedConversationCallout')).not.toBeInTheDocument();
  });

  it('renders nothing if selectedConversation is undefined', () => {
    render(
      <TestProviders>
        <SharedConversationCallout {...testProps} selectedConversation={undefined} />
      </TestProviders>
    );
    expect(screen.queryByTestId('sharedConversationCallout')).not.toBeInTheDocument();
  });
});
