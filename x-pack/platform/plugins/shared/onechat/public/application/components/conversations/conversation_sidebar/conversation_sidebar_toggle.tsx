/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiPageHeaderSection } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { i18n } from '@kbn/i18n';

const sidebarToggleBtnStyles = css`
  margin-inline-end: 8px;
  align-self: center;
`;

interface ConversationSidebarToggleProps {
  isSidebarOpen: boolean;
  onToggle: () => void;
}

export const ConversationSidebarToggle: React.FC<ConversationSidebarToggleProps> = ({
  isSidebarOpen,
  onToggle,
}) => {
  const labels = {
    open: i18n.translate('xpack.onechat.conversationSidebarToggle.open', {
      defaultMessage: 'Open sidebar',
    }),
    close: i18n.translate('xpack.onechat.conversationSidebarToggle.close', {
      defaultMessage: 'Close sidebar',
    }),
  };
  return (
    <EuiPageHeaderSection>
      <EuiButtonIcon
        iconType={isSidebarOpen ? 'transitionLeftOut' : 'transitionLeftIn'}
        color="text"
        aria-label={isSidebarOpen ? labels.close : labels.open}
        onClick={onToggle}
        css={sidebarToggleBtnStyles}
        display="empty"
        data-test-subj="onechatSidebarToggleBtn"
      />
    </EuiPageHeaderSection>
  );
};
