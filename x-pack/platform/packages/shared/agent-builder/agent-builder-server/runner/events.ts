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

export const DYNAMIC_TOOL_EVENT_TYPE = 'dynamic_tool_event' as const;

/**
 * An event emitted by a tool run through `execute_dynamic_tool`, tagged with the inner tool it
 * belongs to. The meta-tool wraps its inner tool's events this way so they are attributed to the
 * inner tool, not to the meta-tool, when converted to chat events. Never leaves the server.
 */
export interface DynamicToolEvent {
  type: typeof DYNAMIC_TOOL_EVENT_TYPE;
  data: {
    /** Id of the inner tool that emitted `event`. */
    tool_id: string;
    event: InternalToolProgressEvent | InternalToolUiEvent;
  };
}

export type AgentBuilderToolEvent =
  | InternalToolProgressEvent
  | InternalToolUiEvent
  | DynamicToolEvent;

export const isDynamicToolEvent = (event: AgentBuilderToolEvent): event is DynamicToolEvent =>
  event.type === DYNAMIC_TOOL_EVENT_TYPE;

/** Tags `event` with the inner tool it came from; an already tagged event is returned as is. */
export const toDynamicToolEvent = (
  toolId: string,
  event: AgentBuilderToolEvent
): DynamicToolEvent =>
  isDynamicToolEvent(event)
    ? event
    : { type: DYNAMIC_TOOL_EVENT_TYPE, data: { tool_id: toolId, event } };

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
  reportProgress: (
    progressMessage: string,
    options?: { metadata?: Record<string, string> }
  ) => void;
  /**
   * Emit a UI event which can be listened to on the front-end.
   *
   * Note: UI events aren't persisted, they are just meant to be used during streaming by the UI.
   */
  sendUiEvent<TEvent extends string, TData extends object>(event: TEvent, data: TData): void;
}
