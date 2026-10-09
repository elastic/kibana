/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { CHAT_MESSAGE_MAX_LENGTH } from '@kbn/agent-builder-common';
import { ConversationInput } from './conversation_input';
import { useConversationStream } from '../../../hooks/use_conversation_stream';
import { useAgentBuilderAgents } from '../../../hooks/agents/use_agents';
import { useValidateAgentId } from '../../../hooks/agents/use_validate_agent_id';
import { useAgentModel } from '../../../hooks/agents/use_agent_model';
import {
  useAgentId,
  useConversationReadOnly,
  useConversationTitle,
  useHasActiveConversation,
  useIsSharedConversation,
} from '../../../hooks/use_conversation';
import { useIsAwaitingPrompt } from '../../../hooks/use_is_awaiting_prompt';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useSubmitMessage } from '../../../hooks/use_submit_message';
import { useSendUserMessage } from '../../../hooks/use_send_user_message';
import { useToasts } from '../../../hooks/use_toasts';
import { useMessageEditor } from './message_editor';
import { usePdfUpload } from './use_pdf_upload';
import { useIsPdfUploadAvailable } from '../../../hooks/use_is_pdf_upload_available';
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
jest.mock('../../../hooks/use_conversation', () => ({
  useAgentId: jest.fn(),
  useConversationReadOnly: jest.fn(),
  useConversationTitle: jest.fn(),
  useHasActiveConversation: jest.fn(),
  useIsSharedConversation: jest.fn(),
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
const mockHandlePasteImage = jest.fn();
jest.mock('./use_image_upload', () => {
  const actual = jest.requireActual('./use_image_upload');
  return {
    useImageUpload: (params: unknown) => ({
      ...actual.useImageUpload(params),
      handlePasteFile: mockHandlePasteImage,
    }),
  };
});
jest.mock('./use_pdf_upload', () => ({ usePdfUpload: jest.fn() }));
jest.mock('../../../hooks/use_is_pdf_upload_available', () => ({
  useIsPdfUploadAvailable: jest.fn(),
}));
let mockMessageEditorProps: {
  onSubmit?: () => void;
  onPasteFile?: (file: File) => string | undefined;
  onAfterInput?: () => void;
  acceptPdf?: boolean;
  uploadingNames?: ReadonlySet<string>;
} = {};
jest.mock('./message_editor', () => ({
  useMessageEditor: jest.fn(),
  MessageEditor: (props: typeof mockMessageEditorProps) => {
    mockMessageEditorProps = props;
    return (
      <button data-test-subj="mock-message-editor-submit" type="button" onClick={props.onSubmit}>
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
  }: {
    showTriggerModeSelector: boolean;
    triggerMode: string;
    onTriggerModeChange: (mode: string) => void;
  }) =>
    showTriggerModeSelector ? (
      <select
        data-test-subj="mock-trigger-mode-selector"
        value={triggerMode}
        onChange={(event) => onTriggerModeChange(event.target.value)}
      >
        <option value="always">Include agent</option>
        <option value="never">Skip agent</option>
      </select>
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
const mockedUseAgentId = jest.mocked(useAgentId);
const mockedUseConversationReadOnly = jest.mocked(useConversationReadOnly);
const mockedUseConversationTitle = jest.mocked(useConversationTitle);
const mockedUseHasActiveConversation = jest.mocked(useHasActiveConversation);
const mockedUseIsSharedConversation = jest.mocked(useIsSharedConversation);
const mockedUseIsAwaitingPrompt = jest.mocked(useIsAwaitingPrompt);
const mockedUseConversationId = jest.mocked(useConversationId);
const mockedUseConversationContext = jest.mocked(useConversationContext);
const mockedUseSubmitMessage = jest.mocked(useSubmitMessage);
const mockedUseSendUserMessage = jest.mocked(useSendUserMessage);
const mockedUseToasts = jest.mocked(useToasts);
const mockedUseMessageEditor = jest.mocked(useMessageEditor);
const mockedUseAgentBuilderServices = jest.mocked(useAgentBuilderServices);
const mockedUseInputDraft = jest.mocked(useInputDraft);
const mockedUsePdfUpload = jest.mocked(usePdfUpload);
const mockedUseIsPdfUploadAvailable = jest.mocked(useIsPdfUploadAvailable);

const submitMessage = jest.fn();
const createConversation = jest.fn();
const handlePastePdf = jest.fn();
const handleAfterPdfInput = jest.fn();
const handleRemovePdf = jest.fn();
const handlePdfSubmitted = jest.fn();
const pdfUploadState = (
  overrides: Partial<ReturnType<typeof usePdfUpload>> = {}
): ReturnType<typeof usePdfUpload> => ({
  loadingPdfNames: new Set(),
  pendingConversationId: undefined,
  handlePastePdf,
  handleAfterInput: handleAfterPdfInput,
  handleRemovePdf,
  handleSubmitted: handlePdfSubmitted,
  ...overrides,
});
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

const renderInput = (ui: React.ReactElement) => render(ui, { wrapper: EuiProvider });

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
    mockedUseAgentId.mockReturnValue('elastic-ai-agent');
    mockedUseConversationReadOnly.mockReturnValue({ isReadOnly: false, isLoading: false });
    mockedUseConversationTitle.mockReturnValue({ title: '', isLoading: false } as never);
    mockedUseHasActiveConversation.mockReturnValue(false);
    mockedUseIsSharedConversation.mockReturnValue(false);
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
    mockedUseSubmitMessage.mockReturnValue({
      submitMessage,
      createConversation,
      isCreatingConversation: false,
    });
    mockedUseIsPdfUploadAvailable.mockReturnValue(true);
    mockedUsePdfUpload.mockReturnValue(pdfUploadState());
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
    expect(submitMessage).toHaveBeenCalledWith('hello agent', { conversationId: undefined });
    expect(editorController.clear).toHaveBeenCalledTimes(1);
  });

  it('holds the submit until it knows whether the agent picks its own model', () => {
    mockedUseAgentModel.mockReturnValue({ isLoading: true, isLocked: false });

    renderInput(<ConversationInput />);

    fireEvent.click(screen.getByTestId('mock-message-editor-submit'));

    expect(mockedUseAgentModel).toHaveBeenCalledWith('elastic-ai-agent');
    expect(submitMessage).not.toHaveBeenCalled();
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
      expect(header).toHaveTextContent('Leaving a post to the team');
    });

    it('falls back to running the agent once the conversation is no longer shared', () => {
      const { rerender } = renderInput(<ConversationInput />);

      selectTalkToUsers();
      mockedUseIsSharedConversation.mockReturnValue(false);
      rerender(<ConversationInput />);

      expect(screen.getByTestId('agentBuilderConversationInputPostToTeamHeader')).toHaveAttribute(
        'aria-hidden',
        'true'
      );

      fireEvent.click(screen.getByTestId('mock-message-editor-submit'));

      expect(submitMessage).toHaveBeenCalledWith('hello agent', { conversationId: undefined });
      expect(sendUserMessage).not.toHaveBeenCalled();
    });

    it('does not carry the choice over to another shared conversation', () => {
      const { rerender } = renderInput(<ConversationInput />);

      selectTalkToUsers();
      mockedUseConversationId.mockReturnValue('conv-2');
      rerender(<ConversationInput />);

      expect(screen.getByTestId('mock-trigger-mode-selector')).toHaveValue('always');
    });

    it('does not restore the choice once the conversation is shared again', () => {
      const { rerender } = renderInput(<ConversationInput />);

      selectTalkToUsers();
      mockedUseIsSharedConversation.mockReturnValue(false);
      rerender(<ConversationInput />);
      mockedUseIsSharedConversation.mockReturnValue(true);
      rerender(<ConversationInput />);

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

      expect(submitMessage).toHaveBeenCalledWith('hello agent', { conversationId: undefined });
      expect(sendUserMessage).not.toHaveBeenCalled();
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

  describe('PDF upload', () => {
    const pdfFile = new File([new Uint8Array(4)], 'invoice.pdf', { type: 'application/pdf' });
    const pngFile = new File([new Uint8Array(4)], 'photo.png', { type: 'image/png' });
    const pdfAttachment = {
      id: 'pdf-1',
      type: 'pdf',
      origin: 'file-1',
      description: 'invoice.pdf',
    };
    const setAttachments = (attachments: unknown[], removeAttachment = jest.fn()) =>
      mockedUseConversationContext.mockReturnValue({
        attachments,
        upsertAttachments: jest.fn(),
        removeAttachment,
        resetAttachments: jest.fn(),
        isEmbeddedContext: false,
        conversationActions: {} as never,
      } as never);

    it('gives a pasted PDF to the PDF upload and a pasted image to the image upload', () => {
      handlePastePdf.mockReturnValue('invoice.pdf');
      renderInput(<ConversationInput />);

      expect(mockMessageEditorProps.onPasteFile?.(pdfFile)).toBe('invoice.pdf');
      expect(handlePastePdf).toHaveBeenCalledWith(pdfFile);

      expect(mockHandlePasteImage).not.toHaveBeenCalled();

      mockMessageEditorProps.onPasteFile?.(pngFile);
      expect(mockHandlePasteImage).toHaveBeenCalledWith(pngFile);
      expect(handlePastePdf).toHaveBeenCalledTimes(1);
    });

    it('lets the editor accept a PDF only when PDF upload is available', () => {
      renderInput(<ConversationInput />);
      expect(mockMessageEditorProps.acceptPdf).toBe(true);

      mockedUseIsPdfUploadAvailable.mockReturnValue(false);
      renderInput(<ConversationInput />);
      expect(mockMessageEditorProps.acceptPdf).toBe(false);
    });

    it('syncs the PDF upload after the text changes', () => {
      renderInput(<ConversationInput />);

      mockMessageEditorProps.onAfterInput?.();

      expect(handleAfterPdfInput).toHaveBeenCalledTimes(1);
    });

    it('passes the PDF loading names to the editor chips', () => {
      mockedUsePdfUpload.mockReturnValue(
        pdfUploadState({ loadingPdfNames: new Set(['invoice.pdf']) })
      );

      renderInput(<ConversationInput />);

      expect(mockMessageEditorProps.uploadingNames).toEqual(new Set(['invoice.pdf']));
    });

    it('holds the submit while a PDF is loading, and shows its pill', () => {
      mockedUsePdfUpload.mockReturnValue(
        pdfUploadState({ loadingPdfNames: new Set(['invoice.pdf']) })
      );

      renderInput(<ConversationInput />);
      fireEvent.click(screen.getByTestId('mock-message-editor-submit'));

      expect(submitMessage).not.toHaveBeenCalled();
      expect(screen.getByTestId('mock-remove-attachment-invoice.pdf')).toBeInTheDocument();
    });

    it('cancels a loading PDF from its pill', () => {
      mockedUsePdfUpload.mockReturnValue(
        pdfUploadState({ loadingPdfNames: new Set(['invoice.pdf']) })
      );

      renderInput(<ConversationInput />);
      fireEvent.click(screen.getByTestId('mock-remove-attachment-invoice.pdf'));

      expect(handleRemovePdf).toHaveBeenCalledWith('invoice.pdf');
    });

    it('removes an added PDF through the PDF upload, not as a plain attachment', () => {
      const removeAttachment = jest.fn();
      setAttachments([pdfAttachment], removeAttachment);

      renderInput(<ConversationInput />);
      fireEvent.click(screen.getByTestId('mock-remove-attachment-pdf-1'));

      expect(handleRemovePdf).toHaveBeenCalledWith('invoice.pdf');
      expect(removeAttachment).not.toHaveBeenCalled();
    });

    it('sends into the conversation made for the PDF, then tells the PDF upload it was sent', () => {
      mockedUsePdfUpload.mockReturnValue(pdfUploadState({ pendingConversationId: 'pending-conv' }));

      renderInput(<ConversationInput />);
      fireEvent.click(screen.getByTestId('mock-message-editor-submit'));

      expect(submitMessage).toHaveBeenCalledWith('hello agent', {
        conversationId: 'pending-conv',
      });
      expect(handlePdfSubmitted).toHaveBeenCalledTimes(1);
    });

    it('gives the PDF upload the create conversation call of the submit hook', () => {
      renderInput(<ConversationInput />);

      expect(mockedUsePdfUpload).toHaveBeenCalledWith(
        expect.objectContaining({ createConversation })
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
      rerender(<ConversationInput />);

      expect(editorController.clear).toHaveBeenCalledTimes(1);
    });
  });
});

describe('InputActions', () => {
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
});
