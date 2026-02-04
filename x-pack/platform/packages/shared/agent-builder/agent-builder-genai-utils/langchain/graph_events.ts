/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamEvent as LangchainStreamEvent } from '@langchain/core/tracers/log_stream';
import type {
  MessageChunkEvent,
  MessageCompleteEvent,
  ReasoningEvent,
  ThinkingCompleteEvent,
  ToolCallEvent,
  PromptRequestEvent,
  BrowserToolCallEvent,
  ToolResultEvent,
} from '@kbn/agent-builder-common/chat/events';
import { ChatEventType } from '@kbn/agent-builder-common';
import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { PromptRequestSource, PromptRequest } from '@kbn/agent-builder-common/agents/prompts';

export const isStreamEvent = (input: any): input is LangchainStreamEvent => {
  return 'event' in input && 'name' in input;
};

export const matchGraphName = (event: LangchainStreamEvent, graphName: string): boolean => {
  return event.metadata.graphName === graphName;
};

export const matchGraphNode = (event: LangchainStreamEvent, nodeName: string): boolean => {
  return event.metadata.langgraph_node === nodeName;
};

export const matchEvent = (event: LangchainStreamEvent, eventName: string): boolean => {
  return event.event === eventName;
};

export const matchName = (event: LangchainStreamEvent, name: string): boolean => {
  return event.name === name;
};

export const hasTag = (event: LangchainStreamEvent, tag: string): boolean => {
  return (event.tags ?? []).includes(tag);
};

export const createToolCallEvent = (data: {
  toolCallId: string;
  toolId: string;
  params: Record<string, unknown>;
}): ToolCallEvent => {
  return {
    type: ChatEventType.toolCall,
    data: {
      tool_call_id: data.toolCallId,
      tool_id: data.toolId,
      params: data.params,
    },
  };
};

export const createPromptRequestEvent = ({
  prompt,
  source,
}: {
  prompt: PromptRequest;
  source: PromptRequestSource;
}): PromptRequestEvent => {
  return {
    type: ChatEventType.promptRequest,
    data: {
      prompt,
      source,
    },
  };
};

export const createBrowserToolCallEvent = (data: {
  toolCallId: string;
  toolId: string;
  params: Record<string, unknown>;
}): BrowserToolCallEvent => {
  return {
    type: ChatEventType.browserToolCall,
    data: {
      tool_call_id: data.toolCallId,
      tool_id: data.toolId,
      params: data.params,
    },
  };
};

export const createToolResultEvent = (data: {
  toolCallId: string;
  toolId: string;
  results: ToolResult[];
}): ToolResultEvent => {
  return {
    type: ChatEventType.toolResult,
    data: {
      tool_call_id: data.toolCallId,
      tool_id: data.toolId,
      results: data.results,
    },
  };
};

export const createTextChunkEvent = (
  chunk: string,
  { messageId = 'unknown' }: { messageId?: string } = {}
): MessageChunkEvent => {
  return {
    type: ChatEventType.messageChunk,
    data: {
      message_id: messageId,
      text_chunk: chunk,
    },
  };
};

export const createMessageEvent = (
  content: string | object,
  { messageId = 'unknown' }: { messageId?: string } = {}
): MessageCompleteEvent => {
  return {
    type: ChatEventType.messageComplete,
    data: {
      message_id: messageId,
      message_content: typeof content === 'string' ? content : '',
      ...(typeof content === 'object' ? { structured_output: content } : {}),
    },
  };
};

export const createReasoningEvent = (
  reasoning: string,
  { transient }: { transient?: boolean } = {}
): ReasoningEvent => {
  return {
    type: ChatEventType.reasoning,
    data: {
      reasoning,
      transient,
    },
  };
};

export const createThinkingCompleteEvent = (timeToFirstToken: number): ThinkingCompleteEvent => {
  return {
    type: ChatEventType.thinkingComplete,
    data: {
      time_to_first_token: timeToFirstToken,
    },
  };
};
