/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import { MessageRole } from '..';
import { type MessageAddEvent, StreamingChatResponseEventType } from '../conversation_complete';

export function createFunctionResponseMessage({
  name,
  content,
  data,
}: {
  name: string;
  content: unknown;
  data?: unknown;
}): MessageAddEvent {
  return {
    id: v4(),
    type: StreamingChatResponseEventType.MessageAdd as const,
    message: {
      '@timestamp': new Date().toISOString(),
      message: {
        content: JSON.stringify(content),
        ...(data ? { data: JSON.stringify(data) } : {}),
        name,
        role: MessageRole.User,
      },
    },
  };
}
