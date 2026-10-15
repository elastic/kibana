/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiFlexItem,
  EuiIcon,
  EuiText,
  euiCanAnimate,
  euiShadow,
  euiShadowHover,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { CHAT_MESSAGE_MAX_LENGTH } from '@kbn/agent-builder-common';
import { i18n } from '@kbn/i18n';
import type { PropsWithChildren } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CONVERSATION_INPUT_SHELL_RADIUS,
  ConversationInputShell,
  formatAgentBuilderErrorMessage,
} from '@kbn/agent-builder-browser';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useConversationStream } from '../../../hooks/use_conversation_stream';
import { useCurrentUser } from '../../../hooks/use_current_user';
import { useInputDraft } from '../../../hooks/use_input_draft';
import { useActiveSpaceId } from '../../../context/active_space_context';
import { useSubmitMessage } from '../../../hooks/use_submit_message';
import { useSendUserMessage } from '../../../hooks/use_send_user_message';
import { ChatTriggerMode } from '../../../../../common/http_api/chat';
import { useAgentBuilderAgents } from '../../../hooks/agents/use_agents';
import { useAgentBuilderAgentById } from '../../../hooks/agents/use_agent_by_id';
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
import { MessageEditor, useMessageEditor, CommandBadgeSerializationError } from './message_editor';
import { useToasts } from '../../../hooks/use_toasts';
import { InputActions } from './input_actions';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { AttachmentPillsRow } from './attachment_pills_row';
import { useImageUpload } from './use_image_upload';

const containerAriaLabel = i18n.translate('xpack.agentBuilder.conversationInput.container.label', {
  defaultMessage: 'Message input form',
});

const postToTeamLabel = i18n.translate('xpack.agentBuilder.conversationInput.postToTeam.label', {
  defaultMessage: 'Leaving a post to the team',
});

const getMessageTooLongLabel = (characterCount: number): string =>
  i18n.translate('xpack.agentBuilder.conversationInput.messageTooLong', {
    defaultMessage:
      'Message is too long ({characterCount, number} / {maxLength, number} characters). Shorten it to send.',
    values: {
      characterCount,
      maxLength: CHAT_MESSAGE_MAX_LENGTH,
    },
  });

const wrapperStyles = ({ euiTheme }: UseEuiTheme) => css`
  flex-grow: 0;
  width: 100%;
  border-radius: ${CONVERSATION_INPUT_SHELL_RADIUS}px;
  ${euiCanAnimate} {
    transition: background-color ${euiTheme.animation.fast} ease-out, box-shadow 250ms;
  }
`;

// The shell's shadow would stop at the input and leave the post-to-team bar outside it.
const composerShadowStyles = (euiThemeContext: UseEuiTheme) => css`
  ${euiShadow(euiThemeContext, 's')}
  &:hover {
    ${euiShadowHover(euiThemeContext, 's')}
  }
`;

const composerFocusShadowStyles = (euiThemeContext: UseEuiTheme) => css`
  &:focus-within {
    ${euiShadow(euiThemeContext, 'xl')}
    &:hover {
      ${euiShadowHover(euiThemeContext, 'xl')}
    }
  }
`;

// In dark mode the wrapper's shadow draws a border overlay over the shell, hiding its focus border.
const shellStyles = ({ euiTheme }: UseEuiTheme) => css`
  position: relative;
  z-index: ${Number(euiTheme.levels.content) + 1};
`;

const wrapperWithHeaderStyles = ({ euiTheme }: UseEuiTheme) => css`
  background-color: ${euiTheme.colors.backgroundBaseDisabled};
`;

// The header stays mounted so it can slide back behind the input on the way out;
// visibility is delayed on exit so it only leaves the accessibility tree once collapsed.
// Animating the grid row lets the height follow the label, which can wrap when translated.
const headerStyles = ({ euiTheme }: UseEuiTheme) => css`
  display: grid;
  grid-template-rows: 0fr;
  visibility: hidden;
  ${euiCanAnimate} {
    transition: grid-template-rows ${euiTheme.animation.fast} ease-out,
      visibility 0s linear ${euiTheme.animation.fast};
  }
`;

const headerVisibleStyles = css`
  grid-template-rows: 1fr;
  visibility: visible;
  ${euiCanAnimate} {
    transition-delay: 0s;
  }
`;

// Padding lives one level down: a padded grid item cannot collapse to a zero-height row.
const headerClipStyles = css`
  min-height: 0;
  overflow: hidden;
`;

