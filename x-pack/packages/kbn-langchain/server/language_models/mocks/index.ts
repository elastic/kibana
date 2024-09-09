/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type OpenAI from 'openai';

export const mockActionResponse = {
  message: 'Yes, your name is Andrew. How can I assist you further, Andrew?',
  usage: { prompt_tokens: 4, completion_tokens: 10, total_tokens: 14 },
};

export const mockChatCompletion: OpenAI.ChatCompletion = {
  id: 'abc123',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: 'Yes, your name is Andrew. How can I assist you further, Andrew?',
      },
      finish_reason: 'stop',
      logprobs: null,
    },
  ],
  created: 1684572400, // Unix timestamp example: May 20, 2023
  model: 'gpt-4',
  object: 'chat.completion',
  system_fingerprint: 'fingerprint123',
  usage: {
    prompt_tokens: 10,
    completion_tokens: 15,
    total_tokens: 25,
  },
};
