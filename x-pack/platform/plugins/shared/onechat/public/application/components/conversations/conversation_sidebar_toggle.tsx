/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiPageHeaderSection } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { conversationsCommonLabels } from './i18n';

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
  onToggle: _onToggle,
}) => {
  const labels = conversationsCommonLabels.header.sidebarToggle;
  return (
    <EuiPageHeaderSection>
      <EuiButtonIcon
        iconType={isSidebarOpen ? 'transitionLeftOut' : 'transitionLeftIn'}
        color="text"
        aria-label={isSidebarOpen ? labels.closeAriaLabel : labels.openAriaLabel}
        onClick={() => {}}
        css={[
          sidebarToggleBtnStyles,
          // TODO: Show the button once the sidebar is implemented
          css`
            display: none;
          `,
        ]}
        display="empty"
        data-test-subj="onechatSidebarToggleBtn"
      />
    </EuiPageHeaderSection>
  );
};
