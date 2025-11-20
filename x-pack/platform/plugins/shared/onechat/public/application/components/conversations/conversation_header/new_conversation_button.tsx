/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useIsSendingMessage } from '../../../hooks/use_is_sending_message';
import { useSendMessage } from '../../../context/send_message/send_message_context';
import { useConversationContext } from '../../../context/conversation/conversation_context';

interface NewConversationButtonProps {
  onClose?: () => void;
}

export const NewConversationButton: React.FC<NewConversationButtonProps> = ({ onClose }) => {
  const { createOnechatUrl } = useNavigation();
  const { isEmbeddedContext, setConversationId } = useConversationContext();
  const conversationId = useConversationId();
  const isNewConversation = !conversationId;
  const isSendingMessage = useIsSendingMessage();
  const { cleanConversation } = useSendMessage();
  // Only disable when we are on /new and there is a message being sent
  const isDisabled = isNewConversation && isSendingMessage;
  const handleClick = () => {
    // For new conversations, there isn't anywhere to navigate to, so instead we clean the conversation state
    if (isNewConversation) {
      cleanConversation();
    }
    if (isEmbeddedContext) {
      setConversationId?.(undefined);
    }
    onClose?.();
  };

  const buttonProps = isDisabled
    ? {
        disabled: true,
      }
    : isEmbeddedContext
    ? {}
    : {
        href: createOnechatUrl(appPaths.chat.new),
      };

  const labels = {
    ariaLabel: i18n.translate('xpack.onechat.newConversationButton.ariaLabel', {
      defaultMessage: 'Create new conversation',
    }),
    display: i18n.translate('xpack.onechat.newConversationButton.display', {
      defaultMessage: 'New',
    }),
  };

  return (
    <EuiButtonIcon
      color="text"
      iconType="plus"
      aria-label={labels.ariaLabel}
      onClick={handleClick}
      data-test-subj="agentBuilderNewConversationButton"
      {...buttonProps}
    />
  );
};
