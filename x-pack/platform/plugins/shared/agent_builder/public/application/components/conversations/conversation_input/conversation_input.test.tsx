/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConversationInput } from './conversation_input';
import { useConversationStream } from '../../../hooks/use_conversation_stream';
import { useAgentBuilderAgents } from '../../../hooks/agents/use_agents';
import { useValidateAgentId } from '../../../hooks/agents/use_validate_agent_id';
import {
  useAgentId,
  useConversationReadOnly,
  useConversationTitle,
  useHasActiveConversation,
} from '../../../hooks/use_conversation';
import { useIsAwaitingPrompt } from '../../../hooks/use_is_awaiting_prompt';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useSubmitMessage } from '../../../hooks/use_submit_message';
import { useSendUserMessage } from '../../../hooks/use_send_user_message';
import { useToasts } from '../../../hooks/use_toasts';
import { useMessageEditor } from './message_editor';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useExperimentalFeatures } from '../../../hooks/use_experimental_features';
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
jest.mock('../../../hooks/use_conversation', () => ({
  useAgentId: jest.fn(),
  useConversationReadOnly: jest.fn(),
  useConversationTitle: jest.fn(),
  useHasActiveConversation: jest.fn(),
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
jest.mock('./message_editor', () => ({
  useMessageEditor: jest.fn(),
  MessageEditor: ({ onSubmit }: { onSubmit: () => void }) => (
    <button data-test-subj="mock-message-editor-submit" type="button" onClick={onSubmit}>
      submit
    </button>
  ),
  CommandBadgeSerializationError: class extends Error {},
}));
jest.mock('./input_actions', () => ({
  InputActions: ({
    showTriggerModeToggle,
    triggerMode,
    onTriggerModeChange,
  }: {
    showTriggerModeToggle: boolean;
    triggerMode: string;
    onTriggerModeChange: (mode: string) => void;
  }) =>
    showTriggerModeToggle ? (
      <input
        data-test-subj="mock-agent-toggle"
        type="checkbox"
        checked={triggerMode === 'always'}
        onChange={(event) => onTriggerModeChange(event.target.checked ? 'always' : 'never')}
      />
    ) : null,
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
jest.mock('../../../hooks/use_experimental_features', () => ({
  useExperimentalFeatures: jest.fn(),
}));
jest.mock('../../../hooks/use_current_user', () => ({
  useCurrentUser: jest.fn().mockReturnValue({ currentUser: { user: { username: 'test-user' } }, isLoading: false }),
}));
jest.mock('../../../hooks/use_input_draft', () => ({
  useInputDraft: jest.fn().mockReturnValue({ draft: null, saveDraft: jest.fn(), clearDraft: jest.fn() }),
}));
jest.mock('../../../context/active_space_context', () => ({
  useActiveSpaceId: jest.fn().mockReturnValue('default'),
}));
jest.mock('@kbn/agent-builder-browser', () => ({
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
const mockedUseAgentId = jest.mocked(useAgentId);
const mockedUseConversationReadOnly = jest.mocked(useConversationReadOnly);
const mockedUseConversationTitle = jest.mocked(useConversationTitle);
const mockedUseHasActiveConversation = jest.mocked(useHasActiveConversation);
const mockedUseIsAwaitingPrompt = jest.mocked(useIsAwaitingPrompt);
const mockedUseConversationId = jest.mocked(useConversationId);
const mockedUseConversationContext = jest.mocked(useConversationContext);
const mockedUseSubmitMessage = jest.mocked(useSubmitMessage);
const mockedUseSendUserMessage = jest.mocked(useSendUserMessage);
const mockedUseToasts = jest.mocked(useToasts);
const mockedUseMessageEditor = jest.mocked(useMessageEditor);
const mockedUseAgentBuilderServices = jest.mocked(useAgentBuilderServices);
const mockedUseExperimentalFeatures = jest.mocked(useExperimentalFeatures);
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
};

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
    mockedUseAgentId.mockReturnValue('elastic-ai-agent');
    mockedUseConversationReadOnly.mockReturnValue({ isReadOnly: false, isLoading: false });
    mockedUseConversationTitle.mockReturnValue({ title: '', isLoading: false } as never);
    mockedUseHasActiveConversation.mockReturnValue(false);
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
    mockedUseExperimentalFeatures.mockReturnValue(true);
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
    } as never);
  });

  it('calls onSubmitOverride with editor content and skips submitMessage when override is provided', () => {
    const onSubmitOverride = jest.fn();

    render(<ConversationInput onSubmitOverride={onSubmitOverride} />);

    fireEvent.click(screen.getByTestId('mock-message-editor-submit'));

    expect(onSubmitOverride).toHaveBeenCalledTimes(1);
    expect(onSubmitOverride).toHaveBeenCalledWith('hello agent');
    expect(submitMessage).not.toHaveBeenCalled();
    expect(editorController.clear).toHaveBeenCalledTimes(1);
  });

  it('routes to submitMessage when no override is provided', () => {
    render(<ConversationInput />);

    fireEvent.click(screen.getByTestId('mock-message-editor-submit'));

    expect(submitMessage).toHaveBeenCalledTimes(1);
    expect(submitMessage).toHaveBeenCalledWith('hello agent');
    expect(editorController.clear).toHaveBeenCalledTimes(1);
  });

  describe('run agent toggle', () => {
    it('is not offered for a new conversation', () => {
      render(<ConversationInput />);

      expect(screen.queryByTestId('mock-agent-toggle')).not.toBeInTheDocument();
    });

    it('is not offered when experimental features are off', () => {
      mockedUseConversationId.mockReturnValue('conv-1');
      mockedUseExperimentalFeatures.mockReturnValue(false);

      render(<ConversationInput />);

      expect(screen.queryByTestId('mock-agent-toggle')).not.toBeInTheDocument();
    });

    it('sends without running the agent when switched off and clears the editor on success', async () => {
      mockedUseConversationId.mockReturnValue('conv-1');
      const onSubmit = jest.fn();

      render(<ConversationInput onSubmit={onSubmit} />);

      fireEvent.click(screen.getByTestId('mock-agent-toggle'));
      fireEvent.click(screen.getByTestId('mock-message-editor-submit'));

      expect(sendUserMessage).toHaveBeenCalledWith('hello agent');
      expect(submitMessage).not.toHaveBeenCalled();
      await waitFor(() => expect(editorController.clear).toHaveBeenCalledTimes(1));
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('keeps the editor content and shows a toast when the send fails', async () => {
      mockedUseConversationId.mockReturnValue('conv-1');
      sendUserMessage.mockRejectedValue(new Error('boom'));

      render(<ConversationInput />);

      fireEvent.click(screen.getByTestId('mock-agent-toggle'));
      fireEvent.click(screen.getByTestId('mock-message-editor-submit'));

      await waitFor(() => expect(addErrorToast).toHaveBeenCalledWith({ title: 'boom' }));
      expect(editorController.clear).not.toHaveBeenCalled();
    });

    it('runs the agent when switched on', () => {
      mockedUseConversationId.mockReturnValue('conv-1');

      render(<ConversationInput />);

      fireEvent.click(screen.getByTestId('mock-message-editor-submit'));

      expect(submitMessage).toHaveBeenCalledWith('hello agent');
      expect(sendUserMessage).not.toHaveBeenCalled();
    });
  });

  it('hides the message input for read-only conversations', () => {
    mockedUseConversationReadOnly.mockReturnValue({ isReadOnly: true, isLoading: false });

    render(<ConversationInput />);

    expect(screen.queryByTestId('mock-message-editor-submit')).not.toBeInTheDocument();
  });

  it('hides the message input while the conversation is loading', () => {
    mockedUseConversationReadOnly.mockReturnValue({ isReadOnly: false, isLoading: true });

    render(<ConversationInput />);

    expect(screen.queryByTestId('mock-message-editor-submit')).not.toBeInTheDocument();
  });

  describe('auto-focus', () => {
    it('focuses the editor shortly after mount', () => {
      jest.useFakeTimers();
      render(<ConversationInput />);

      jest.advanceTimersByTime(200);
      expect(editorController.focus).toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('does not steal focus from an open HITL prompt', () => {
      jest.useFakeTimers();
      mockedUseIsAwaitingPrompt.mockReturnValue(true);
      render(<ConversationInput />);

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

      render(<ConversationInput />);

      // The shell paints the disabled background off this attribute; the editor is mocked here.
      expect(screen.getByTestId('agentBuilderConversationInputForm')).toHaveAttribute(
        'aria-disabled',
        'true'
      );
    });
  });

  describe('attachment removal', () => {
    const attachment = { id: 'a1', type: 'text', data: {} };

    it('removes a normal attachment via context when image upload is enabled', () => {
      const removeAttachment = jest.fn();
      mockedUseExperimentalFeatures.mockReturnValue(true);
      mockedUseConversationContext.mockReturnValue({
        attachments: [attachment],
        upsertAttachments: jest.fn(),
        removeAttachment,
        resetAttachments: jest.fn(),
        isEmbeddedContext: false,
        conversationActions: {} as never,
      } as never);

      render(<ConversationInput />);
      fireEvent.click(screen.getByTestId('mock-remove-attachment-a1'));

      expect(removeAttachment).toHaveBeenCalledWith(0);
    });

    it('still removes a normal attachment via context when image upload is disabled', () => {
      const removeAttachment = jest.fn();
      mockedUseExperimentalFeatures.mockReturnValue(false);
      mockedUseConversationContext.mockReturnValue({
        attachments: [attachment],
        upsertAttachments: jest.fn(),
        removeAttachment,
        resetAttachments: jest.fn(),
        isEmbeddedContext: false,
        conversationActions: {} as never,
      } as never);

      render(<ConversationInput />);
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

      render(<ConversationInput />);

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

      render(<ConversationInput />);

      expect(editorController.setContent).not.toHaveBeenCalledWith('stale draft');
    });

    it('clears the draft on submit via the default path', () => {
      const clearDraft = jest.fn();
      mockedUseInputDraft.mockReturnValue({ draft: null, saveDraft: jest.fn(), clearDraft });

      render(<ConversationInput />);
      fireEvent.click(screen.getByTestId('mock-message-editor-submit'));

      expect(clearDraft).toHaveBeenCalledTimes(1);
    });

    it('clears the draft on submit with trigger mode Never', async () => {
      const clearDraft = jest.fn();
      mockedUseConversationId.mockReturnValue('conv-1');
      mockedUseInputDraft.mockReturnValue({ draft: null, saveDraft: jest.fn(), clearDraft });

      render(<ConversationInput />);
      fireEvent.click(screen.getByTestId('mock-agent-toggle'));
      fireEvent.click(screen.getByTestId('mock-message-editor-submit'));

      await waitFor(() => expect(clearDraft).toHaveBeenCalledTimes(1));
    });

    it('clears the editor when switching to a conversation with no saved draft', () => {
      mockedUseInputDraft.mockReturnValue({ draft: null, saveDraft: jest.fn(), clearDraft: jest.fn() });

      const { rerender } = render(<ConversationInput />);
      editorController.clear.mockClear();

      mockedUseConversationId.mockReturnValue('conv-2');
      rerender(<ConversationInput />);

      expect(editorController.clear).toHaveBeenCalledTimes(1);
    });
  });
});
