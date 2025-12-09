/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatEventType, ToolProgressEventData, ChatEventBase } from '@kbn/agent-builder-common';

export type InternalToolProgressEventData = Omit<ToolProgressEventData, 'tool_call_id'>;

export type InternalToolProgressEvent = ChatEventBase<
  ChatEventType.toolProgress,
  InternalToolProgressEventData
>;

export type AgentBuilderToolEvent = InternalToolProgressEvent;

/**
 * Event handler function to listen to run events during execution of tools, agents or other agentBuilder primitives.
 */
export type ToolEventHandlerFn = (event: AgentBuilderToolEvent) => void;

/**
 * Progress event reporter, sending a tool progress event based on the provided progress info
 */
export type ToolProgressEmitterFn = (progressMessage: string) => void;

/**
 * Tool event emitter, exposed to tool handlers
 */
export interface ToolEventEmitter {
  /**
   * Emit a tool progress event based on the provided progress text.
   */
  reportProgress: ToolProgressEmitterFn;
}
