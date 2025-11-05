/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTokenCountFromBedrockInvoke } from './get_token_count_from_bedrock_invoke';

describe('getTokenCountFromBedrockInvoke', () => {
  const body = JSON.stringify({
    prompt: `\n\nAssistant: This is a system message\n\nHuman: This is a user message\n\nAssistant:`,
  });

  const PROMPT_TOKEN_COUNT = 27;
  const COMPLETION_TOKEN_COUNT = 4;

  it('counts the prompt tokens from deprecated api', async () => {
    const tokens = await getTokenCountFromBedrockInvoke({
      response: 'This is a response',
      body,
    });
    expect(tokens.prompt).toBe(PROMPT_TOKEN_COUNT);
    expect(tokens.completion).toBe(COMPLETION_TOKEN_COUNT);
    expect(tokens.total).toBe(PROMPT_TOKEN_COUNT + COMPLETION_TOKEN_COUNT);
  });
  it('counts the prompt tokens from latest api', async () => {
    const tokens = await getTokenCountFromBedrockInvoke({
      response: 'This is a response',
      body,
      usage: {
        input_tokens: 43,
        output_tokens: 12,
      },
    });
    expect(tokens.prompt).toBe(43);
    expect(tokens.completion).toBe(12);
    expect(tokens.total).toBe(43 + 12);
  });
});
