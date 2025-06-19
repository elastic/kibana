/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { last } from 'lodash';
import { Message, MessageRole } from '../../common';

export function replaceLastUserMessage({
  messages,
  newMessageContent,
  logger,
}: {
  messages: Message[];
  newMessageContent: string;
  logger: Logger;
}): Message[] {
  const lastMessage = last(messages);

  const userMessageFunctionName = lastMessage?.message.name;
  const newUserMessage: Message = {
    '@timestamp': new Date().toISOString(),
    message: {
      role: MessageRole.User,
      content: userMessageFunctionName ? JSON.stringify(newMessageContent) : newMessageContent,
      ...(userMessageFunctionName ? { name: userMessageFunctionName } : {}),
    },
  };

  return [
    ...(lastMessage?.message.role === MessageRole.User ? messages.slice(0, -1) : messages), // remove the last user message if it exists
    newUserMessage, // add the new user message
  ];
}
