/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonEmpty, EuiButtonIcon, EuiPageHeaderSection, useEuiTheme } from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useHasActiveConversation } from '../../../hooks/use_conversation';
import { ConversationsHistoryPopover } from '../conversations_history/conversations_history_popover';
import { useConversationContext } from '../../../context/conversation/conversation_context';

const labels = {
  open: i18n.translate('xpack.onechat.conversationsHistory.open', {
    defaultMessage: 'Open conversations',
  }),
  close: i18n.translate('xpack.onechat.conversationsHistory.close', {
    defaultMessage: 'Close conversations',
  }),
  conversations: i18n.translate('xpack.onechat.conversationsHistory.conversations', {
    defaultMessage: 'Conversations',
  }),
};

export const ConversationsHistoryButton: React.FC = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const hasActiveConversation = useHasActiveConversation();
  const { euiTheme } = useEuiTheme();
  const { isEmbeddedContext } = useConversationContext();

  const togglePopover = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const paddingLeft = css`
    padding-left: ${euiTheme.size.s};
  `;

  const showButtonIcon = isEmbeddedContext || hasActiveConversation;
  const button = showButtonIcon ? (
    <EuiButtonIcon
      iconType="clockCounter"
      color="text"
      aria-label={isPopoverOpen ? labels.close : labels.open}
      onClick={togglePopover}
      display="empty"
      data-test-subj="onechatConversationsHistoryToggleBtn"
    />
  ) : (
    <EuiButtonEmpty
      iconType="clockCounter"
      color="text"
      aria-label={isPopoverOpen ? labels.close : labels.open}
      onClick={togglePopover}
      data-test-subj="onechatConversationsHistoryToggleBtn"
    >
      {labels.conversations}
    </EuiButtonEmpty>
  );

  const shouldAddPaddingLeft = hasActiveConversation && !isEmbeddedContext;
  return (
    <EuiPageHeaderSection css={shouldAddPaddingLeft ? paddingLeft : undefined}>
      <ConversationsHistoryPopover
        button={button}
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
      />
    </EuiPageHeaderSection>
  );
};
