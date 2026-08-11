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
  type ChatCompletionChunkEvent,
  type ChatCompletionTokenCount,
  type ChatCompleteResponse,
  type ToolDefinition,
} from '@kbn/inference-common';

/**
 * OpenAI message types
 */
interface OpenAiSystemMessage {
  role: 'system';
  content: string;
}

interface OpenAiUserMessage {
  role: 'user';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface OpenAiAssistantMessage {
  role: 'assistant';
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

interface OpenAiToolMessage {
  role: 'tool';
  content: string;
  tool_call_id: string;
}

export type OpenAiMessage =
  | OpenAiSystemMessage
  | OpenAiUserMessage
  | OpenAiAssistantMessage
  | OpenAiToolMessage;

interface OpenAiTool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

/**
 * Converts OpenAI messages to inference Messages, extracting system messages separately.
 */
export const openAiMessagesToInference = (
  messages: OpenAiMessage[]
): { system?: string; messages: Message[] } => {
  const systemMessages: string[] = [];
  const inferenceMessages: Message[] = [];

  for (const msg of messages) {
    switch (msg.role) {
      case 'system':
        systemMessages.push(msg.content);
        break;
      case 'user':
        inferenceMessages.push(convertUserMessage(msg));
        break;
      case 'assistant':
        inferenceMessages.push(convertAssistantMessage(msg));
        break;
      case 'tool':
        inferenceMessages.push(convertToolMessage(msg));
        break;
    }
  }

  return {
    system: systemMessages.length > 0 ? systemMessages.join('\n\n') : undefined,
    messages: inferenceMessages,
  };
};

const convertUserMessage = (msg: OpenAiUserMessage): UserMessage => {
  if (typeof msg.content === 'string') {
    return { role: MessageRole.User, content: msg.content };
  }

  const parts = msg.content.map((part) => {
    if (part.type === 'text' && part.text) {
      return { type: 'text' as const, text: part.text };
    }
    if (part.type === 'image_url' && part.image_url?.url) {
      const { url } = part.image_url;
      // Handle data URIs: data:image/png;base64,...
      if (url.startsWith('data:')) {
        const match = url.match(/^data:(image\/[^;]+);base64,(.+)$/);
        if (match) {
          return {
            type: 'image' as const,
            source: { data: match[2], mimeType: match[1] },
          };
        }
      }
      // For non-data URIs, pass as text (inference API doesn't support URL images directly)
      return { type: 'text' as const, text: `[Image: ${url}]` };
    }
    return { type: 'text' as const, text: '' };
  });

  return { role: MessageRole.User, content: parts };
};

const convertAssistantMessage = (msg: OpenAiAssistantMessage): AssistantMessage => {
  const toolCalls = msg.tool_calls?.map((tc) => {
    let args: Record<string, unknown>;
    try {
      args = JSON.parse(tc.function.arguments);
    } catch {
      args = {};
    }
    return {
      toolCallId: tc.id,
      function: {
        name: tc.function.name,
        arguments: args,
      },
    };
  });

  if (toolCalls && toolCalls.length > 0) {
    return {
      role: MessageRole.Assistant,
      content: msg.content ?? null,
      toolCalls,
    };
  }

  return {
    role: MessageRole.Assistant,
    content: msg.content ?? null,
  };
};

const convertToolMessage = (msg: OpenAiToolMessage): ToolMessage => {
  let toolResponse: string | Record<string, unknown>;
  try {
    const parsed = JSON.parse(msg.content);
    // Only use parsed result if it's a plain object — the inference API
    // accepts string or Record<string, unknown> but not arrays, numbers, etc.
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      toolResponse = parsed;
    } else {
      toolResponse = msg.content;
    }
  } catch {
    toolResponse = msg.content;
  }

  return {
    role: MessageRole.Tool,
    toolCallId: msg.tool_call_id,
    response: toolResponse,
    name: '',
  };
};

/**
 * Convert OpenAI tool definitions to inference ToolOptions.
 */
export const openAiToolsToInference = (
  tools?: OpenAiTool[]
): Record<string, ToolDefinition> | undefined => {
  if (!tools || tools.length === 0) {
    return undefined;
  }

  const result: Record<string, ToolDefinition> = {};
  for (const tool of tools) {
    if (tool.type === 'function') {
      result[tool.function.name] = {
        description: tool.function.description ?? '',
        ...(tool.function.parameters
          ? { schema: tool.function.parameters as unknown as ToolDefinition['schema'] }
          : {}),
      };
    }
  }
  return result;
};

/**
 * Convert an inference ChatCompletionChunkEvent to an OpenAI streaming chunk.
 */
export const inferenceChunkToOpenAi = (
  chunk: ChatCompletionChunkEvent,
  model: string,
  completionId: string
): object => {
  const delta: Record<string, unknown> = {};

  if (chunk.content) {
    delta.content = chunk.content;
  }

  if (chunk.tool_calls && chunk.tool_calls.length > 0) {
    delta.tool_calls = chunk.tool_calls.map((tc) => ({
      index: tc.index,
      id: tc.toolCallId || undefined,
      type: tc.toolCallId ? 'function' : undefined,
      function: {
        name: tc.function.name || undefined,
        arguments: tc.function.arguments || undefined,
      },
    }));
  }

  return {
    id: completionId,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        delta,
        finish_reason: null,
      },
    ],
  };
};

/**
 * Create the final streaming chunk with finish_reason.
 */
export const createFinalChunk = (
  model: string,
  completionId: string,
  hasToolCalls: boolean,
  tokenCount?: ChatCompletionTokenCount
): object => {
  const chunk: Record<string, unknown> = {
    id: completionId,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        delta: {},
        finish_reason: hasToolCalls ? 'tool_calls' : 'stop',
      },
    ],
  };

  if (tokenCount) {
    chunk.usage = {
      prompt_tokens: tokenCount.prompt,
      completion_tokens: tokenCount.completion,
      total_tokens: tokenCount.total,
    };
  }

  return chunk;
};

/**
 * Convert a non-streaming inference ChatCompleteResponse to OpenAI ChatCompletion format.
 */
export const inferenceResponseToOpenAi = (
  response: ChatCompleteResponse,
  model: string
): object => {
  const message: Record<string, unknown> = {
    role: 'assistant',
    content: response.content ?? '',
  };

  if (response.toolCalls && response.toolCalls.length > 0) {
    message.tool_calls = response.toolCalls.map((tc) => ({
      id: tc.toolCallId,
      type: 'function',
      function: {
        name: tc.function.name,
        arguments: JSON.stringify(tc.function.arguments),
      },
    }));
  }

  const hasToolCalls = response.toolCalls && response.toolCalls.length > 0;

  return {
    id: `chatcmpl-${uuidv4()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message,
        finish_reason: hasToolCalls ? 'tool_calls' : 'stop',
      },
    ],
    usage: response.tokens
      ? {
          prompt_tokens: response.tokens.prompt,
          completion_tokens: response.tokens.completion,
          total_tokens: response.tokens.total,
        }
      : undefined,
  };
};

/**
 * Create an OpenAI-compatible error response that AI SDKs can parse.
 * Always includes choices[0].message so the SDK doesn't crash on missing content.
 */
export const createErrorResponse = (errorMessage: string, model: string): object => {
  return {
    id: `chatcmpl-${uuidv4()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: `Error: ${errorMessage}`,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  };
};
