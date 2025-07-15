/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Conversation } from '@kbn/onechat-common';
import { ConversationSections } from './conversation_sections';

const sidebarStyles = css`
  height: 100%;
  overflow-y: auto;
`;
const loadingStyles = css`
  align-self: center;
  justify-content: center;
`;

interface ConversationsSidebarProps {
  conversations: Conversation[];
  isLoading: boolean;
}

export const ConversationSidebar: React.FC<ConversationsSidebarProps> = ({
  conversations,
  isLoading,
}) => {
  return (
    <EuiFlexGroup
      css={sidebarStyles}
      direction="column"
      gutterSize="l"
      aria-label={i18n.translate('xpack.onechat.conversationSidebar.conversations', {
        defaultMessage: 'Conversations',
      })}
    >
      {isLoading ? (
        <EuiFlexItem css={loadingStyles}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
      ) : (
        <ConversationSections conversations={conversations} />
      )}
    </EuiFlexGroup>
  );
};
