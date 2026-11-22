/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializedExecutionError } from '../agents/execution_status';
import type { PromptResponse } from '../agents/prompts';
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

/**
 * Tells the callback of an execution that paused on prompts that they were answered, from its
 * surface or from Kibana, so the surface stops offering them. A callback-only event, sent with
 * the paused execution's id once the run that resumes the conversation starts.
 */
export interface ChatCallbackPromptResolvedEvent {
  type: 'prompt_resolved';
  data: {
    /** The response to each answered prompt, by prompt id. */
    responses: Record<string, PromptResponse>;
  };
  /** The answered prompts rendered for the surface, without anything left to answer. */
  surface_payload?: SurfacePayload;
}

export type ChatCallbackEvent =
  | Exclude<ChatEvent, ExecutionTerminatedEvent>
  | ChatCallbackExecutionTerminatedEvent
  | ChatCallbackPromptResolvedEvent;

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
