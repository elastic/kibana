/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompleteResponse } from '@kbn/inference-common';
import { AIMessage } from '@langchain/core/messages';

export const responseToLangchainMessage = (response: ChatCompleteResponse): AIMessage => {
  return new AIMessage({
    content: response.content,
    tool_calls: response.toolCalls.map((toolCall) => {
      return {
        id: toolCall.toolCallId,
        name: toolCall.function.name,
        args: toolCall.function.arguments,
        type: 'tool_call',
      };
    }),
  });
};
