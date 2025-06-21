/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { ConversationRound } from '@kbn/onechat-common';
import { ConversationEvent } from '../../../../../common/conversation_events';
import { ChatConversationRound } from './conversation_round';
import { getConversationRounds } from '../../../utils/conversation_rounds';

interface ChatConversationProps {
  conversationRounds: ConversationRound[];
  conversationEvents: ConversationEvent[];
}

export const ChatConversation: React.FC<ChatConversationProps> = ({
  conversationRounds,
  conversationEvents,
}) => {
  const rounds = useMemo(() => {
    const pendingRounds = getConversationRounds({ conversationEvents });
    return [...conversationRounds, ...pendingRounds];
  }, [conversationRounds, conversationEvents]);

  return (
    <>
      {rounds.map((round, index) => {
        return <ChatConversationRound key={index} round={round} />;
      })}
    </>
  );
};