const headerContentStyles = ({ euiTheme }: UseEuiTheme) => css`
  display: flex;
  align-items: center;
  gap: ${euiTheme.size.xs};
  padding: ${euiTheme.size.xs} ${euiTheme.size.base};
`;

const InputContainer: React.FC<
  PropsWithChildren<{ isDisabled: boolean; isCollapsed: boolean; triggerMode: ChatTriggerMode }>
> = ({ children, isDisabled, isCollapsed, triggerMode }) => {
  const showHeader = triggerMode === ChatTriggerMode.Never;

  return (
    <div
      css={[
        wrapperStyles,
        composerShadowStyles,
        !isDisabled && composerFocusShadowStyles,
        showHeader && wrapperWithHeaderStyles,
      ]}
    >
      <div
        css={[headerStyles, showHeader && headerVisibleStyles]}
        aria-hidden={!showHeader}
        data-test-subj="agentBuilderConversationInputPostToTeamHeader"
      >
        <div css={headerClipStyles}>
          <div css={headerContentStyles}>
            <EuiIcon type="megaphone" size="s" aria-hidden={true} />
            <EuiText size="xs">{postToTeamLabel}</EuiText>
          </div>
        </div>
      </div>
      <ConversationInputShell
        isDisabled={isDisabled}
        isCollapsed={isCollapsed}
        suppressShadow
        css={shellStyles}
        data-test-subj="agentBuilderConversationInputForm"
        aria-label={containerAriaLabel}
      >
        {children}
      </ConversationInputShell>
    </div>
  );
};

/**
 * The input stays mounted across conversations, so a trigger mode choice only applies to the
 * conversation it was made in and is dropped once the selector stops being offered.
 */
const useTriggerMode = () => {
  const conversationId = useConversationId();
  const isSelectable = useIsSharedConversation();

  const [choice, setChoice] = useState<{
    conversationId?: string;
    triggerMode: ChatTriggerMode;
  }>();

  if (!isSelectable && choice) {
    setChoice(undefined);
  }

  const setTriggerMode = useCallback(
    (triggerMode: ChatTriggerMode) => setChoice({ conversationId, triggerMode }),
    [conversationId]
  );

  const triggerMode =
    isSelectable && choice && choice.conversationId === conversationId
      ? choice.triggerMode
      : ChatTriggerMode.Always;

  return { triggerMode, setTriggerMode, isSelectable };
};

interface ConversationInputProps {
  onSubmit?: () => void;
  onEditorFocus?: () => void;
  onSubmitOverride?: (message: string) => void;
}

const disabledPlaceholder = (agentId?: string) =>
  i18n.translate('xpack.agentBuilder.conversationInput.textArea.disabledPlaceholder', {
    defaultMessage: 'Agent "{agentId}" has been deleted. Please start a new conversation.',
    values: {
      agentId,
    },
  });
const enabledPlaceholder = i18n.translate(
  'xpack.agentBuilder.conversationInput.textArea.enabledPlaceholder',
  {
    defaultMessage: 'Ask anything',
  }
);

const getMessageEditorAriaLabel = ({
  isNewConversation,
  conversationTitle,
}: {
  isNewConversation: boolean;
  conversationTitle: string;
}): string | undefined => {
  if (isNewConversation) {
    return i18n.translate(
      'xpack.agentBuilder.conversationInput.messageEditor.newConversationLabel',
      { defaultMessage: 'New conversation, Message input' }
    );
  }
  return i18n.translate('xpack.agentBuilder.conversationInput.messageEditor.conversationLabel', {
    defaultMessage: '{title} conversation, Message input',
    values: { title: conversationTitle },
  });
};

