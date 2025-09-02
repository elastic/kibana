/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyoutHeader } from '@elastic/eui';
import useObservable from 'react-use/lib/useObservable';
import { useHasActiveConversation } from '../../hooks/use_conversation';
import { useOnechatServices } from '../../hooks/use_onechat_service';
import { ConversationActions } from './conversation_actions';
import { ConversationGrid } from './conversation_grid';
import { ConversationSidebarToggle } from './conversation_sidebar/conversation_sidebar_toggle';
import { ConversationTitle } from './conversation_title';

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
  const conversationSettings = useObservable(
    conversationSettingsService.getConversationSettings$(),
    {}
  );

  const isFlyoutMode = conversationSettings?.isFlyoutMode;

  const headerContent = (
    <ConversationGrid>
      <ConversationSidebarToggle isSidebarOpen={isSidebarOpen} onToggle={onToggleSidebar} />
      {hasActiveConversation && <ConversationTitle />}
      <ConversationActions />
    </ConversationGrid>
  );

  // Conditionally wrap with EuiFlyoutHeader if in flyout mode
  if (isFlyoutMode) {
    return <EuiFlyoutHeader hasBorder>{headerContent}</EuiFlyoutHeader>;
  }

  return headerContent;
};
