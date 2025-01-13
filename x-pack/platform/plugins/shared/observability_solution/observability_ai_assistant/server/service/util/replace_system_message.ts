/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Message, MessageRole } from '../../../common';

export function replaceSystemMessage(systemMessage: string, messages: Message[]): Message[] {
  return [
    {
      '@timestamp': new Date().toISOString(),
      message: {
        role: MessageRole.System,
        content: systemMessage,
      },
    },
    ...messages.filter((msg) => msg.message.role !== MessageRole.System),
  ];
}
