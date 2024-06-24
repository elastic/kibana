/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// origin: https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-community/src/utils/bedrock/anthropic.ts
// Error: Package subpath './dist/utils/bedrock/anthropic' is not defined by "exports" in langchain/community/package.json

import { Logger } from '@kbn/logging';
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  MessageContent,
  SystemMessage,
  ToolMessage,
  isAIMessage,
} from '@langchain/core/messages';
import { ToolCall } from '@langchain/core/messages/tool';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractToolCalls(content: Array<Record<string, any>>) {
  const toolCalls: ToolCall[] = [];
  for (const block of content) {
    if (block.type === 'tool_use') {
      toolCalls.push({ name: block.name, args: block.input, id: block.id });
    }
  }
  return toolCalls;
}

function _formatImage(imageUrl: string) {
  const regex = /^data:(image\/.+);base64,(.+)$/;
  const match = imageUrl.match(regex);
  if (match === null) {
    throw new Error(
      [
        'Anthropic only supports base64-encoded images currently.',
        'Example: data:image/png;base64,/9j/4AAQSk...',
      ].join('\n\n')
    );
  }
  return {
    type: 'base64',
    media_type: match[1] ?? '',
    data: match[2] ?? '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function _mergeMessages(messages: BaseMessage[]): Array<SystemMessage | HumanMessage | AIMessage> {
  // Merge runs of human/tool messages into single human messages with content blocks.
  const merged: HumanMessage[] = [];
  for (const message of messages) {
    if (message._getType() === 'tool') {
      if (typeof message.content === 'string') {
        merged.push(
          new HumanMessage({
            content: [
              {
                type: 'tool_result',
                content: message.content,
                tool_use_id: (message as ToolMessage).tool_call_id,
              },
            ],
          })
        );
      } else {
        merged.push(new HumanMessage({ content: message.content }));
      }
    } else {
      const previousMessage = merged[merged.length - 1];
      if (previousMessage?._getType() === 'human' && message._getType() === 'human') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let combinedContent: Array<Record<string, any>>;
        if (typeof previousMessage.content === 'string') {
          combinedContent = [{ type: 'text', text: previousMessage.content }];
        } else {
          combinedContent = previousMessage.content;
        }
        if (typeof message.content === 'string') {
          combinedContent.push({ type: 'text', text: message.content });
        } else {
          combinedContent = combinedContent.concat(message.content);
        }
        previousMessage.content = combinedContent;
      } else {
        merged.push(message);
      }
    }
  }
  return merged;
}

export function _convertLangChainToolCallToAnthropic(
  toolCall: ToolCall
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  if (toolCall.id === undefined) {
    throw new Error(`Anthropic requires all tool calls to have an "id".`);
  }
  return {
    type: 'tool_use',
    id: toolCall.id,
    name: toolCall.name,
    input: toolCall.args,
  };
}

function _formatContent(content: MessageContent) {
  if (typeof content === 'string') {
    return content;
  } else {
    const contentBlocks = content.map((contentPart) => {
      if (contentPart.type === 'image_url') {
        let source;
        if (typeof contentPart.image_url === 'string') {
          source = _formatImage(contentPart.image_url);
        } else {
          source = _formatImage(contentPart.image_url.url);
        }
        return {
          type: 'image' as const, // Explicitly setting the type as "image"
          source,
        };
      } else if (contentPart.type === 'text') {
        // Assuming contentPart is of type MessageContentText here
        return {
          type: 'text' as const, // Explicitly setting the type as "text"
          text: contentPart.text,
        };
      } else if (contentPart.type === 'tool_use' || contentPart.type === 'tool_result') {
        // TODO: Fix when SDK types are fixed
        return {
          ...contentPart,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
      } else {
        throw new Error('Unsupported message content format');
      }
    });
    return contentBlocks;
  }
}

export function formatMessagesForAnthropic(
  messages: BaseMessage[],
  logger?: Logger
): {
  system?: string;
  messages: Array<Record<string, unknown>>;
} {
  const mergedMessages = _mergeMessages(messages);
  let system: string | undefined;
  if (mergedMessages.length > 0 && mergedMessages[0]._getType() === 'system') {
    if (typeof messages[0].content !== 'string') {
      throw new Error('System message content must be a string.');
    }
    system = messages[0].content;
  }
  const conversationMessages = system !== undefined ? mergedMessages.slice(1) : mergedMessages;
  const formattedMessages = conversationMessages.map((message) => {
    let role;
    if (message._getType() === 'human') {
      role = 'user' as const;
    } else if (message._getType() === 'ai') {
      role = 'assistant' as const;
    } else if (message._getType() === 'tool') {
      role = 'user' as const;
    } else if (message._getType() === 'system') {
      throw new Error('System messages are only permitted as the first passed message.');
    } else {
      throw new Error(`Message type "${message._getType()}" is not supported.`);
    }
    if (isAIMessage(message) && !!message.tool_calls?.length) {
      if (typeof message.content === 'string') {
        if (message.content === '') {
          return {
            role,
            content: message.tool_calls.map(_convertLangChainToolCallToAnthropic),
          };
        } else {
          return {
            role,
            content: [
              { type: 'text', text: message.content },
              ...message.tool_calls.map(_convertLangChainToolCallToAnthropic),
            ],
          };
        }
      } else {
        const { content } = message;
        const hasMismatchedToolCalls = !message.tool_calls.every((toolCall) =>
          content.find(
            (contentPart) => contentPart.type === 'tool_use' && contentPart.id === toolCall.id
          )
        );
        if (hasMismatchedToolCalls) {
          logger?.warn(
            `The "tool_calls" field on a message is only respected if content is a string.`
          );
        }
        return {
          role,
          content: _formatContent(message.content),
        };
      }
    } else {
      return {
        role,
        content: _formatContent(message.content),
      };
    }
  });
  return {
    messages: formattedMessages,
    system,
  };
}

export function isAnthropicTool(tool: unknown): tool is Record<string, unknown> {
  if (typeof tool !== 'object' || !tool) return false;
  return 'input_schema' in tool;
}
