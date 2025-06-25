/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { last } from 'lodash';
import { Message, MessageRole } from '../../../../common';

export function getLastUserMessage(messages: Message[]): string | undefined {
  const lastUserMessage = last(
    messages.filter(
      (message) => message.message.role === MessageRole.User && message.message.name === undefined
    )
  );

  return lastUserMessage?.message.content;
}
