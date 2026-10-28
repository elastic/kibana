/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { CHAT_MESSAGE_MAX_LENGTH } from '@kbn/agent-builder-common';
import { ConversationInput } from './conversation_input';
import { useConversationStream } from '../../../hooks/use_conversation_stream';
import { useAgentBuilderAgents } from '../../../hooks/agents/use_agents';
import { useValidateAgentId } from '../../../hooks/agents/use_validate_agent_id';
import { useAgentModel } from '../../../hooks/agents/use_agent_model';
import { useAgentBuilderAgentById } from '../../../hooks/agents/use_agent_by_id';
import {
  useAgentId,
  useConversationReadOnly,
  useConversationTitle,
  useHasActiveConversation,
  useIsSharedConversation,
} from '../../../hooks/use_conversation';
import { useExperimentalFeatures } from '../../../hooks/use_experimental_features';
import { useIsAwaitingPrompt } from '../../../hooks/use_is_awaiting_prompt';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useSubmitMessage } from '../../../hooks/use_submit_message';
import { useSendUserMessage } from '../../../hooks/use_send_user_message';
import { useToasts } from '../../../hooks/use_toasts';
import { useMessageEditor } from './message_editor';
import { CommandId } from './message_editor/command_menu/types';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { ChatTriggerMode } from '../../../../../common/http_api/chat';
import { useInputDraft } from '../../../hooks/use_input_draft';

jest.mock('../../../hooks/use_conversation_stream', () => ({
  useConversationStream: jest.fn(),
}));
jest.mock('../../../hooks/agents/use_agents', () => ({
  useAgentBuilderAgents: jest.fn(),
}));
jest.mock('../../../hooks/agents/use_validate_agent_id', () => ({
  useValidateAgentId: jest.fn(),
}));
jest.mock('../../../hooks/agents/use_agent_model', () => ({
  useAgentModel: jest.fn(),
}));
jest.mock('../../../hooks/agents/use_agent_by_id', () => ({
  useAgentBuilderAgentById: jest.fn(),
}));
jest.mock('../../../hooks/use_conversation', () => ({
  useAgentId: jest.fn(),
  useConversationReadOnly: jest.fn(),
  useConversationTitle: jest.fn(),
  useHasActiveConversation: jest.fn(),
  useIsSharedConversation: jest.fn(),
}));
jest.mock('../../../hooks/use_experimental_features', () => ({
  useExperimentalFeatures: jest.fn(),
}));
jest.mock('../../../hooks/use_is_awaiting_prompt', () => ({
  useIsAwaitingPrompt: jest.fn(),
}));
jest.mock('../../../context/conversation/use_conversation_id', () => ({
  useConversationId: jest.fn(),
}));
jest.mock('../../../context/conversation/conversation_context', () => ({
  useConversationContext: jest.fn(),
}));
jest.mock('../../../hooks/use_submit_message', () => ({
  useSubmitMessage: jest.fn(),
}));
jest.mock('../../../hooks/use_send_user_message', () => ({
  useSendUserMessage: jest.fn(),
}));
jest.mock('../../../hooks/use_toasts', () => ({
  useToasts: jest.fn(),
}));
const mockOnEditorRender = jest.fn();
jest.mock('./message_editor', () => ({
  useMessageEditor: jest.fn(),
  MessageEditor: ({ onSubmit }: { onSubmit: () => void }) => {
    mockOnEditorRender();
    return (
      <button data-test-subj="mock-message-editor-submit" type="button" onClick={onSubmit}>
        submit
      </button>
    );
  },
  CommandBadgeSerializationError: class extends Error {},
}));
jest.mock('./input_actions/connector_selector', () => ({
  ConnectorSelector: () => <div data-test-subj="mockConnectorSelector" />,
}));
jest.mock('@kbn/ebt-click', () => ({ getEbtProps: () => ({}) }));
jest.mock('./input_actions', () => ({
  InputActions: ({
    showTriggerModeSelector,
    triggerMode,
    onTriggerModeChange,
    onMentionClick,
  }: {
    showTriggerModeSelector: boolean;
    triggerMode: string;
    onTriggerModeChange: (mode: string) => void;
    onMentionClick?: () => void;
  }) => (
    <>
      {onMentionClick && (
        <button type="button" data-test-subj="mock-mention-button" onClick={onMentionClick} />
      )}
      {showTriggerModeSelector && (
        <select
          data-test-subj="mock-trigger-mode-selector"
          value={triggerMode}
          onChange={(event) => onTriggerModeChange(event.target.value)}
        >
          <option value="always">Ask agent</option>
          <option value="never">Post to team</option>
        </select>
      )}
    </>
  ),
}));
jest.mock('./attachment_pill', () => ({
  AttachmentPill: ({
    attachment,
    onRemoveAttachment,
  }: {
    attachment: { id: string };
    onRemoveAttachment?: () => void;
  }) => (
    <button
      data-test-subj={`mock-remove-attachment-${attachment.id}`}
      type="button"
      onClick={onRemoveAttachment}
    />
  ),
}));
jest.mock('./attachment_group_pill', () => ({
  AttachmentGroupPill: () => null,
}));
jest.mock('../../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: jest.fn(),
}));
jest.mock('../../../hooks/use_current_user', () => ({
  useCurrentUser: jest
    .fn()
    .mockReturnValue({ currentUser: { user: { username: 'test-user' } }, isLoading: false }),
}));
jest.mock('../../../hooks/use_input_draft', () => ({
  useInputDraft: jest
    .fn()
    .mockReturnValue({ draft: null, saveDraft: jest.fn(), clearDraft: jest.fn() }),
}));
jest.mock('../../../context/active_space_context', () => ({
  useActiveSpaceId: jest.fn().mockReturnValue('default'),
}));
jest.mock('@kbn/agent-builder-browser', () => ({
  CONVERSATION_INPUT_SHELL_RADIUS: 16,
  ConversationInputShell: ({
    children,
    isDisabled,
    'data-test-subj': testSubj,
  }: {
    children: React.ReactNode;
    isDisabled?: boolean;
    'data-test-subj'?: string;
  }) => (
    <div data-test-subj={testSubj} aria-disabled={isDisabled}>
      {children}
    </div>
  ),
  formatAgentBuilderErrorMessage: (error: Error) => error.message,
}));

