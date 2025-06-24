/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ConversationRound } from '@kbn/onechat-common';
import { ChatConversationRound } from './conversation_round';

interface ChatConversationProps {
  conversationRounds: ConversationRound[];
}

export const ChatConversation: React.FC<ChatConversationProps> = ({ conversationRounds }) => {
  return (
    <>
      {conversationRounds.map((round, index) => {
        return <ChatConversationRound key={index} round={round} />;
      })}
    </>
  );
};
