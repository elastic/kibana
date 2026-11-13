/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializedExecutionError } from '../agents/execution_status';
import type { ChatEvent } from './events';
import type { SurfacePayload } from './surface_payload';
import type { ExecutionTerminatedEvent } from './timeline_events';

/** A tool call of the execution, as summarized for a callback. */
export interface ChatCallbackToolCall {
  tool_call_id: string;
  tool_id: string;
  /** What the agent was doing with the call, as described by the model. */
  intent?: string;
  /** Set when the run was interrupted while the call was in flight. */
  interrupted?: true;
}

/**
 * `execution_terminated` as delivered to a callback, with the response message rendered for its
 * surface and the execution's tool calls.
 */
export type ChatCallbackExecutionTerminatedEvent = ExecutionTerminatedEvent & {
  surface_payload?: SurfacePayload;
  tool_calls?: ChatCallbackToolCall[];
};

/** An event as delivered to a callback. */
export type ChatCallbackEvent =
  | Exclude<ChatEvent, ExecutionTerminatedEvent>
  | ChatCallbackExecutionTerminatedEvent;

export interface ChatCallbackEventResponse {
  execution_id: string;
  event: ChatCallbackEvent;
  idempotency_key?: string;
}

export interface ChatCallbackFailureResponse {
  execution_id: string;
  error: SerializedExecutionError;
  idempotency_key: string;
}

export type ChatCallbackResponse = ChatCallbackEventResponse | ChatCallbackFailureResponse;
