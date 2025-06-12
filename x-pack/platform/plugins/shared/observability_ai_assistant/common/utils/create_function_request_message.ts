/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import { MessageRole } from '..';
import { MessageAddEvent, StreamingChatResponseEventType } from '../conversation_complete';

export function createFunctionRequestMessage({
  name,
  args,
}: {
  name: string;
  args?: Record<string, any>;
}): MessageAddEvent {
  return {
    id: v4(),
    type: StreamingChatResponseEventType.MessageAdd as const,
    message: {
      '@timestamp': new Date().toISOString(),
      message: {
        function_call: {
          name,
          arguments: JSON.stringify(args),
          trigger: MessageRole.Assistant as const,
        },
        role: MessageRole.Assistant,
        content: '',
      },
    },
  };
}
