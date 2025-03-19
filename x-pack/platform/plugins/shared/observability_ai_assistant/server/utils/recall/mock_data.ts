/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Message, MessageRole } from '../../../common';

const sampleMessages: Message[] = [
  {
    '@timestamp': '2025-03-13T14:53:11.240Z',
    message: { role: MessageRole.User, content: 'test' },
  },
];
const normalConversationMessages: Message[] = [
  {
    '@timestamp': '2025-03-12T21:00:13.980Z',
    message: { role: MessageRole.User, content: 'What is my favourite color?' },
  },
  {
    '@timestamp': '2025-03-12T21:00:14.920Z',
    message: {
      function_call: { name: 'context', trigger: MessageRole.Assistant },
      role: MessageRole.Assistant,
      content: '',
    },
  },
];
const contextualInsightsMessages: Message[] = [
  {
    '@timestamp': '2025-03-12T21:01:21.111Z',
    message: {
      role: MessageRole.User,
      content: "I'm looking at an alert and trying to understand why it was triggered",
    },
  },
  {
    '@timestamp': '2025-03-12T21:01:21.111Z',
    message: {
      role: MessageRole.Assistant,
      function_call: {
        name: 'get_contextual_insight_instructions',
        trigger: MessageRole.Assistant,
        arguments: '{}',
      },
    },
  },
  {
    '@timestamp': '2025-03-12T21:01:21.111Z',
    message: {
      role: MessageRole.User,
      content:
        '{"instructions":"I\'m an SRE. I am looking at an alert that was triggered. I want to understand why it was triggered......" }',
      name: 'get_contextual_insight_instructions',
    },
  },
  {
    '@timestamp': '2025-03-12T21:01:21.984Z',
    message: {
      function_call: { name: 'context', trigger: MessageRole.Assistant },
      role: MessageRole.Assistant,
      content: '',
    },
  },
];

export const recallMockData = {
  sampleMessages,
  normalConversationMessages,
  contextualInsightsMessages,
};
