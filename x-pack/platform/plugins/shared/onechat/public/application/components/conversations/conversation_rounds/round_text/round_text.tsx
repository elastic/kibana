/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRoundStep } from '@kbn/onechat-common';
import React from 'react';
import { ChatMessageText } from './chat_message_text';
import { StreamingText } from './streaming_text';

export const RoundText: React.FC<{
  isLoading: boolean;
  content: string;
  steps: ConversationRoundStep[];
}> = ({ isLoading, content, steps }) => {
  if (isLoading) {
    return <StreamingText content={content} steps={steps} />;
  }

  return <ChatMessageText content={content} steps={steps} />;
};
