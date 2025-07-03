/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiPageHeaderSection } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

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
  return (
    <EuiPageHeaderSection>
      <EuiButtonIcon
        iconType={isSidebarOpen ? 'transitionLeftOut' : 'transitionLeftIn'}
        color="text"
        aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        onClick={onToggle}
        css={sidebarToggleBtnStyles}
        display="empty"
        data-test-subj="onechatSidebarToggleBtn"
      />
    </EuiPageHeaderSection>
  );
};