const mockedUseConversationStream = jest.mocked(useConversationStream);
const mockedUseAgentBuilderAgents = jest.mocked(useAgentBuilderAgents);
const mockedUseValidateAgentId = jest.mocked(useValidateAgentId);
const mockedUseAgentModel = jest.mocked(useAgentModel);
const mockedUseAgentBuilderAgentById = jest.mocked(useAgentBuilderAgentById);
const mockedUseAgentId = jest.mocked(useAgentId);
const mockedUseConversationReadOnly = jest.mocked(useConversationReadOnly);
const mockedUseConversationTitle = jest.mocked(useConversationTitle);
const mockedUseHasActiveConversation = jest.mocked(useHasActiveConversation);
const mockedUseIsSharedConversation = jest.mocked(useIsSharedConversation);
const mockedUseExperimentalFeatures = jest.mocked(useExperimentalFeatures);
const mockedUseIsAwaitingPrompt = jest.mocked(useIsAwaitingPrompt);
const mockedUseConversationId = jest.mocked(useConversationId);
const mockedUseConversationContext = jest.mocked(useConversationContext);
const mockedUseSubmitMessage = jest.mocked(useSubmitMessage);
const mockedUseSendUserMessage = jest.mocked(useSendUserMessage);
const mockedUseToasts = jest.mocked(useToasts);
const mockedUseMessageEditor = jest.mocked(useMessageEditor);
const mockedUseAgentBuilderServices = jest.mocked(useAgentBuilderServices);
const mockedUseInputDraft = jest.mocked(useInputDraft);

const submitMessage = jest.fn();
const sendUserMessage = jest.fn();
const addErrorToast = jest.fn();
const editorController = {
  focus: jest.fn(),
  getContent: jest.fn().mockReturnValue('hello agent'),
  setContent: jest.fn(),
  clear: jest.fn(),
  isEmpty: false,
  getPlaceholderNames: jest.fn(() => []),
  removePlaceholderByName: jest.fn(),
  insertText: jest.fn(),
};

const renderInput = (ui: React.ReactElement) => render(ui, { wrapper: EuiProvider });

/**
 * `ConversationInput` is memoized, so `rerender` with the same props is skipped. A new callback
 * makes it render again and read the changed hook mocks, as a real hook update would.
 */
const rerenderInput = (rerender: (ui: React.ReactElement) => void) =>
  rerender(<ConversationInput onEditorFocus={jest.fn()} />);

