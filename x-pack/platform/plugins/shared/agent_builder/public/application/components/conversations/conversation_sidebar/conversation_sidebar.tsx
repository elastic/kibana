/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  useEuiOverflowScroll,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useConversationList } from '../../../hooks/use_conversation_list';
import { ConversationSections } from './conversation_sections';
import { ConversationSidebarNav } from './conversation_sidebar_nav';

const sidebarContainerStyles = css`
  block-size: 100%;
`;
const loadingStyles = css`
  align-self: center;
  justify-content: center;
`;

export const ConversationSidebar: React.FC = () => {
  const { conversations = [], isLoading } = useConversationList();
  const { euiTheme } = useEuiTheme();
  const scrollStyles = css`
    ${useEuiOverflowScroll('y')}
  `;
  const conversationsContainerStyles = css`
    padding: ${euiTheme.size.base};
  `;
  return (
    <EuiFlexGroup css={sidebarContainerStyles} direction="column">
      {isLoading ? (
        <EuiFlexItem css={loadingStyles}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
      ) : (
        <EuiFlexItem css={scrollStyles}>
          <EuiFlexGroup
            css={conversationsContainerStyles}
            direction="column"
            gutterSize="l"
            aria-label={i18n.translate('xpack.agentBuilder.conversationSidebar.conversations', {
              defaultMessage: 'Conversations',
            })}
          >
            <ConversationSections conversations={conversations} />
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <ConversationSidebarNav />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
