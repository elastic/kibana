/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ExecutionConversation, TimelineEvent } from '@kbn/agent-builder-common';

/**
 * Input passed to a trigger hook.
 */
export interface AgentTriggerHookInput {
  /** The current conversation state */
  conversation: ExecutionConversation;
  /** New events added since the last agent execution */
  newEvents: TimelineEvent[];
}

/**
 * Context available to the trigger hook.
 */
export interface AgentTriggerHookContext {
  /** The scoped request of the last event emitter */
  request: KibanaRequest;
}

/**
 * Result returned by a trigger hook.
 */
export interface TriggerHookResult {
  /** Whether the agent should be invoked */
  invoke: boolean;
}

/**
 * A trigger hook determines whether an agent execution should be started
 * in response to new timeline events.
 */
export type AgentTriggerHook = (
  input: AgentTriggerHookInput,
  ctx: AgentTriggerHookContext
) => Promise<TriggerHookResult>;
