/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHasActiveConversation } from '../../hooks/use_conversation';
import { ConversationActions } from './conversation_actions';
import {
  ConversationCenter,
  ConversationGrid,
  ConversationLeft,
  ConversationRight,
} from './conversation_grid';
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
  return (
    <ConversationGrid>
      <ConversationLeft>
        <ConversationSidebarToggle isSidebarOpen={isSidebarOpen} onToggle={onToggleSidebar} />
      </ConversationLeft>
      {hasActiveConversation && (
        <>
          <ConversationCenter>
            <ConversationTitle />
          </ConversationCenter>
          <ConversationRight>
            <ConversationActions />
          </ConversationRight>
        </>
      )}
    </ConversationGrid>
  );
};
