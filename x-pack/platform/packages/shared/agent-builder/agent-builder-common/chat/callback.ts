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

export interface ChatCallbackToolCall {
  tool_call_id: string;
  tool_id: string;
  intent?: string;
}

export type ChatCallbackExecutionTerminatedEvent = ExecutionTerminatedEvent & {
  surface_payload?: SurfacePayload;
  tool_calls?: ChatCallbackToolCall[];
};

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