export const ConversationInput: React.FC<ConversationInputProps> = ({
  onSubmit,
  onEditorFocus,
  onSubmitOverride,
}) => {
  const [hoveredImageName, setHoveredImageName] = useState<string | null>(null);

  const { isResponseLoading } = useConversationStream();
  const { isFetched } = useAgentBuilderAgents();
  const agentId = useAgentId();
  const conversationId = useConversationId();

  const { currentUser } = useCurrentUser();
  const username = currentUser?.user.username;
  const spaceId = useActiveSpaceId();
  const { sessionTag } = useConversationContext();

  const { draft, saveDraft, clearDraft } = useInputDraft({
    spaceId,
    sessionTag,
    username,
    agentId,
    conversationId,
  });

  const messageEditorControllerRef = useRef<
    ReturnType<typeof useMessageEditor>['controller'] | null
  >(null);
  const saveDraftDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEditorContentRef = useRef('');
  const handleContentChange = useCallback(() => {
    try {
      const content = messageEditorControllerRef.current?.getContent() ?? '';
      lastEditorContentRef.current = content;
      if (saveDraftDebounceRef.current) clearTimeout(saveDraftDebounceRef.current);
      saveDraftDebounceRef.current = setTimeout(() => {
        saveDraft(lastEditorContentRef.current);
      }, 300);
    } catch (err) {
      if (!(err instanceof CommandBadgeSerializationError)) throw err;
    }
  }, [saveDraft]);

  const {
    messageEditor,
    controller: messageEditorController,
    overLimitCharacterCount,
  } = useMessageEditor({
    onEditorFocus,
    onContentChange: handleContentChange,
    maxLength: CHAT_MESSAGE_MAX_LENGTH,
  });
  messageEditorControllerRef.current = messageEditorController;

  useEffect(() => {
    return () => {
      if (saveDraftDebounceRef.current) {
        clearTimeout(saveDraftDebounceRef.current);
        saveDraftDebounceRef.current = null;
        saveDraft(lastEditorContentRef.current);
      }
    };
  }, [agentId, conversationId, saveDraft]);

  const { addErrorToast } = useToasts();
  const hasActiveConversation = useHasActiveConversation();
  const isAwaitingPrompt = useIsAwaitingPrompt();
  const { isReadOnly: isConversationReadOnly, isLoading: isConversationReadOnlyLoading } =
    useConversationReadOnly();
  const {
    attachments,
    upsertAttachments,
    initialMessage,
    autoSendInitialMessage,
    resetInitialMessage,
  } = useConversationContext();
  const { submitMessage, isCreatingConversation } = useSubmitMessage();
  const { triggerMode, setTriggerMode, isSelectable: isTriggerModeSelectable } = useTriggerMode();
  const { mutateAsync: sendUserMessage, isLoading: isSendingUserMessage } = useSendUserMessage();

  const { uploadingNames, handlePasteFile, handleAfterInput, handleRemoveAttachment } =
    useImageUpload({
      addErrorToast,
      messageEditorController,
    });

  const validateAgentId = useValidateAgentId();
  const isAgentIdValid = validateAgentId(agentId);
  const { isLoading: isAgentModelLoading } = useAgentModel(agentId);

  const { agent: agentById, isLoading: isLoadingAgentById } = useAgentBuilderAgentById(
    !isAgentIdValid && isFetched && Boolean(agentId) ? agentId : undefined
  );
  const agentExists = isAgentIdValid || Boolean(agentById);

  const isAgentDeleted = !agentExists && !isLoadingAgentById && isFetched && Boolean(agentId);
  const isInputDisabled =
    isAgentDeleted || isAwaitingPrompt || isCreatingConversation || isSendingUserMessage;
  const isMessageTooLong = overLimitCharacterCount > 0;
  const isSubmitDisabled =
    messageEditorController.isEmpty ||
    isMessageTooLong ||
    isResponseLoading ||
    isSendingUserMessage ||
    isCreatingConversation ||
    !agentExists ||
    isAgentModelLoading ||
    isAwaitingPrompt ||
    uploadingNames.size > 0;

  const placeholder = isAgentDeleted ? disabledPlaceholder(agentId) : enabledPlaceholder;

  const editorContainerStyles = css`
    display: flex;
    flex-direction: column;
    height: 100%;
  `;
  // Hide attachments while the message that carries them is being sent
  const shouldHideAttachments = isResponseLoading;

  const shouldCollapseInput = isResponseLoading || hasActiveConversation;

  const visibleAttachments = useMemo(() => {
    if (!attachments || shouldHideAttachments) return [];
    return attachments.filter((attachment) => {
      if ('items' in attachment) return true; // AttachmentGroup — always visible
      return !attachment.hidden;
    });
  }, [attachments, shouldHideAttachments]);

  const isNewConversation = !conversationId;
  const { title: conversationTitle } = useConversationTitle();

  const messageEditorAriaLabel = getMessageEditorAriaLabel({
    isNewConversation,
    conversationTitle,
  });

  const draftHydratedRef = useRef(false);
  const isConvSwitchRef = useRef(false);
  useEffect(() => {
    if (isConvSwitchRef.current) {
      messageEditorControllerRef.current?.clear();
      lastEditorContentRef.current = '';
    }
    isConvSwitchRef.current = true;
    draftHydratedRef.current = false;
  }, [agentId, conversationId, spaceId, sessionTag]);

  // Set initial message in input when {autoSendInitialMessage} is false and {initialMessage} is provided
  useEffect(() => {
    if (isConversationReadOnly) return;

    if (initialMessage && !autoSendInitialMessage && isNewConversation && !isAwaitingPrompt) {
      messageEditorController.setContent(initialMessage);
      messageEditorController.focus();
      resetInitialMessage?.(); // Reset the initial message to avoid sending it again
    }
  }, [
    initialMessage,
    autoSendInitialMessage,
    isNewConversation,
    isAwaitingPrompt,
    isConversationReadOnly,
    messageEditorController,
    resetInitialMessage,
  ]);
  useEffect(() => {
    if (draftHydratedRef.current) return;
    if (!username) return;
    if (isConversationReadOnly || isConversationReadOnlyLoading) return;
    if (initialMessage) {
      draftHydratedRef.current = true;
      return;
    }
    draftHydratedRef.current = true;
    if (draft && !lastEditorContentRef.current) {
      messageEditorController.setContent(draft);
    }
  }, [
    draft,
    username,
    spaceId,
    sessionTag,
    agentId,
    conversationId,
    initialMessage,
    isConversationReadOnly,
    isConversationReadOnlyLoading,
    messageEditorController,
  ]);

  // Skip auto-focus while a HITL prompt is open, it should own focus instead
  useEffect(() => {
    if (isAwaitingPrompt || isConversationReadOnly) return;
    const timeoutId = setTimeout(() => {
      messageEditorController.focus();
    }, 200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [conversationId, messageEditorController, isAwaitingPrompt, isConversationReadOnly]);

  const handleSubmit = () => {
    if (isSubmitDisabled) {
      return;
    }
    let content: string;
    try {
      content = messageEditorController.getContent();
    } catch (contentError) {
      if (contentError instanceof CommandBadgeSerializationError) {
        addErrorToast(
          i18n.translate('xpack.agentBuilder.conversationInput.invalidCommandBadge', {
            defaultMessage:
              'Your message contains an invalid command. Remove the command and try again.',
          })
        );
      }
      return;
    }
    if (saveDraftDebounceRef.current) {
      clearTimeout(saveDraftDebounceRef.current);
      saveDraftDebounceRef.current = null;
    }

    if (triggerMode === ChatTriggerMode.Never) {
      sendUserMessage(content)
        .then(() => {
          lastEditorContentRef.current = '';
          clearDraft();
          messageEditorController.clear();
          onSubmit?.();
        })
        .catch((sendError: unknown) => {
          lastEditorContentRef.current = content;
          addErrorToast({ title: formatAgentBuilderErrorMessage(sendError) });
        });
      return;
    }
    lastEditorContentRef.current = '';
    if (onSubmitOverride) {
      onSubmitOverride(content);
    } else {
      submitMessage(content);
    }
    clearDraft();
    messageEditorController.clear();
    onSubmit?.();
  };

  if (isConversationReadOnly || isConversationReadOnlyLoading) {
    return null;
  }

  return (
    <InputContainer
      isDisabled={isInputDisabled}
      isCollapsed={shouldCollapseInput}
      triggerMode={triggerMode}
    >
      {(visibleAttachments.length > 0 || uploadingNames.size > 0) && (
        <EuiFlexItem grow={false}>
          <AttachmentPillsRow
            attachments={visibleAttachments}
            uploadingNames={uploadingNames}
            removable
            onRemoveAttachment={handleRemoveAttachment}
            hoveredImageName={hoveredImageName}
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem css={editorContainerStyles}>
        <MessageEditor
          messageEditor={messageEditor}
          onSubmit={handleSubmit}
          disabled={isInputDisabled}
          placeholder={placeholder}
          ariaLabel={messageEditorAriaLabel}
          data-test-subj="agentBuilderConversationInputEditor"
          onPasteFile={upsertAttachments ? handlePasteFile : undefined}
          onAfterInput={handleAfterInput}
          onHoveredPlaceholderChange={setHoveredImageName}
          uploadingNames={uploadingNames}
        />
      </EuiFlexItem>
      {isMessageTooLong && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="danger" data-test-subj="agentBuilderConversationInputTooLong">
            {getMessageTooLongLabel(overLimitCharacterCount)}
          </EuiText>
        </EuiFlexItem>
      )}
      {!isAgentDeleted && (
        <InputActions
          onSubmit={handleSubmit}
          isSubmitDisabled={isSubmitDisabled}
          isSubmitting={isCreatingConversation || isSendingUserMessage}
          showTriggerModeSelector={isTriggerModeSelectable}
          triggerMode={triggerMode}
          onTriggerModeChange={setTriggerMode}
        />
      )}
    </InputContainer>
  );
};
