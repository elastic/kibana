/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ConversationTitle } from './conversation_title';
import { ConversationActions } from './conversation_actions';
import { ConversationGrid } from './conversation_grid';
import { ConversationSidebarToggle } from './conversation_sidebar/conversation_sidebar_toggle';
import { useConversation } from '../../hooks/use_conversation';

interface ConversationHeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  isSidebarOpen,
  onToggleSidebar,
}) => {
  const { conversation, hasActiveConversation } = useConversation();
  return (
    <ConversationGrid>
      <ConversationSidebarToggle isSidebarOpen={isSidebarOpen} onToggle={onToggleSidebar} />
      {hasActiveConversation && (
        <>
          <ConversationTitle title={conversation?.title ?? ''} />
          <ConversationActions />
        </>
      )}
    </ConversationGrid>
  );
};
