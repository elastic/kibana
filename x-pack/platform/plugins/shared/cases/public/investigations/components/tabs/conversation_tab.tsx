/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AgentConversation } from '../conversation/agent_conversation';
import { TeamConversation } from '../conversation/team_conversation';
import { useConversationMode } from '../conversation/use_conversation_mode';
import type { TabProps } from './tab_props';

/**
 * The Conversation tab. With an agent it embeds the real Agent Builder conversation, with
 * threads and claims created from messages; without one it is the team's discussion.
 */
export const ConversationTab: React.FC<TabProps> = ({ record, agentAvailable, openItemId }) => {
  const conversationMode = useConversationMode(record, agentAvailable);

  if (conversationMode.mode === 'team') {
    return <TeamConversation record={record} explanation={conversationMode.explanation} />;
  }
  return (
    <AgentConversation
      record={record}
      mainConversationId={conversationMode.conversationId}
      requestedConversationId={openItemId}
    />
  );
};
ConversationTab.displayName = 'ConversationTab';
