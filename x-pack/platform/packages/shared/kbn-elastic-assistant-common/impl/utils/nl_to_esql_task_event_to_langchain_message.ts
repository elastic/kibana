/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatCompletionMessageEvent } from '@kbn/inference-common';
import { AIMessage, BaseMessage as LangChainBaseMessage } from '@langchain/core/messages';
import { isEmpty } from 'lodash';

export const nlToEsqlTaskEventToLangchainMessage = (
  taskEvent: ChatCompletionMessageEvent
): LangChainBaseMessage => {
  switch (taskEvent.type) {
    case 'chatCompletionMessage': {
      const toolCalls = taskEvent.toolCalls.map((toolCall) => {
        return {
          name: toolCall.function.name,
          args: toolCall.function.arguments,
          id: toolCall.toolCallId,
          type: 'tool_call',
        } as const;
      });
      return new AIMessage({
        content: taskEvent.content,
        ...(!isEmpty(toolCalls) ? { tool_calls: toolCalls } : {}),
      });
    }
    default: {
      throw new Error(
        `Unable to convert nlToEsqlTaskEvent of type ${taskEvent.type} to LangChain message`
      );
    }
  }
};
