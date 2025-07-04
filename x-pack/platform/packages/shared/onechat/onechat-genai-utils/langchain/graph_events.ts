/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamEvent as LangchainStreamEvent } from '@langchain/core/tracers/log_stream';
import {
  ChatAgentEventType,
  MessageChunkEvent,
  MessageCompleteEvent,
  ReasoningEvent,
  ToolCallEvent,
  ToolCallEventData,
  ToolResultEvent,
  ToolResultEventData,
} from '@kbn/onechat-common/agents';

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

export const createToolCallEvent = (data: ToolCallEventData): ToolCallEvent => {
  return {
    type: ChatAgentEventType.toolCall,
    data,
  };
};

export const createToolResultEvent = (data: ToolResultEventData): ToolResultEvent => {
  return {
    type: ChatAgentEventType.toolResult,
    data,
  };
};

export const createTextChunkEvent = (
  chunk: string,
  { messageId = 'unknown' }: { messageId?: string } = {}
): MessageChunkEvent => {
  return {
    type: ChatAgentEventType.messageChunk,
    data: {
      messageId,
      textChunk: chunk,
    },
  };
};

export const createMessageEvent = (
  content: string,
  { messageId = 'unknown' }: { messageId?: string } = {}
): MessageCompleteEvent => {
  return {
    type: ChatAgentEventType.messageComplete,
    data: {
      messageId,
      messageContent: content,
    },
  };
};

export const createReasoningEvent = (reasoning: string): ReasoningEvent => {
  return {
    type: ChatAgentEventType.reasoning,
    data: {
      reasoning,
    },
  };
};
