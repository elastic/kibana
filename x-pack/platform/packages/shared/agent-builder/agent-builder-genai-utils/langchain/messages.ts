/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import type { BaseMessage, MessageContentComplex } from '@langchain/core/messages';
import { ToolMessage, AIMessage, HumanMessage } from '@langchain/core/messages';
import { isAIMessage } from '@langchain/core/messages';
import type { RunToolReturn } from '@kbn/agent-builder-server';
import { createErrorResult } from '@kbn/agent-builder-server';
import { isArray } from 'lodash';
import { cleanPrompt } from '../prompts';

/**
 * Extract the text content from a langchain message or chunk.
 */
export const extractTextContent = (message: BaseMessage): string => {
  if (typeof message.content === 'string') {
    return message.content;
  } else {
    let content = '';
    for (const item of message.content as MessageContentComplex[]) {
      if (item.type === 'text') {
        content += item.text;
      }
    }
    return content;
  }
};

export interface ToolCall {
  toolCallId: string;
  toolName: string;
  args: Record<string, any>;
}

export interface ToolCallWithReasoning extends ToolCall {
  reasoning?: string;
}

/**
 * Extracts the tool calls from a message.
 */
export const extractToolCalls = (message: BaseMessage): ToolCall[] => {
  if (isAIMessage(message)) {
    return (
      message.tool_calls?.map<ToolCall>((toolCall) => {
        if (!toolCall.id) {
          throw new Error('Tool call must have an id');
        }
        return {
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          args: toolCall.args,
        };
      }) ?? []
    );
  }
  return [];
};

export const extractToolCallsWithReasoning = (message: BaseMessage): ToolCallWithReasoning[] => {
  return extractToolCalls(message).map((toolCall) => {
    const { _reasoning, ...toolCallArgs } = toolCall.args ?? {};
    return {
      ...toolCall,
      args: toolCallArgs,
      reasoning: typeof _reasoning === 'string' ? _reasoning : undefined,
    };
  });
};

/**
 * Extract the structured tool return from a given tool message.
 * Note: this assumes the tool call was performed with the right configuration, so that
 * it was executed from a agentBuilder agent.
 */
export const extractToolReturn = (message: ToolMessage): RunToolReturn => {
  if (message.artifact) {
    if (!isArray(message.artifact.results)) {
      throw new Error(
        `Artifact is not a structured tool artifact. Received artifact=${JSON.stringify(
          message.artifact
        )}`
      );
    }

    return message.artifact as RunToolReturn;
  } else {
    // langchain tool validation error (such as schema errors) are out of our control and don't emit artifacts...
    const content = extractTextContent(message);
    if (content.startsWith('Error:')) {
      return {
        results: [createErrorResult(content)],
      };
    } else {
      throw new Error(`No artifact attached to tool message: ${JSON.stringify(message)}`);
    }
  }
};

export const generateFakeToolCallId = () => {
  return v4().substr(0, 6);
};

export const createUserMessage = (
  content: string,
  { clean = false }: { clean?: boolean } = {}
): HumanMessage => {
  return new HumanMessage({ content: clean ? cleanPrompt(content) : content });
};

export const createAIMessage = (
  content: string,
  { clean = false }: { clean?: boolean } = {}
): AIMessage => {
  return new AIMessage({ content: clean ? cleanPrompt(content) : content });
};

// Wraps tool-result content in a <tool_result> envelope so the model can
// syntactically distinguish trusted instructions from untrusted retrieved content.
export const wrapToolResultContent = (content: string): string => {
  const escaped = content.replace(/<(\/tool_result\s*>)/gi, '<\\$1');
  return `<tool_result>${escaped}</tool_result>`;
};

export const createToolResultMessage = ({
  content,
  toolCallId,
  wrapToolResult = true,
}: {
  content: unknown;
  toolCallId: string;
  wrapToolResult?: boolean;
}): ToolMessage => {
  const serialized = typeof content === 'string' ? content : JSON.stringify(content) ?? '';
  return new ToolMessage({
    content: wrapToolResult ? wrapToolResultContent(serialized) : serialized,
    tool_call_id: toolCallId,
  });
};

export const createToolCallMessage = (
  toolCallOrCalls: ToolCallWithReasoning | ToolCallWithReasoning[],
  message?: string
): AIMessage => {
  const toolCalls = isArray(toolCallOrCalls) ? toolCallOrCalls : [toolCallOrCalls];
  return new AIMessage({
    content: message ?? '',
    tool_calls: toolCalls.map((toolCall) => {
      return {
        id: toolCall.toolCallId,
        name: toolCall.toolName,
        args: toolCall.reasoning
          ? { _reasoning: toolCall.reasoning, ...toolCall.args }
          : toolCall.args,
      };
    }),
  });
};
