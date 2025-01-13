/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Message, MessageRole } from '../../common';

export function getContextualInsightMessages({
  message,
  instructions,
}: {
  message: string;
  instructions: string;
}): Message[] {
  return [
    {
      '@timestamp': new Date().toISOString(),
      message: {
        role: MessageRole.User,
        content: message,
      },
    },
    {
      '@timestamp': new Date().toISOString(),
      message: {
        role: MessageRole.Assistant,
        function_call: {
          name: 'get_contextual_insight_instructions',
          trigger: MessageRole.Assistant,
          arguments: JSON.stringify({}),
        },
      },
    },
    {
      '@timestamp': new Date().toISOString(),
      message: {
        role: MessageRole.User,
        content: JSON.stringify({
          instructions,
        }),
        name: 'get_contextual_insight_instructions',
      },
    },
  ];
}
