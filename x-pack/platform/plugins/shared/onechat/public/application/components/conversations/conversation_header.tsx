/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import useObservable from 'react-use/lib/useObservable';
import { useHasActiveConversation } from '../../hooks/use_conversation';
import { useOnechatServices } from '../../hooks/use_onechat_service';
import { ConversationActions } from './conversation_actions';
import { ConversationGrid } from './conversation_grid';
import { ConversationSidebarToggle } from './conversation_sidebar/conversation_sidebar_toggle';
import { ConversationTitle } from './conversation_title';
import type { ConversationSettings } from '../../../services/types';

interface ConversationHeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  isSidebarOpen,
  onToggleSidebar,
}) => {
  const hasActiveConversation = useHasActiveConversation();
  const { conversationSettingsService } = useOnechatServices();

  // Subscribe to conversation settings to get the isFlyoutMode
  const conversationSettings = useObservable<ConversationSettings>(
    conversationSettingsService.getConversationSettings$(),
    {}
  );

  const isFlyoutMode = conversationSettings?.isFlyoutMode;

  const headerStyles = css`
    width: 100%;
    align-items: center;
  `;

  // Use flexbox layout for flyout mode, grid layout for non-flyout mode
  const headerContent = isFlyoutMode ? (
    <EuiFlexGroup css={headerStyles} justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <ConversationSidebarToggle isSidebarOpen={isSidebarOpen} onToggle={onToggleSidebar} />
          </EuiFlexItem>
          {hasActiveConversation && (
            <EuiFlexItem grow={false}>
              <ConversationTitle />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ConversationActions />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <ConversationGrid>
      <ConversationSidebarToggle isSidebarOpen={isSidebarOpen} onToggle={onToggleSidebar} />
      {hasActiveConversation && <ConversationTitle />}
      <ConversationActions />
    </ConversationGrid>
  );

  return headerContent;
};
