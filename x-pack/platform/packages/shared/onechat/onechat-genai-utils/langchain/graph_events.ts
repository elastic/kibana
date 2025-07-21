/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamEvent as LangchainStreamEvent } from '@langchain/core/tracers/log_stream';
import {
  ChatEventType,
  MessageChunkEvent,
  MessageCompleteEvent,
  ReasoningEvent,
  ToolCallEvent,
  ToolResultEvent,
} from '@kbn/onechat-common';

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

export const createToolResultEvent = (data: {
  toolCallId: string;
  toolId: string;
  result: string;
}): ToolResultEvent => {
  return {
    type: ChatEventType.toolResult,
    data: {
      tool_call_id: data.toolCallId,
      tool_id: data.toolId,
      result: data.result,
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
  content: string,
  { messageId = 'unknown' }: { messageId?: string } = {}
): MessageCompleteEvent => {
  return {
    type: ChatEventType.messageComplete,
    data: {
      message_id: messageId,
      message_content: content,
    },
  };
};

export const createReasoningEvent = (reasoning: string): ReasoningEvent => {
  return {
    type: ChatEventType.reasoning,
    data: {
      reasoning,
    },
  };
};