// ConversationInput replaces this bar with a fake selector. These cases render the real one.
const { InputActions } = jest.requireActual('./input_actions') as typeof import('./input_actions');

describe('ConversationInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    editorController.getContent.mockReturnValue('hello agent');
    editorController.isEmpty = false;

    mockedUseConversationStream.mockReturnValue({
      pendingMessage: undefined,
      isResuming: false,
      isResponseLoading: false,
    } as never);
    mockedUseAgentBuilderAgents.mockReturnValue({ isFetched: true } as never);
    mockedUseValidateAgentId.mockReturnValue(((agentId?: string): agentId is string =>
      Boolean(agentId)) as never);
    mockedUseAgentModel.mockReturnValue({ isLoading: false, isLocked: false });
    mockedUseAgentBuilderAgentById.mockReturnValue({ agent: undefined, isLoading: false } as never);
    mockedUseAgentId.mockReturnValue('elastic-ai-agent');
    mockedUseConversationReadOnly.mockReturnValue({ isReadOnly: false, isLoading: false });
    mockedUseConversationTitle.mockReturnValue({ title: '', isLoading: false } as never);
    mockedUseHasActiveConversation.mockReturnValue(false);
    mockedUseIsSharedConversation.mockReturnValue(false);
    mockedUseExperimentalFeatures.mockReturnValue(false);
    mockedUseIsAwaitingPrompt.mockReturnValue(false);
    mockedUseConversationId.mockReturnValue(undefined);
    mockedUseConversationContext.mockReturnValue({
      attachments: [],
      upsertAttachments: jest.fn(),
      removeAttachment: jest.fn(),
      resetAttachments: jest.fn(),
      isEmbeddedContext: false,
      conversationActions: {} as never,
    });
    mockedUseAgentBuilderServices.mockReturnValue({
      filesClient: {
        create: jest.fn().mockResolvedValue({ file: { id: 'test-file-id' } }),
        upload: jest.fn().mockResolvedValue(undefined),
      },
    } as never);
    mockedUseSubmitMessage.mockReturnValue({ submitMessage, isCreatingConversation: false });
    sendUserMessage.mockResolvedValue({ id: 'conv-1' });
    mockedUseSendUserMessage.mockReturnValue({
      mutateAsync: sendUserMessage,
      isLoading: false,
    } as never);
    mockedUseToasts.mockReturnValue({
      addErrorToast,
      addSuccessToast: jest.fn(),
    } as never);
    mockedUseMessageEditor.mockReturnValue({
      messageEditor: {} as never,
      controller: editorController,
      overLimitCharacterCount: 0,
    } as never);
  });

  it('calls onSubmitOverride with editor content and skips submitMessage when override is provided', () => {
    const onSubmitOverride = jest.fn();

    renderInput(<ConversationInput onSubmitOverride={onSubmitOverride} />);

    fireEvent.click(screen.getByTestId('mock-message-editor-submit'));

    expect(onSubmitOverride).toHaveBeenCalledTimes(1);
    expect(onSubmitOverride).toHaveBeenCalledWith('hello agent');
    expect(submitMessage).not.toHaveBeenCalled();
    expect(editorController.clear).toHaveBeenCalledTimes(1);
  });

  it('routes to submitMessage when no override is provided', () => {
    renderInput(<ConversationInput />);

    fireEvent.click(screen.getByTestId('mock-message-editor-submit'));

    expect(submitMessage).toHaveBeenCalledTimes(1);
    expect(submitMessage).toHaveBeenCalledWith('hello agent');
    expect(editorController.clear).toHaveBeenCalledTimes(1);
  });

  it('holds the submit until it knows whether the agent picks its own model', () => {
    mockedUseAgentModel.mockReturnValue({ isLoading: true, isLocked: false });

    renderInput(<ConversationInput />);

    fireEvent.click(screen.getByTestId('mock-message-editor-submit'));

    expect(mockedUseAgentModel).toHaveBeenCalledWith('elastic-ai-agent');
    expect(submitMessage).not.toHaveBeenCalled();
  });

  describe('rendering cost', () => {
    it('does not render again when its parent renders with the same props', () => {
      const onEditorFocus = jest.fn();
      const { rerender } = renderInput(<ConversationInput onEditorFocus={onEditorFocus} />);
      expect(mockOnEditorRender).toHaveBeenCalledTimes(1);

      rerender(<ConversationInput onEditorFocus={onEditorFocus} />);

      expect(mockOnEditorRender).toHaveBeenCalledTimes(1);
    });

    it('renders again when a prop changes', () => {
      const { rerender } = renderInput(<ConversationInput onEditorFocus={jest.fn()} />);

      rerender(<ConversationInput onEditorFocus={jest.fn()} />);

      expect(mockOnEditorRender).toHaveBeenCalledTimes(2);
    });
  });

  describe('message length limit', () => {
    it('does not show a warning for a message within the limit', () => {
      renderInput(<ConversationInput />);

      expect(screen.queryByTestId('agentBuilderConversationInputTooLong')).not.toBeInTheDocument();
    });

    it('shows a warning and blocks submit when the message exceeds the limit', () => {
      mockedUseMessageEditor.mockReturnValue({
        messageEditor: {} as never,
        controller: editorController,
        overLimitCharacterCount: CHAT_MESSAGE_MAX_LENGTH + 1,
      } as never);

      renderInput(<ConversationInput />);
      fireEvent.click(screen.getByTestId('mock-message-editor-submit'));

      expect(screen.getByTestId('agentBuilderConversationInputTooLong')).toHaveTextContent(
        'Message is too long'
      );
      expect(submitMessage).not.toHaveBeenCalled();
      expect(editorController.clear).not.toHaveBeenCalled();
    });
  });

  describe('trigger mode selector', () => {
    const selectTalkToUsers = () =>
      fireEvent.change(screen.getByTestId('mock-trigger-mode-selector'), {
        target: { value: 'never' },
      });

    beforeEach(() => {
      mockedUseConversationId.mockReturnValue('conv-1');
      mockedUseIsSharedConversation.mockReturnValue(true);
    });

    it('is not offered for a conversation that is not shared', () => {
      mockedUseIsSharedConversation.mockReturnValue(false);

      renderInput(<ConversationInput />);

      expect(screen.queryByTestId('mock-trigger-mode-selector')).not.toBeInTheDocument();
    });

    it('is offered for a shared conversation', () => {
      renderInput(<ConversationInput />);

      expect(screen.getByTestId('mock-trigger-mode-selector')).toBeInTheDocument();
    });

    it('shows the post to team header only when talking to users', () => {
      renderInput(<ConversationInput />);

      const header = screen.getByTestId('agentBuilderConversationInputPostToTeamHeader');
      expect(header).toHaveAttribute('aria-hidden', 'true');

      selectTalkToUsers();

      expect(header).toHaveAttribute('aria-hidden', 'false');
      expect(header).toHaveTextContent("Posting to the team · Agent won't respond.");
    });

    it('falls back to running the agent once the conversation is no longer shared', () => {
      const { rerender } = renderInput(<ConversationInput />);

      selectTalkToUsers();
      mockedUseIsSharedConversation.mockReturnValue(false);
      rerenderInput(rerender);

      expect(screen.getByTestId('agentBuilderConversationInputPostToTeamHeader')).toHaveAttribute(
        'aria-hidden',
        'true'
      );

      fireEvent.click(screen.getByTestId('mock-message-editor-submit'));

      expect(submitMessage).toHaveBeenCalledWith('hello agent');
      expect(sendUserMessage).not.toHaveBeenCalled();
    });

    it('does not carry the choice over to another shared conversation', () => {
      const { rerender } = renderInput(<ConversationInput />);

      selectTalkToUsers();
      mockedUseConversationId.mockReturnValue('conv-2');
      rerenderInput(rerender);

      expect(screen.getByTestId('mock-trigger-mode-selector')).toHaveValue('always');
    });

    it('does not restore the choice once the conversation is shared again', () => {
      const { rerender } = renderInput(<ConversationInput />);

      selectTalkToUsers();
      mockedUseIsSharedConversation.mockReturnValue(false);
      rerenderInput(rerender);
      mockedUseIsSharedConversation.mockReturnValue(true);
      rerenderInput(rerender);

      expect(screen.getByTestId('mock-trigger-mode-selector')).toHaveValue('always');
    });

    it('sends without running the agent when talking to users and clears the editor on success', async () => {
      const onSubmit = jest.fn();

      renderInput(<ConversationInput onSubmit={onSubmit} />);

      selectTalkToUsers();
      fireEvent.click(screen.getByTestId('mock-message-editor-submit'));

      expect(sendUserMessage).toHaveBeenCalledWith('hello agent');
      expect(submitMessage).not.toHaveBeenCalled();
      await waitFor(() => expect(editorController.clear).toHaveBeenCalledTimes(1));
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('keeps the editor content and shows a toast when the send fails', async () => {
      sendUserMessage.mockRejectedValue(new Error('boom'));

      renderInput(<ConversationInput />);

      selectTalkToUsers();
      fireEvent.click(screen.getByTestId('mock-message-editor-submit'));

      await waitFor(() => expect(addErrorToast).toHaveBeenCalledWith({ title: 'boom' }));
      expect(editorController.clear).not.toHaveBeenCalled();
    });

    it('runs the agent when talking to agent and users', () => {
      renderInput(<ConversationInput />);

      fireEvent.click(screen.getByTestId('mock-message-editor-submit'));

      expect(submitMessage).toHaveBeenCalledWith('hello agent');
      expect(sendUserMessage).not.toHaveBeenCalled();
    });
  });

  describe('mentions', () => {
    const lastExcludedCommandIds = () =>
      mockedUseMessageEditor.mock.calls[mockedUseMessageEditor.mock.calls.length - 1][0]
        ?.excludedCommandIds;

    it('turns the mention menu off with the experimental flag off', () => {
      mockedUseIsSharedConversation.mockReturnValue(true);
      renderInput(<ConversationInput />);

      expect(lastExcludedCommandIds()).toEqual([CommandId.Mention]);
    });

    it('turns the mention menu off in a chat that is not shared', () => {
      mockedUseExperimentalFeatures.mockReturnValue(true);
      renderInput(<ConversationInput />);

      expect(lastExcludedCommandIds()).toEqual([CommandId.Mention]);
    });

    it('turns the mention menu on in a shared chat with the experimental flag on', () => {
      mockedUseExperimentalFeatures.mockReturnValue(true);
      mockedUseIsSharedConversation.mockReturnValue(true);
      renderInput(<ConversationInput />);

      expect(lastExcludedCommandIds()).toEqual([]);
    });

    it('shows the mention button only in a shared chat with the experimental flag on', () => {
      const { rerender } = renderInput(<ConversationInput />);
      expect(screen.queryByTestId('mock-mention-button')).not.toBeInTheDocument();

      mockedUseIsSharedConversation.mockReturnValue(true);
      rerenderInput(rerender);
      expect(screen.queryByTestId('mock-mention-button')).not.toBeInTheDocument();

      mockedUseExperimentalFeatures.mockReturnValue(true);
      rerenderInput(rerender);
      expect(screen.getByTestId('mock-mention-button')).toBeInTheDocument();

      mockedUseIsSharedConversation.mockReturnValue(false);
      rerenderInput(rerender);
      expect(screen.queryByTestId('mock-mention-button')).not.toBeInTheDocument();
    });

    it('types an @ in the editor when the mention button is clicked', () => {
      mockedUseExperimentalFeatures.mockReturnValue(true);
      mockedUseIsSharedConversation.mockReturnValue(true);
      renderInput(<ConversationInput />);

      fireEvent.click(screen.getByTestId('mock-mention-button'));

      expect(editorController.insertText).toHaveBeenCalledWith('@');
    });

    describe('switching the trigger mode with a mention at the start', () => {
      const julian = '[@Julian Rosado](mention://u_julian_0?kind=user)';
      const agent = '[@Elastic AI Agent](mention://elastic-ai-agent?kind=agent)';

      const modeValue = () => screen.getByTestId('mock-trigger-mode-selector');
      const type = (content: string) => {
        editorController.getContent.mockReturnValue(content);
        const { onContentChange } =
          mockedUseMessageEditor.mock.calls[mockedUseMessageEditor.mock.calls.length - 1][0] ?? {};
        act(() => onContentChange?.());
      };

      beforeEach(() => {
        mockedUseInputDraft.mockReturnValue({
          draft: null,
          saveDraft: jest.fn(),
          clearDraft: jest.fn(),
        });
        mockedUseConversationId.mockReturnValue('conv-1');
        mockedUseExperimentalFeatures.mockReturnValue(true);
        mockedUseIsSharedConversation.mockReturnValue(true);
      });

      it('posts to the team when the message starts with a user', () => {
        renderInput(<ConversationInput />);

        type(`${julian} look`);

        expect(modeValue()).toHaveValue('never');
        expect(screen.getByTestId('agentBuilderConversationInputPostToTeamHeader')).toHaveAttribute(
          'aria-hidden',
          'false'
        );
      });

      it('asks the agent when the message starts with the agent, also after posting to the team', async () => {
        renderInput(<ConversationInput />);
        fireEvent.change(modeValue(), { target: { value: 'never' } });
        fireEvent.click(screen.getByTestId('mock-message-editor-submit'));
        await waitFor(() => expect(editorController.clear).toHaveBeenCalled());
        expect(modeValue()).toHaveValue('never');

        type(`${agent} summarize`);

        expect(modeValue()).toHaveValue('always');
      });

      it('ignores spaces and new lines before the mention', () => {
        renderInput(<ConversationInput />);

        type(`  \n${julian} look`);

        expect(modeValue()).toHaveValue('never');
      });

      it.each([
        ['text before it', `hey ${julian} look`],
        ['an image before it', `[photo.png](image://photo.png) ${julian}`],
        ['typed @name text', '@julian look'],
      ])('does not switch with %s', (_name, content) => {
        renderInput(<ConversationInput />);

        type(content);

        expect(modeValue()).toHaveValue('always');
      });

      it('goes back to the earlier mode once the message stops starting with a mention', () => {
        renderInput(<ConversationInput />);

        type(`${julian}, talk to ${agent} please`);
        expect(modeValue()).toHaveValue('never');

        type(`, talk to ${agent} please`);
        expect(modeValue()).toHaveValue('always');
      });

      it('stops switching once the user flips the toggle by hand, until the message is sent', async () => {
        renderInput(<ConversationInput />);

        fireEvent.change(modeValue(), { target: { value: 'always' } });
        type(`${julian} look`);
        expect(modeValue()).toHaveValue('always');

        fireEvent.click(screen.getByTestId('mock-message-editor-submit'));
        type(`${julian} look again`);
        expect(modeValue()).toHaveValue('never');
      });

      it('locks the toggle when it is flipped in an empty input', () => {
        renderInput(<ConversationInput />);

        fireEvent.change(modeValue(), { target: { value: 'never' } });
        type(`${agent} summarize`);

        expect(modeValue()).toHaveValue('never');
      });

      it('keeps the mode after the message is sent', async () => {
        renderInput(<ConversationInput />);

        type(`${julian} look`);
        fireEvent.click(screen.getByTestId('mock-message-editor-submit'));

        expect(sendUserMessage).toHaveBeenCalledWith(`${julian} look`);
        await waitFor(() => expect(editorController.clear).toHaveBeenCalled());
        expect(modeValue()).toHaveValue('never');
      });

      it('keeps the mention switch when the send fails', async () => {
        sendUserMessage.mockRejectedValue(new Error('boom'));
        renderInput(<ConversationInput />);

        type(`${julian} look`);
        fireEvent.click(screen.getByTestId('mock-message-editor-submit'));

        await waitFor(() => expect(addErrorToast).toHaveBeenCalled());
        expect(modeValue()).toHaveValue('never');
      });

      it('checks a restored draft once, after it loads', () => {
        mockedUseInputDraft.mockReturnValue({
          draft: `${julian} look`,
          saveDraft: jest.fn(),
          clearDraft: jest.fn(),
        });

        renderInput(<ConversationInput />);

        expect(editorController.setContent).toHaveBeenCalledWith(`${julian} look`);
        expect(modeValue()).toHaveValue('never');
      });

      it('does not carry the switch over to another conversation', () => {
        const { rerender } = renderInput(<ConversationInput />);
        type(`${julian} look`);

        mockedUseConversationId.mockReturnValue('conv-2');
        rerenderInput(rerender);

        expect(modeValue()).toHaveValue('always');
      });

      it('does not switch with the experimental flag off', () => {
        mockedUseExperimentalFeatures.mockReturnValue(false);
        renderInput(<ConversationInput />);

        type(`${julian} look`);

        expect(modeValue()).toHaveValue('always');
      });

      it('still lets the user flip the toggle by hand with the experimental flag off', () => {
        mockedUseExperimentalFeatures.mockReturnValue(false);
        renderInput(<ConversationInput />);

        fireEvent.change(modeValue(), { target: { value: 'never' } });

        expect(modeValue()).toHaveValue('never');
      });
    });

    it('turns the mention menu on when the chat becomes shared, without a remount', () => {
      mockedUseExperimentalFeatures.mockReturnValue(true);
      const { rerender } = renderInput(<ConversationInput />);
      expect(lastExcludedCommandIds()).toEqual([CommandId.Mention]);

      mockedUseIsSharedConversation.mockReturnValue(true);
      rerenderInput(rerender);

      expect(lastExcludedCommandIds()).toEqual([]);
    });
  });

  it('hides the message input for read-only conversations', () => {
    mockedUseConversationReadOnly.mockReturnValue({ isReadOnly: true, isLoading: false });

    renderInput(<ConversationInput />);

    expect(screen.queryByTestId('mock-message-editor-submit')).not.toBeInTheDocument();
  });

  it('hides the message input while the conversation is loading', () => {
    mockedUseConversationReadOnly.mockReturnValue({ isReadOnly: false, isLoading: true });

    renderInput(<ConversationInput />);

    expect(screen.queryByTestId('mock-message-editor-submit')).not.toBeInTheDocument();
  });

  describe('auto-focus', () => {
    it('focuses the editor shortly after mount', () => {
      jest.useFakeTimers();
      renderInput(<ConversationInput />);

      jest.advanceTimersByTime(200);
      expect(editorController.focus).toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('does not steal focus from an open HITL prompt', () => {
      jest.useFakeTimers();
      mockedUseIsAwaitingPrompt.mockReturnValue(true);
      renderInput(<ConversationInput />);

      jest.advanceTimersByTime(200);
      expect(editorController.focus).not.toHaveBeenCalled();
      jest.useRealTimers();
    });
  });

  describe('sending a message without the agent', () => {
    it('greys out and disables the input while the post is in flight', () => {
      mockedUseSendUserMessage.mockReturnValue({
        mutateAsync: sendUserMessage,
        isLoading: true,
      } as never);

      renderInput(<ConversationInput />);

      // The shell paints the disabled background off this attribute; the editor is mocked here.
      expect(screen.getByTestId('agentBuilderConversationInputForm')).toHaveAttribute(
        'aria-disabled',
        'true'
      );
    });
  });

  describe('attachment removal', () => {
    const attachment = { id: 'a1', type: 'text', data: {} };

    it('removes a normal attachment via context', () => {
      const removeAttachment = jest.fn();
      mockedUseConversationContext.mockReturnValue({
        attachments: [attachment],
        upsertAttachments: jest.fn(),
        removeAttachment,
        resetAttachments: jest.fn(),
        isEmbeddedContext: false,
        conversationActions: {} as never,
      } as never);

      renderInput(<ConversationInput />);
      fireEvent.click(screen.getByTestId('mock-remove-attachment-a1'));

      expect(removeAttachment).toHaveBeenCalledWith(0);
    });
  });

  describe('draft persistence', () => {
    it('hydrates the editor with a saved draft on mount', () => {
      mockedUseInputDraft.mockReturnValue({
        draft: 'saved draft text',
        saveDraft: jest.fn(),
        clearDraft: jest.fn(),
      });

      renderInput(<ConversationInput />);

      expect(editorController.setContent).toHaveBeenCalledWith('saved draft text');
    });

    it('does not hydrate draft when initialMessage is present', () => {
      mockedUseInputDraft.mockReturnValue({
        draft: 'stale draft',
        saveDraft: jest.fn(),
        clearDraft: jest.fn(),
      });
      mockedUseConversationContext.mockReturnValue({
        attachments: [],
        upsertAttachments: jest.fn(),
        removeAttachment: jest.fn(),
        resetAttachments: jest.fn(),
        isEmbeddedContext: false,
        conversationActions: {} as never,
        initialMessage: 'pre-filled message',
        autoSendInitialMessage: false,
      } as never);

      renderInput(<ConversationInput />);

      expect(editorController.setContent).not.toHaveBeenCalledWith('stale draft');
    });

    it('clears the draft on submit via the default path', () => {
      const clearDraft = jest.fn();
      mockedUseInputDraft.mockReturnValue({ draft: null, saveDraft: jest.fn(), clearDraft });

      renderInput(<ConversationInput />);
      fireEvent.click(screen.getByTestId('mock-message-editor-submit'));

      expect(clearDraft).toHaveBeenCalledTimes(1);
    });

    it('clears the draft on submit with trigger mode Never', async () => {
      const clearDraft = jest.fn();
      mockedUseConversationId.mockReturnValue('conv-1');
      mockedUseIsSharedConversation.mockReturnValue(true);
      mockedUseInputDraft.mockReturnValue({ draft: null, saveDraft: jest.fn(), clearDraft });

      renderInput(<ConversationInput />);
      fireEvent.change(screen.getByTestId('mock-trigger-mode-selector'), {
        target: { value: 'never' },
      });
      fireEvent.click(screen.getByTestId('mock-message-editor-submit'));

      await waitFor(() => expect(clearDraft).toHaveBeenCalledTimes(1));
    });

    it('clears the editor when switching to a conversation with no saved draft', () => {
      mockedUseInputDraft.mockReturnValue({
        draft: null,
        saveDraft: jest.fn(),
        clearDraft: jest.fn(),
      });

      const { rerender } = renderInput(<ConversationInput />);
      editorController.clear.mockClear();

      mockedUseConversationId.mockReturnValue('conv-2');
      rerenderInput(rerender);

      expect(editorController.clear).toHaveBeenCalledTimes(1);
    });
  });
});

describe('InputActions', () => {
  const renderActions = (props: Partial<React.ComponentProps<typeof InputActions>> = {}) =>
    renderInput(
      <InputActions
        onSubmit={jest.fn()}
        isSubmitDisabled={false}
        isSubmitting={false}
        showTriggerModeSelector
        triggerMode={ChatTriggerMode.Always}
        onTriggerModeChange={jest.fn()}
        {...props}
      />
    );

  beforeEach(() => {
    mockedUseConversationStream.mockReturnValue({
      canCancel: false,
      cancel: jest.fn(),
      isCancelling: false,
      pendingMessage: undefined,
      isResuming: false,
      isResponseLoading: false,
      sendMessage: jest.fn(),
    } as never);
  });

  it('shows the connector selector when the agent is included', () => {
    renderInput(
      <InputActions
        onSubmit={jest.fn()}
        isSubmitDisabled={false}
        isSubmitting={false}
        showTriggerModeSelector
        triggerMode={ChatTriggerMode.Always}
        onTriggerModeChange={jest.fn()}
      />
    );

    expect(screen.getByTestId('mockConnectorSelector')).toBeInTheDocument();
  });

  it('hides the connector selector when the agent is skipped', () => {
    renderInput(
      <InputActions
        onSubmit={jest.fn()}
        isSubmitDisabled={false}
        isSubmitting={false}
        showTriggerModeSelector
        triggerMode={ChatTriggerMode.Never}
        onTriggerModeChange={jest.fn()}
      />
    );

    expect(screen.queryByTestId('mockConnectorSelector')).not.toBeInTheDocument();
  });

  describe('mention button', () => {
    it('is hidden without onMentionClick', () => {
      renderActions();

      expect(
        screen.queryByTestId('agentBuilderConversationInputMentionButton')
      ).not.toBeInTheDocument();
    });

    it.each([ChatTriggerMode.Always, ChatTriggerMode.Never])(
      'is shown with onMentionClick, and calls it on click (%s)',
      (triggerMode) => {
        const onMentionClick = jest.fn();
        renderActions({ onMentionClick, triggerMode });

        fireEvent.click(screen.getByTestId('agentBuilderConversationInputMentionButton'));

        expect(onMentionClick).toHaveBeenCalledTimes(1);
      }
    );

    it('is named for screen readers', () => {
      renderActions({ onMentionClick: jest.fn() });

      expect(screen.getByTestId('agentBuilderConversationInputMentionButton')).toHaveAccessibleName(
        'Mention a teammate or the agent'
      );
    });

    it('does not take the focus from the editor on mouse down', () => {
      renderActions({ onMentionClick: jest.fn() });

      const wasNotPrevented = fireEvent.mouseDown(
        screen.getByTestId('agentBuilderConversationInputMentionButton')
      );

      expect(wasNotPrevented).toBe(false);
    });

    it('sits before the connector selector', () => {
      renderActions({ onMentionClick: jest.fn() });

      const button = screen.getByTestId('agentBuilderConversationInputMentionButton');
      const connector = screen.getByTestId('mockConnectorSelector');

      expect(button.compareDocumentPosition(connector)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
  });
});
