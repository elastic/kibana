/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { PropsWithChildren } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import { ConversationInputShell, formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useConversationStream } from '../../../hooks/use_conversation_stream';
import { useSubmitMessage } from '../../../hooks/use_submit_message';
import { useSendUserMessage } from '../../../hooks/use_send_user_message';
import { useExperimentalFeatures } from '../../../hooks/use_experimental_features';
import { ChatTriggerMode } from '../../../../../common/http_api/chat';
import { useAgentBuilderAgents } from '../../../hooks/agents/use_agents';
import { useValidateAgentId } from '../../../hooks/agents/use_validate_agent_id';
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

// Matches the border radius of ConversationInputShell so the header tucks behind its corners.
const INPUT_SHELL_RADIUS = 16;
const POST_TO_TEAM_HEADER_HEIGHT = 24;

const InputContainer: React.FC<
  PropsWithChildren<{ isDisabled: boolean; isCollapsed: boolean; isPostToTeam: boolean }>
> = ({ children, isDisabled, isCollapsed, isPostToTeam }) => {
  const { euiTheme } = useEuiTheme();

  const wrapperStyles = css`
    flex-grow: 0;
    width: 100%;
    border-radius: ${INPUT_SHELL_RADIUS}px;
    background-color: ${isPostToTeam ? euiTheme.colors.backgroundBaseDisabled : 'transparent'};
  `;
  const headerStyles = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.xs};
    height: ${POST_TO_TEAM_HEADER_HEIGHT}px;
    padding-inline: ${euiTheme.size.base};
  `;

  return (
    <div css={wrapperStyles}>
      {isPostToTeam && (
        <div css={headerStyles} data-test-subj="agentBuilderConversationInputPostToTeamHeader">
          <EuiIcon type="megaphone" size="s" aria-hidden={true} />
          <EuiText size="xs">{postToTeamLabel}</EuiText>
        </div>
      )}
      <ConversationInputShell
        isDisabled={isDisabled}
        isCollapsed={isCollapsed}
        data-test-subj="agentBuilderConversationInputForm"
        aria-label={containerAriaLabel}
      >
        {children}
      </ConversationInputShell>
    </div>
  );
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

  const { messageEditor, controller: messageEditorController } = useMessageEditor({
    onEditorFocus,
  });
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
  const [triggerMode, setTriggerMode] = useState<ChatTriggerMode>(ChatTriggerMode.Always);
  const isShared = useIsSharedConversation();
  const isExperimentalEnabled = useExperimentalFeatures();
  const { mutateAsync: sendUserMessage, isLoading: isSendingUserMessage } = useSendUserMessage();

  const { uploadingNames, handlePasteFile, handleAfterInput, handleRemoveAttachment } =
    useImageUpload({
      addErrorToast,
      messageEditorController,
    });

  const validateAgentId = useValidateAgentId();
  const isAgentIdValid = validateAgentId(agentId);

  const isAgentDeleted = !isAgentIdValid && isFetched && Boolean(agentId);
  const isInputDisabled =
    isAgentDeleted || isAwaitingPrompt || isCreatingConversation || isSendingUserMessage;
  const isSubmitDisabled =
    messageEditorController.isEmpty ||
    isResponseLoading ||
    isSendingUserMessage ||
    isCreatingConversation ||
    !isAgentIdValid ||
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

  const isTriggerModeSelectable = isShared && isExperimentalEnabled;
  const effectiveTriggerMode = isTriggerModeSelectable ? triggerMode : ChatTriggerMode.Always;
  const isPostToTeam = effectiveTriggerMode === ChatTriggerMode.Never;

  const messageEditorAriaLabel = getMessageEditorAriaLabel({
    isNewConversation,
    conversationTitle,
  });

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
    if (isPostToTeam) {
      sendUserMessage(content)
        .then(() => {
          messageEditorController.clear();
          onSubmit?.();
        })
        .catch((sendError: unknown) => {
          addErrorToast({ title: formatAgentBuilderErrorMessage(sendError) });
        });
      return;
    }
    if (onSubmitOverride) {
      onSubmitOverride(content);
    } else {
      submitMessage(content);
    }
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
      isPostToTeam={isPostToTeam}
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
      {!isAgentDeleted && (
        <InputActions
          onSubmit={handleSubmit}
          isSubmitDisabled={isSubmitDisabled}
          isSubmitting={isCreatingConversation || isSendingUserMessage}
          showTriggerModeSelector={isTriggerModeSelectable}
          triggerMode={effectiveTriggerMode}
          onTriggerModeChange={setTriggerMode}
        />
      )}
    </InputContainer>
  );
};
