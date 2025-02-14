/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Message as InferenceMessage,
  MessageContent as InferenceMessageContent,
  MessageRole,
  ToolCall as ToolCallInference,
  generateFakeToolCallId,
} from '@kbn/inference-common';
import {
  type BaseMessage,
  type AIMessage,
  type OpenAIToolCall,
  isAIMessage,
  isFunctionMessage,
  isHumanMessage,
  isSystemMessage,
  isToolMessage,
  MessageContent,
} from '@langchain/core/messages';
import { isMessageContentText, isMessageContentImageUrl } from '../utils/langchain';

// type is not exposed from the lib...
type ToolCall = Required<AIMessage>['tool_calls'][number];

export const messagesToInference = (messages: BaseMessage[]) => {
  return messages.reduce(
    (output, message) => {
      if (isSystemMessage(message)) {
        const content = extractMessageTextContent(message);
        output.system = output.system ? `${output.system}\n${content}` : content;
      }
      if (isHumanMessage(message)) {
        output.messages.push({
          role: MessageRole.User,
          content: convertMessageContent(message),
        });
      }
      if (isAIMessage(message)) {
        output.messages.push({
          role: MessageRole.Assistant,
          content: extractMessageTextContent(message),
          toolCalls: message.tool_calls?.length
            ? message.tool_calls.map(toolCallToInference)
            : message.additional_kwargs?.tool_calls?.length
            ? message.additional_kwargs.tool_calls.map(legacyToolCallToInference)
            : undefined,
        });
      }
      if (isToolMessage(message)) {
        output.messages.push({
          role: MessageRole.Tool,
          // langchain does not have the function name on tool messages
          name: message.tool_call_id,
          toolCallId: message.tool_call_id,
          response: toolResponseContentToInference(message.content),
        });
      }

      if (isFunctionMessage(message) && message.additional_kwargs.function_call) {
        output.messages.push({
          role: MessageRole.Tool,
          name: message.additional_kwargs.function_call.name,
          toolCallId: generateFakeToolCallId(),
          response: toolResponseContentToInference(message.content),
        });
      }

      return output;
    },
    { messages: [], system: undefined } as {
      messages: InferenceMessage[];
      system: string | undefined;
    }
  );
};

const toolResponseContentToInference = (toolResponse: MessageContent) => {
  const content =
    typeof toolResponse === 'string'
      ? toolResponse
      : toolResponse
          .filter(isMessageContentText)
          .map((part) => part.text)
          .join('\n');

  try {
    return JSON.parse(content);
  } catch (e) {
    return { response: content };
  }
};

const toolCallToInference = (toolCall: ToolCall): ToolCallInference => {
  return {
    toolCallId: toolCall.id ?? generateFakeToolCallId(),
    function: {
      name: toolCall.name,
      arguments: toolCall.args,
    },
  };
};

const legacyToolCallToInference = (toolCall: OpenAIToolCall): ToolCallInference => {
  return {
    toolCallId: toolCall.id,
    function: {
      name: toolCall.function.name,
      arguments: { args: toolCall.function.arguments },
    },
  };
};

const extractMessageTextContent = (message: BaseMessage): string => {
  if (typeof message.content === 'string') {
    return message.content;
  }
  return message.content
    .filter(isMessageContentText)
    .map((part) => part.text)
    .join('\n');
};

const convertMessageContent = (message: BaseMessage): InferenceMessageContent => {
  if (typeof message.content === 'string') {
    return message.content;
  }
  return message.content.reduce((messages, part) => {
    if (isMessageContentText(part)) {
      messages.push({
        type: 'text',
        text: part.text,
      });
    } else if (isMessageContentImageUrl(part)) {
      const imageUrl = typeof part.image_url === 'string' ? part.image_url : part.image_url.url;
      messages.push({
        type: 'image',
        source: {
          data: imageUrl,
          mimeType: '',
        },
      });
    }
    return messages;
  }, [] as Exclude<InferenceMessageContent, string>);
};
