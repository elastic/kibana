/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ConversationRound } from '@kbn/onechat-common';
import { ChatMessageText } from './chat_message_text';

interface RoundTabAnswerProps {
  round: ConversationRound;
}

export const RoundTabAnswer: React.FC<RoundTabAnswerProps> = ({ round }) => {
  const { assistantResponse } = round;
  return <ChatMessageText content={assistantResponse?.message ?? ''} />;
};
