/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ChatCallbackResponse } from '@kbn/agent-builder-common';
import type { ExecutionConversationOrigin } from '../execution';

/** The external conversation an execution came from. */
export interface CallbackConversationResolverContext {
  origin: ExecutionConversationOrigin;
  spaceId: string;
  request: KibanaRequest;
}

/** The conversation an external conversation continues, or `undefined` when none does. Throws when the lookup fails. */
export type CallbackConversationResolver = (
  context: CallbackConversationResolverContext
) => Promise<{ conversationId: string } | undefined>;

/** A turn from an external conversation that no existing conversation continues. */
export interface OnBeforeNewConversationContext extends CallbackConversationResolverContext {
  /** The agent the new conversation runs on. */
  agentId: string;
}

/** Gives back what a hook took, when the turn it allowed writes no conversation after all. */
export type OnBeforeNewConversationRelease = () => Promise<void>;

/**
 * Throws to refuse a turn that would open a new conversation; the error is returned to the caller.
 * Runs after the caller is authorized to run the agent and never for a replayed delivery. Resolves
 * to a release when it took something that a turn which writes no conversation must give back.
 */
export type OnBeforeNewConversationHook = (
  context: OnBeforeNewConversationContext
) => Promise<OnBeforeNewConversationRelease | undefined>;

/** Delivers callback payloads to the callback URLs it handles. */
export interface CallbackTransportDefinition {
  /** Whether this transport delivers to the given callback URL. */
  handles(callbackUrl: string): boolean;
  /** Resolves once delivered; throws a `CallbackDeliveryError` to say whether to retry. */
  send(callbackUrl: string, payload: ChatCallbackResponse, signal: AbortSignal): Promise<void>;
}
