/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  MessageRole,
  type Message,
  type UserMessage,
  type AssistantMessage,
  type ToolMessage,
} from '@kbn/inference-common';
import type {
  ChatCompletionChunkEvent,
  ChatCompletionTokenCount,
} from '@kbn/inference-common/src/chat_complete';
import type { ChatCompleteResponse } from '@kbn/inference-common/src/chat_complete';
import type { ToolDefinition } from '@kbn/inference-common/src/chat_complete';

/**
 * Anthropic message content block types
 */
interface AnthropicTextBlock {
  type: 'text';
  text: string;
}

interface AnthropicImageBlock {
  type: 'image';
  source: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

interface AnthropicToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface AnthropicToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string | Array<{ type: 'text'; text: string }>;
}

type AnthropicContentBlock =
  | AnthropicTextBlock
  | AnthropicImageBlock
  | AnthropicToolUseBlock
  | AnthropicToolResultBlock;

interface AnthropicUserMessage {
  role: 'user';
  content: string | AnthropicContentBlock[];
}

interface AnthropicAssistantMessage {
  role: 'assistant';
  content: string | AnthropicContentBlock[];
}

export type AnthropicMessage = AnthropicUserMessage | AnthropicAssistantMessage;

interface AnthropicTool {
  name: string;
  description?: string;
  input_schema?: Record<string, unknown>;
}

/**
 * Converts Anthropic messages to inference Messages, using the separate system parameter.
 */
export const anthropicMessagesToInference = (
  messages: AnthropicMessage[],
  system?: string | Array<{ type: 'text'; text: string }>
): { system?: string; messages: Message[] } => {
  const systemText = Array.isArray(system)
    ? system.map((b) => b.text).join('\n\n')
    : system;

  const inferenceMessages: Message[] = [];

  for (const msg of messages) {
    if (msg.role === 'user') {
      inferenceMessages.push(convertUserMessage(msg));
    } else if (msg.role === 'assistant') {
      inferenceMessages.push(convertAssistantMessage(msg));
    }
  }

  return {
    system: systemText || undefined,
    messages: inferenceMessages,
  };
};

const convertUserMessage = (msg: AnthropicUserMessage): UserMessage | ToolMessage => {
  if (typeof msg.content === 'string') {
    return { role: MessageRole.User, content: msg.content };
  }

  // Check if this is a tool_result message (Anthropic wraps tool results in user messages)
  const toolResults = msg.content.filter(
    (b): b is AnthropicToolResultBlock => b.type === 'tool_result'
  );
  if (toolResults.length === 1 && msg.content.length === 1) {
    const tr = toolResults[0];
    const responseText =
      typeof tr.content === 'string'
        ? tr.content
        : tr.content.map((b) => b.text).join('\n');
    let response: string | Record<string, unknown>;
    try {
      response = JSON.parse(responseText);
    } catch {
      response = responseText;
    }
    return {
      role: MessageRole.Tool,
      toolCallId: tr.tool_use_id,
      response,
      name: '',
    };
  }

  // Mixed content or text/image blocks
  const parts = msg.content.map((block) => {
    if (block.type === 'text') {
      return { type: 'text' as const, text: block.text };
    }
    if (block.type === 'image') {
      return {
        type: 'image' as const,
        source: { data: block.source.data, mimeType: block.source.media_type },
      };
    }
    if (block.type === 'tool_result') {
      const text =
        typeof block.content === 'string'
          ? block.content
          : block.content.map((b) => b.text).join('\n');
      return { type: 'text' as const, text: `[Tool result for ${block.tool_use_id}]: ${text}` };
    }
    return { type: 'text' as const, text: '' };
  });

  return { role: MessageRole.User, content: parts };
};

const convertAssistantMessage = (msg: AnthropicAssistantMessage): AssistantMessage => {
  if (typeof msg.content === 'string') {
    return { role: MessageRole.Assistant, content: msg.content };
  }

  const textParts = msg.content
    .filter((b): b is AnthropicTextBlock => b.type === 'text')
    .map((b) => b.text);

  const toolUses = msg.content.filter(
    (b): b is AnthropicToolUseBlock => b.type === 'tool_use'
  );

  if (toolUses.length > 0) {
    return {
      role: MessageRole.Assistant,
      content: textParts.join('') || null,
      toolCalls: toolUses.map((tu) => ({
        toolCallId: tu.id,
        function: {
          name: tu.name,
          arguments: tu.input,
        },
      })),
    };
  }

  return {
    role: MessageRole.Assistant,
    content: textParts.join('') || null,
  };
};

/**
 * Convert Anthropic tool definitions to inference ToolOptions.
 */
