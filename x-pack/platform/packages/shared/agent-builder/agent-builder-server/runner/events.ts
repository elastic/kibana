/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ChatEventType,
  ToolProgressEventData,
  ToolUiEventData,
  ChatEventBase,
} from '@kbn/agent-builder-common';

export type InternalToolProgressEventData = Omit<ToolProgressEventData, 'tool_call_id'>;

export type InternalToolProgressEvent = ChatEventBase<
  ChatEventType.toolProgress,
  InternalToolProgressEventData
>;

export type InternalToolUiEventData<TEvent = string, TData extends object = object> = Omit<
  ToolUiEventData<TEvent, TData>,
  'tool_call_id' | 'tool_id'
>;

export type InternalToolUiEvent<TEvent = string, TData extends object = object> = ChatEventBase<
  ChatEventType.toolUi,
  InternalToolUiEventData<TEvent, TData>
>;

export type AgentBuilderToolEvent = InternalToolProgressEvent | InternalToolUiEvent;

/**
 * Event handler function to listen to run events during execution of tools, agents or other agentBuilder primitives.
 */
export type ToolEventHandlerFn = (event: AgentBuilderToolEvent) => void;

/**
 * Tool event emitter, exposed to tool handlers
 */
export interface ToolEventEmitter {
  /**
   * Emit a tool progress event based on the provided progress text.
   */
  reportProgress: (progressMessage: string) => void;
  /**
   * Emit a UI event which can be listened to on the front-end.
   *
   * Note: UI events aren't persisted, they are just meant to be used during streaming by the UI.
   */
  sendUiEvent<TEvent extends string, TData extends object>(event: TEvent, data: TData): void;
}
