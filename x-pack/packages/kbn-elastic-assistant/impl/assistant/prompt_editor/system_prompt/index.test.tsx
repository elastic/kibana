/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { mockSystemPrompt } from '../../../mock/system_prompt';
import { SystemPrompt } from '.';
import { Conversation } from '../../../..';
import { DEFAULT_CONVERSATION_TITLE } from '../../use_conversation/translations';
import { Prompt } from '../../types';
import { TestProviders } from '../../../mock/test_providers/test_providers';
import { TEST_IDS } from '../../constants';
import { useAssistantContext } from '../../../assistant_context';
import { WELCOME_CONVERSATION } from '../../use_conversation/sample_conversations';

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

const mockSystemPrompts: Prompt[] = [mockSystemPrompt];

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
  const editingSystemPromptId = undefined;
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

  describe('when conversation is undefined', () => {
    const conversation = undefined;

    beforeEach(() => {
      render(
        <SystemPrompt
          conversation={conversation}
          editingSystemPromptId={editingSystemPromptId}
          isSettingsModalVisible={isSettingsModalVisible}
          onSystemPromptSelectionChange={onSystemPromptSelectionChange}
          setIsSettingsModalVisible={setIsSettingsModalVisible}
          isFlyoutMode={false}
        />
      );
    });

    it('renders the system prompt select', () => {
      expect(screen.getByTestId('selectSystemPrompt')).toBeInTheDocument();
    });

    it('does NOT render the system prompt text', () => {
      expect(screen.queryByTestId('systemPromptText')).not.toBeInTheDocument();
    });

    it('does NOT render the edit button', () => {
      expect(screen.queryByTestId('edit')).not.toBeInTheDocument();
    });

    it('does NOT render the clear button', () => {
      expect(screen.queryByTestId('clear')).not.toBeInTheDocument();
    });
  });

  describe('when conversation is NOT null', () => {
    beforeEach(() => {
      render(
        <SystemPrompt
          conversation={BASE_CONVERSATION}
          editingSystemPromptId={BASE_CONVERSATION.id}
          isSettingsModalVisible={isSettingsModalVisible}
          onSystemPromptSelectionChange={onSystemPromptSelectionChange}
          setIsSettingsModalVisible={setIsSettingsModalVisible}
          isFlyoutMode={false}
        />
      );
    });

    it('does NOT render the system prompt select', () => {
      expect(screen.queryByTestId('selectSystemPrompt')).not.toBeInTheDocument();
    });

    it('renders the system prompt text', () => {
      expect(screen.getByTestId('systemPromptText')).toHaveTextContent(mockSystemPrompt.content);
    });

    it('renders the edit button', () => {
      expect(screen.getByTestId('edit')).toBeInTheDocument();
    });

    it('renders the clear button', () => {
      expect(screen.getByTestId('clear')).toBeInTheDocument();
    });
  });

  // TODO: To be implemented as part of the global settings tests instead of within the SystemPrompt component
  describe.skip('when a new prompt is saved', () => {
    it('should save new prompt correctly', async () => {
      const customPromptName = 'custom prompt';
      const customPromptText = 'custom prompt text';
      render(
        <TestProviders>
          <SystemPrompt
            conversation={BASE_CONVERSATION}
            editingSystemPromptId={editingSystemPromptId}
            isSettingsModalVisible={isSettingsModalVisible}
            onSystemPromptSelectionChange={onSystemPromptSelectionChange}
            setIsSettingsModalVisible={setIsSettingsModalVisible}
            isFlyoutMode={false}
          />
        </TestProviders>
      );
      userEvent.click(screen.getByTestId('edit'));
      userEvent.click(screen.getByTestId(TEST_IDS.ADD_SYSTEM_PROMPT));

      expect(screen.getByTestId(TEST_IDS.SYSTEM_PROMPT_MODAL.ID)).toBeVisible();

      userEvent.type(
        within(screen.getByTestId(TEST_IDS.SYSTEM_PROMPT_SELECTOR)).getByTestId('comboBoxInput'),
        `${customPromptName}[Enter]`
      );

      userEvent.type(
        screen.getByTestId(TEST_IDS.SYSTEM_PROMPT_MODAL.PROMPT_TEXT),
        customPromptText
      );

      userEvent.click(screen.getByTestId(TEST_IDS.SYSTEM_PROMPT_MODAL.SAVE));

      await waitFor(() => {
        expect(mockUseAssistantContext.setAllSystemPrompts).toHaveBeenCalledTimes(1);
        expect(mockUseAssistantContext.setAllSystemPrompts).toHaveBeenNthCalledWith(1, [
          mockSystemPrompt,
          {
            id: customPromptName,
            content: customPromptText,
            name: customPromptName,
            promptType: 'system',
          },
        ]);
        expect(screen.queryByTestId(TEST_IDS.SYSTEM_PROMPT_MODAL.ID)).not.toBeInTheDocument();
      });
    });

    it('should save new prompt as a default prompt', async () => {
      const customPromptName = 'custom prompt';
      const customPromptText = 'custom prompt text';
      render(
        <TestProviders>
          <SystemPrompt
            conversation={BASE_CONVERSATION}
            editingSystemPromptId={editingSystemPromptId}
            isSettingsModalVisible={isSettingsModalVisible}
            onSystemPromptSelectionChange={onSystemPromptSelectionChange}
            setIsSettingsModalVisible={setIsSettingsModalVisible}
            isFlyoutMode={false}
          />
        </TestProviders>
      );
      userEvent.click(screen.getByTestId('edit'));
      userEvent.click(screen.getByTestId(TEST_IDS.ADD_SYSTEM_PROMPT));

      expect(screen.getByTestId(TEST_IDS.SYSTEM_PROMPT_MODAL.ID)).toBeVisible();

      userEvent.type(
        within(screen.getByTestId(TEST_IDS.SYSTEM_PROMPT_SELECTOR)).getByTestId('comboBoxInput'),
        `${customPromptName}[Enter]`
      );

      userEvent.type(
        screen.getByTestId(TEST_IDS.SYSTEM_PROMPT_MODAL.PROMPT_TEXT),
        customPromptText
      );

      userEvent.click(
        screen.getByTestId(TEST_IDS.SYSTEM_PROMPT_MODAL.TOGGLE_ALL_DEFAULT_CONVERSATIONS)
      );

      await waitFor(() => {
        expect(
          screen.getByTestId(TEST_IDS.SYSTEM_PROMPT_MODAL.TOGGLE_ALL_DEFAULT_CONVERSATIONS)
        ).toBeChecked();
      });

      userEvent.click(screen.getByTestId(TEST_IDS.SYSTEM_PROMPT_MODAL.SAVE));

      await waitFor(() => {
        expect(mockUseAssistantContext.setAllSystemPrompts).toHaveBeenCalledTimes(1);
        expect(mockUseAssistantContext.setAllSystemPrompts).toHaveBeenNthCalledWith(1, [
          {
            ...mockSystemPrompt,
            isNewConversationDefault: false,
          },
          {
            id: customPromptName,
            content: customPromptText,
            name: customPromptName,
            promptType: 'system',
            isNewConversationDefault: true,
          },
        ]);
        expect(screen.queryByTestId(TEST_IDS.SYSTEM_PROMPT_MODAL.ID)).not.toBeInTheDocument();
      });
    });

    it('should save new prompt as a default prompt for selected conversations', async () => {
      const customPromptName = 'custom prompt';
      const customPromptText = 'custom prompt text';
      render(
        <TestProviders>
          <SystemPrompt
            conversation={BASE_CONVERSATION}
            editingSystemPromptId={editingSystemPromptId}
            isSettingsModalVisible={isSettingsModalVisible}
            onSystemPromptSelectionChange={onSystemPromptSelectionChange}
            setIsSettingsModalVisible={setIsSettingsModalVisible}
            isFlyoutMode={false}
          />
        </TestProviders>
      );
      userEvent.click(screen.getByTestId('edit'));
      userEvent.click(screen.getByTestId(TEST_IDS.ADD_SYSTEM_PROMPT));

      expect(screen.getByTestId(TEST_IDS.SYSTEM_PROMPT_MODAL.ID)).toBeVisible();

      userEvent.type(
        within(screen.getByTestId(TEST_IDS.SYSTEM_PROMPT_SELECTOR)).getByTestId('comboBoxInput'),
        `${customPromptName}[Enter]`
      );

      userEvent.type(
        screen.getByTestId(TEST_IDS.SYSTEM_PROMPT_MODAL.PROMPT_TEXT),
        customPromptText
      );

      userEvent.click(
        within(screen.getByTestId(TEST_IDS.CONVERSATIONS_MULTISELECTOR)).getByTestId(
          'comboBoxInput'
        )
      );

      await waitFor(() => {
        expect(
          screen.getByTestId(
            TEST_IDS.CONVERSATIONS_MULTISELECTOR_OPTION(DEFAULT_CONVERSATION_TITLE)
          )
        ).toBeVisible();
      });

      // select Default Conversation
      userEvent.click(
        screen.getByTestId(TEST_IDS.CONVERSATIONS_MULTISELECTOR_OPTION(DEFAULT_CONVERSATION_TITLE))
      );

      userEvent.click(screen.getByTestId(TEST_IDS.SYSTEM_PROMPT_MODAL.SAVE));

      await waitFor(() => {
        expect(screen.queryByTestId(TEST_IDS.SYSTEM_PROMPT_MODAL.ID)).not.toBeInTheDocument();
      });

      expect(mockUseAssistantContext.setAllSystemPrompts).toHaveBeenCalledTimes(1);
      expect(mockUseAssistantContext.setConversations).toHaveBeenCalledTimes(1);
      expect(mockUseAssistantContext.setConversations).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          [DEFAULT_CONVERSATION_TITLE]: expect.objectContaining({
            id: DEFAULT_CONVERSATION_TITLE,
            apiConfig: expect.objectContaining({
              defaultSystemPromptId: customPromptName,
            }),
          }),
        })
      );
    });

    it('should save new prompt correctly when prompt is removed from selected conversation', async () => {
      render(
        <TestProviders>
          <SystemPrompt
            conversation={BASE_CONVERSATION}
            editingSystemPromptId={editingSystemPromptId}
            isSettingsModalVisible={isSettingsModalVisible}
            onSystemPromptSelectionChange={onSystemPromptSelectionChange}
            setIsSettingsModalVisible={setIsSettingsModalVisible}
            isFlyoutMode={false}
          />
        </TestProviders>
      );
      userEvent.click(screen.getByTestId('edit'));
      userEvent.click(screen.getByTestId(TEST_IDS.ADD_SYSTEM_PROMPT));

      expect(screen.getByTestId(TEST_IDS.SYSTEM_PROMPT_MODAL.ID)).toBeVisible();

      userEvent.type(
        within(screen.getByTestId(TEST_IDS.SYSTEM_PROMPT_SELECTOR)).getByTestId('comboBoxInput'),
        `${mockSystemPrompt.name}[Enter]`
      );

      expect(
        within(screen.getByTestId(TEST_IDS.CONVERSATIONS_MULTISELECTOR)).getByText(
          DEFAULT_CONVERSATION_TITLE
        )
      ).toBeVisible();

      userEvent.click(
        within(screen.getByTestId(TEST_IDS.CONVERSATIONS_MULTISELECTOR)).getByTestId(
          'comboBoxClearButton'
        )
      );

      userEvent.click(screen.getByTestId(TEST_IDS.SYSTEM_PROMPT_MODAL.SAVE));

      await waitFor(() => {
        expect(screen.queryByTestId(TEST_IDS.SYSTEM_PROMPT_MODAL.ID)).toBeFalsy();
      });
      expect(mockUseAssistantContext.setAllSystemPrompts).toHaveBeenCalledTimes(1);
      expect(mockUseAssistantContext.setConversations).toHaveBeenCalledTimes(1);
      expect(mockUseAssistantContext.setConversations).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          [DEFAULT_CONVERSATION_TITLE]: expect.objectContaining({
            id: DEFAULT_CONVERSATION_TITLE,
            apiConfig: expect.objectContaining({
              defaultSystemPromptId: undefined,
            }),
          }),
        })
      );
    });
    it('should save new prompt correctly when prompt is removed from a conversation and linked to another conversation in a single transaction', async () => {
      const secondMockConversation: Conversation = {
        id: 'second',
        category: 'assistant',
        apiConfig: {
          actionTypeId: '.gen-ai',
          connectorId: '123',
          defaultSystemPromptId: undefined,
        },
        title: 'second',
        messages: [],
        replacements: {},
      };
      const localMockConversations: Record<string, Conversation> = {
        [DEFAULT_CONVERSATION_TITLE]: BASE_CONVERSATION,
        [secondMockConversation.title]: secondMockConversation,
      };

      const localMockUseAssistantContext = {
        conversations: localMockConversations,
        setConversations: jest.fn(),
        setAllSystemPrompts: jest.fn(),
        allSystemPrompts: mockSystemPrompts,
        hero: 'abc',
      };

      (useAssistantContext as jest.Mock).mockImplementation(() => ({
        ...localMockUseAssistantContext,
      }));

      render(
        <TestProviders>
          <SystemPrompt
            conversation={BASE_CONVERSATION}
            editingSystemPromptId={editingSystemPromptId}
            isSettingsModalVisible={isSettingsModalVisible}
            onSystemPromptSelectionChange={onSystemPromptSelectionChange}
            setIsSettingsModalVisible={setIsSettingsModalVisible}
            isFlyoutMode={false}
          />
        </TestProviders>
      );
      userEvent.click(screen.getByTestId('edit'));
      userEvent.click(screen.getByTestId(TEST_IDS.ADD_SYSTEM_PROMPT));

      expect(screen.getByTestId(TEST_IDS.SYSTEM_PROMPT_MODAL.ID)).toBeVisible();

      userEvent.type(
        within(screen.getByTestId(TEST_IDS.SYSTEM_PROMPT_SELECTOR)).getByTestId('comboBoxInput'),
        `${mockSystemPrompt.name}[Enter]`
      );

      expect(
        within(screen.getByTestId(TEST_IDS.CONVERSATIONS_MULTISELECTOR)).getByText(
          DEFAULT_CONVERSATION_TITLE
        )
      ).toBeVisible();

      // removed selected conversation
      userEvent.click(
        within(screen.getByTestId(TEST_IDS.CONVERSATIONS_MULTISELECTOR)).getByTestId(
          'comboBoxClearButton'
        )
      );

      // add `second` conversation
      userEvent.type(
        within(screen.getByTestId(TEST_IDS.CONVERSATIONS_MULTISELECTOR)).getByTestId(
          'comboBoxInput'
        ),
        'second[Enter]'
      );

      userEvent.click(screen.getByTestId(TEST_IDS.SYSTEM_PROMPT_MODAL.SAVE));

      await waitFor(() => {
        expect(screen.queryByTestId(TEST_IDS.SYSTEM_PROMPT_MODAL.ID)).toBeFalsy();
      });

      expect(localMockUseAssistantContext.setAllSystemPrompts).toHaveBeenCalledTimes(1);
      expect(localMockUseAssistantContext.setConversations).toHaveBeenCalledTimes(1);
      expect(localMockUseAssistantContext.setConversations).toHaveBeenNthCalledWith(1, {
        [DEFAULT_CONVERSATION_TITLE]: expect.objectContaining({
          id: DEFAULT_CONVERSATION_TITLE,
          apiConfig: expect.objectContaining({
            defaultSystemPromptId: undefined,
          }),
        }),
        [secondMockConversation.title]: {
          ...secondMockConversation,
          apiConfig: {
            connectorId: '123',
            defaultSystemPromptId: mockSystemPrompt.id,
          },
        },
      });
    });
  });

  it('shows the system prompt select when the edit button is clicked', () => {
    render(
      <TestProviders>
        <SystemPrompt
          conversation={BASE_CONVERSATION}
          editingSystemPromptId={BASE_CONVERSATION.id}
          isSettingsModalVisible={isSettingsModalVisible}
          onSystemPromptSelectionChange={onSystemPromptSelectionChange}
          setIsSettingsModalVisible={setIsSettingsModalVisible}
          isFlyoutMode={false}
        />
      </TestProviders>
    );

    userEvent.click(screen.getByTestId('edit'));

    expect(screen.getByTestId('selectSystemPrompt')).toBeInTheDocument();
  });

  it('shows the system prompt select when system prompt text is clicked', () => {
    render(
      <TestProviders>
        <SystemPrompt
          conversation={BASE_CONVERSATION}
          editingSystemPromptId={BASE_CONVERSATION.id}
          isSettingsModalVisible={isSettingsModalVisible}
          onSystemPromptSelectionChange={onSystemPromptSelectionChange}
          setIsSettingsModalVisible={setIsSettingsModalVisible}
          isFlyoutMode={false}
        />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('systemPromptText'));

    expect(screen.getByTestId('selectSystemPrompt')).toBeInTheDocument();
  });
});
