/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AssistantBody } from '.';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { ConversationSharedState } from '@kbn/elastic-assistant-common';
import { welcomeConvo } from '../../mock/conversation';
import type { HttpSetup } from '@kbn/core-http-browser';

const baseProps = {
  allSystemPrompts: [],
  comments: <div data-test-subj="comments">{'Test comments'}</div>,
  conversationSharedState: ConversationSharedState.PRIVATE,
  currentConversation: welcomeConvo,
  currentSystemPromptId: undefined,
  handleOnConversationSelected: jest.fn(),
  setCurrentSystemPromptId: jest.fn(),
  http: { get: jest.fn(), basePath: { get: jest.fn() } } as unknown as HttpSetup,
  isAssistantEnabled: true,
  isConversationOwner: true,
  isLoading: false,
  isSettingsModalVisible: false,
  isWelcomeSetup: false,
  setIsSettingsModalVisible: jest.fn(),
  setUserPrompt: jest.fn(),
};

describe('AssistantBody', () => {
  it('renders license CTA when assistant is disabled', () => {
    render(
      <TestProviders>
        <AssistantBody {...baseProps} isAssistantEnabled={false} />
      </TestProviders>
    );
    expect(screen.getByTestId('upgradeLicenseCallToAction')).toBeInTheDocument();
  });

  it('shows loading indicator when isLoading is true', () => {
    render(
      <TestProviders>
        <AssistantBody {...baseProps} isLoading={true} />
      </TestProviders>
    );
    expect(screen.getByTestId('animatedLogo')).toBeInTheDocument();
  });

  it('shows welcome setup when isWelcomeSetup is true', () => {
    render(
      <TestProviders>
        <AssistantBody {...baseProps} isWelcomeSetup={true} />
      </TestProviders>
    );
    expect(screen.getByTestId('welcome-setup')).toBeInTheDocument();
  });

  it('shows empty conversation when currentConversation is empty', () => {
    render(
      <TestProviders>
        <AssistantBody
          {...baseProps}
          currentConversation={{ ...welcomeConvo, messages: [], id: 'test-id' }}
        />
      </TestProviders>
    );
    expect(screen.getByTestId('emptyConvo')).toBeInTheDocument();
  });

  it('shows comments when currentConversation has messages', () => {
    render(
      <TestProviders>
        <AssistantBody {...baseProps} />
      </TestProviders>
    );
    expect(screen.getByTestId('comments')).toBeInTheDocument();
  });

  it('shows owner callout when conversation is shared and user is owner', () => {
    render(
      <TestProviders>
        <AssistantBody {...baseProps} conversationSharedState={ConversationSharedState.SHARED} />
      </TestProviders>
    );
    expect(screen.getByTestId('ownerSharedConversationCallout')).toBeInTheDocument();
  });

  it('Does not shows owner callout when conversation is shared and user is not owner', () => {
    render(
      <TestProviders>
        <AssistantBody
          {...baseProps}
          isConversationOwner={false}
          conversationSharedState={ConversationSharedState.SHARED}
        />
      </TestProviders>
    );
    expect(screen.queryByTestId('ownerSharedConversationCallout')).not.toBeInTheDocument();
  });

  it('shows disclaimer for empty conversation', () => {
    render(
      <TestProviders>
        <AssistantBody
          {...baseProps}
          currentConversation={{ ...welcomeConvo, messages: [], id: 'test-id' }}
        />
      </TestProviders>
    );
    expect(screen.getByTestId('assistant-disclaimer')).toBeInTheDocument();
  });
});
