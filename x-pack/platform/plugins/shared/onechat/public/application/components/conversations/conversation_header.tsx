/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHasActiveConversation } from '../../hooks/use_conversation';
import { ConversationActions } from './conversation_actions';
import { ConversationSidebarToggle } from './conversation_sidebar/conversation_sidebar_toggle';
import { ConversationTitle } from './conversation_title';
import { ConversationHeaderLayout } from './layouts/conversation_header_layout';

interface ConversationHeaderProps {
  sidebar?: {
    isOpen: boolean;
    onToggle: () => void;
  };
}

export const ConversationHeader: React.FC<ConversationHeaderProps> = ({ sidebar }) => {
  const hasActiveConversation = useHasActiveConversation();

  return (
    <ConversationHeaderLayout
      left={
        sidebar ? (
          <ConversationSidebarToggle isSidebarOpen={sidebar.isOpen} onToggle={sidebar.onToggle} />
        ) : undefined
      }
      center={hasActiveConversation ? <ConversationTitle /> : undefined}
      right={hasActiveConversation ? <ConversationActions /> : undefined}
    />
  );
};
