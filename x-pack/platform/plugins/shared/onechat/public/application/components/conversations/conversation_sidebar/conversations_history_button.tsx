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
import { ConversationsHistoryList } from './conversations_history_list';

export const ConversationsHistoryButton: React.FC = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const hasActiveConversation = useHasActiveConversation();
  const { euiTheme } = useEuiTheme();

  const labels = {
    open: i18n.translate('xpack.onechat.conversationSidebarToggle.open', {
      defaultMessage: 'Open conversations',
    }),
    close: i18n.translate('xpack.onechat.conversationSidebarToggle.close', {
      defaultMessage: 'Close conversations',
    }),
    chatHistory: i18n.translate('xpack.onechat.conversationSidebarToggle.chatHistory', {
      defaultMessage: 'Chat history',
    }),
  };

  const togglePopover = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const paddingLeft = css`
    padding-left: ${euiTheme.size.s};
  `;

  const button = hasActiveConversation ? (
    <div css={paddingLeft}>
      <EuiButtonIcon
        iconType="clock"
        color="text"
        aria-label={isPopoverOpen ? labels.close : labels.open}
        onClick={togglePopover}
        display="empty"
        data-test-subj="onechatSidebarToggleBtn"
      />
    </div>
  ) : (
    <EuiButtonEmpty
      iconType="clock"
      color="text"
      aria-label={isPopoverOpen ? labels.close : labels.open}
      onClick={togglePopover}
      data-test-subj="onechatSidebarToggleBtn"
    >
      {labels.chatHistory}
    </EuiButtonEmpty>
  );

  return (
    <EuiPageHeaderSection>
      <ConversationsHistoryList
        button={button}
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
      />
    </EuiPageHeaderSection>
  );
};