export const anthropicToolsToInference = (
  tools?: AnthropicTool[]
): Record<string, ToolDefinition> | undefined => {
  if (!tools || tools.length === 0) {
    return undefined;
  }

  const result: Record<string, ToolDefinition> = {};
  for (const tool of tools) {
    result[tool.name] = {
      description: tool.description ?? '',
      ...(tool.input_schema
        ? { schema: tool.input_schema as ToolDefinition['schema'] }
        : {}),
    };
  }
  return result;
};

/**
 * Convert an inference ChatCompletionChunkEvent to Anthropic SSE events.
 * Anthropic streaming uses multiple event types.
 */
export const inferenceChunkToAnthropicEvents = (
  chunk: ChatCompletionChunkEvent,
  contentBlockIndex: number
): string[] => {
  const events: string[] = [];

  if (chunk.content) {
    events.push(
      formatSSE('content_block_delta', {
        type: 'content_block_delta',
        index: contentBlockIndex,
        delta: { type: 'text_delta', text: chunk.content },
      })
    );
  }

  if (chunk.tool_calls) {
    for (const tc of chunk.tool_calls) {
      if (tc.function?.arguments) {
        events.push(
          formatSSE('content_block_delta', {
            type: 'content_block_delta',
            index: tc.index + contentBlockIndex + 1,
            delta: { type: 'input_json_delta', partial_json: tc.function.arguments },
          })
        );
      }
    }
  }

  return events;
};

/**
 * Create the Anthropic message_start event.
 */
export const createMessageStartEvent = (
  messageId: string,
  model: string,
  inputTokens: number
): string => {
  return formatSSE('message_start', {
    type: 'message_start',
    message: {
      id: messageId,
      type: 'message',
      role: 'assistant',
      content: [],
      model,
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: inputTokens, output_tokens: 0 },
    },
  });
};

/**
 * Create an Anthropic content_block_start event.
 */
export const createContentBlockStartEvent = (
  index: number,
  block: { type: string; text?: string; id?: string; name?: string; input?: unknown }
): string => {
  return formatSSE('content_block_start', {
    type: 'content_block_start',
    index,
    content_block: block,
  });
};

/**
 * Create an Anthropic content_block_stop event.
 */
export const createContentBlockStopEvent = (index: number): string => {
  return formatSSE('content_block_stop', {
    type: 'content_block_stop',
    index,
  });
};

/**
 * Create the Anthropic message_delta event (final).
 */
export const createMessageDeltaEvent = (
  stopReason: string,
  outputTokens: number
): string => {
  return formatSSE('message_delta', {
    type: 'message_delta',
    delta: { stop_reason: stopReason, stop_sequence: null },
    usage: { output_tokens: outputTokens },
  });
};

/**
 * Create the Anthropic message_stop event.
 */
export const createMessageStopEvent = (): string => {
  return formatSSE('message_stop', { type: 'message_stop' });
};

/**
 * Convert a non-streaming inference response to Anthropic Message format.
 */
export const inferenceResponseToAnthropic = (
  response: ChatCompleteResponse,
  model: string
): object => {
  const content: Array<Record<string, unknown>> = [];

  if (response.content) {
    content.push({ type: 'text', text: response.content });
  }

  if (response.toolCalls && response.toolCalls.length > 0) {
    for (const tc of response.toolCalls) {
      content.push({
        type: 'tool_use',
        id: tc.toolCallId,
        name: tc.function.name,
        input: tc.function.arguments,
      });
    }
  }

  const hasToolCalls = response.toolCalls && response.toolCalls.length > 0;

  return {
    id: `msg_${uuidv4()}`,
    type: 'message',
    role: 'assistant',
    content,
    model,
    stop_reason: hasToolCalls ? 'tool_use' : 'end_turn',
    stop_sequence: null,
    usage: response.tokens
      ? {
          input_tokens: response.tokens.prompt,
          output_tokens: response.tokens.completion,
        }
      : { input_tokens: 0, output_tokens: 0 },
  };
};

/**
 * Extract the last user message text from Anthropic messages for conversation recording.
 */
export const getLastUserMessageFromAnthropic = (messages: AnthropicMessage[]): string | undefined => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'user') {
      if (typeof msg.content === 'string') {
        return msg.content;
      }
      const textBlocks = msg.content.filter(
        (b): b is AnthropicTextBlock => b.type === 'text'
      );
      if (textBlocks.length > 0) {
        return textBlocks.map((b) => b.text).join('\n');
      }
    }
  }
  return undefined;
};

const formatSSE = (event: string, data: object): string => {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
};
