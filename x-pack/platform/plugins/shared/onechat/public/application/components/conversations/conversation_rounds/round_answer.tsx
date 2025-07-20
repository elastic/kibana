/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ConversationRound } from '@kbn/onechat-common';
import { ChatMessageText } from './chat_message_text';
import { RoundSteps } from './round_steps';

export interface RoundAnswerProps {
  round: ConversationRound;
}

export const RoundAnswer: React.FC<RoundAnswerProps> = ({ round }) => {
  const { response } = round;

  return (
    <>
      <RoundSteps round={round} />
      <ChatMessageText content={response?.message ?? ''} />
    </>
  );
};
