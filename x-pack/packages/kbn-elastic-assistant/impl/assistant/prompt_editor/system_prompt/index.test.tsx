/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { mockSystemPrompt } from '../../../mock/system_prompt';
import { SystemPrompt } from '.';
import { Conversation } from '../../../..';
import { DEFAULT_CONVERSATION_TITLE } from '../../use_conversation/translations';
import { TestProviders } from '../../../mock/test_providers/test_providers';
import { WELCOME_CONVERSATION } from '../../use_conversation/sample_conversations';
import { PromptResponse } from '@kbn/elastic-assistant-common';

const BASE_CONVERSATION: Conversation = {
  ...WELCOME_CONVERSATION,
  apiConfig: {
    connectorId: '123',
    actionTypeId: '.gen-ai',
    defaultSystemPromptId: mockSystemPrompt.id,
  },
};

const mockConversations = {
  [DEFAULT_CONVERSATION_TITLE]: BASE_CONVERSATION,
};

const mockSystemPrompts: PromptResponse[] = [mockSystemPrompt];

const mockUseAssistantContext = {
  conversations: mockConversations,
  setConversations: jest.fn(),
  setAllSystemPrompts: jest.fn(),
  allSystemPrompts: mockSystemPrompts,
};

jest.mock('../../../assistant_context', () => {
  const original = jest.requireActual('../../../assistant_context');
  return {
    ...original,
    useAssistantContext: jest.fn().mockImplementation(() => mockUseAssistantContext),
  };
});

const mockUseConversation = {
  setApiConfig: jest.fn(),
};
jest.mock('../../use_conversation', () => {
  const original = jest.requireActual('../../use_conversation');

  return {
    ...original,
    useConversation: () => mockUseConversation,
  };
});

describe('SystemPrompt', () => {
  const isSettingsModalVisible = false;
  const onSystemPromptSelectionChange = jest.fn();
  const setIsSettingsModalVisible = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    jest.mock('../../../assistant_context', () => {
      const original = jest.requireActual('../../../assistant_context');
      return {
        ...original,
        useAssistantContext: jest.fn().mockImplementation(() => mockUseAssistantContext),
      };
    });
  });

  describe('when currentSystemPromptId is undefined', () => {
    beforeEach(() => {
      render(
        <SystemPrompt
          currentSystemPromptId={undefined}
          isSettingsModalVisible={isSettingsModalVisible}
          onSystemPromptSelectionChange={onSystemPromptSelectionChange}
          setIsSettingsModalVisible={setIsSettingsModalVisible}
          allSystemPrompts={mockSystemPrompts}
        />
      );
    });

    it('renders the system prompt select', () => {
      expect(screen.getByTestId('selectSystemPrompt')).toBeInTheDocument();
    });

    it('does NOT render the edit button', () => {
      expect(screen.queryByTestId('edit')).not.toBeInTheDocument();
    });

    it('does NOT render the clear button', () => {
      expect(screen.queryByTestId('clearSystemPrompt')).not.toBeInTheDocument();
    });
  });

  describe('when currentSystemPromptId does not exist', () => {
    beforeEach(() => {
      render(
        <SystemPrompt
          currentSystemPromptId={'bad-id'}
          isSettingsModalVisible={isSettingsModalVisible}
          onSystemPromptSelectionChange={onSystemPromptSelectionChange}
          setIsSettingsModalVisible={setIsSettingsModalVisible}
          allSystemPrompts={mockSystemPrompts}
        />
      );
    });

    it('renders the system prompt select', () => {
      expect(screen.getByTestId('selectSystemPrompt')).toBeInTheDocument();
    });

    it('does NOT render the edit button', () => {
      expect(screen.queryByTestId('edit')).not.toBeInTheDocument();
    });

    it('does NOT render the clear button', () => {
      expect(screen.queryByTestId('clearSystemPrompt')).not.toBeInTheDocument();
    });
  });

  describe('when currentSystemPromptId exists', () => {
    beforeEach(() => {
      render(
        <SystemPrompt
          currentSystemPromptId={mockSystemPrompt.id}
          isSettingsModalVisible={isSettingsModalVisible}
          onSystemPromptSelectionChange={onSystemPromptSelectionChange}
          setIsSettingsModalVisible={setIsSettingsModalVisible}
          allSystemPrompts={mockSystemPrompts}
        />
      );
    });

    it('does render the system prompt select', () => {
      expect(screen.queryByTestId('selectSystemPrompt')).toBeInTheDocument();
    });

    it('renders the system prompt text', () => {
      expect(screen.getByTestId('systemPromptText')).toHaveTextContent(mockSystemPrompt.name);
    });

    it('renders the clear button', () => {
      expect(screen.getByTestId('clearSystemPrompt')).toBeInTheDocument();
    });
  });
  it('shows the system prompt select when system prompt text is clicked', () => {
    render(
      <TestProviders>
        <SystemPrompt
          currentSystemPromptId={mockSystemPrompt.id}
          isSettingsModalVisible={isSettingsModalVisible}
          onSystemPromptSelectionChange={onSystemPromptSelectionChange}
          setIsSettingsModalVisible={setIsSettingsModalVisible}
          allSystemPrompts={mockSystemPrompts}
        />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('systemPromptText'));

    expect(screen.getByTestId('selectSystemPrompt')).toBeInTheDocument();
  });
});
