/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompleteResponse } from '@kbn/inference-common';
import { responseToLangchainMessage } from './messages';

describe('responseToLangchainMessage', () => {
  it('carries reasoning on additional_kwargs', () => {
    const response = {
      content: 'answer',
      reasoning: 'thinking...',
      toolCalls: [],
    } as ChatCompleteResponse;

    const message = responseToLangchainMessage(response);

    expect(message.additional_kwargs.reasoning).toEqual('thinking...');
  });

  it('omits additional_kwargs entirely when there is no reasoning or refusal', () => {
    const response = { content: 'answer', toolCalls: [] } as ChatCompleteResponse;

    const message = responseToLangchainMessage(response);

    expect(message.additional_kwargs).toEqual({});
  });
});
