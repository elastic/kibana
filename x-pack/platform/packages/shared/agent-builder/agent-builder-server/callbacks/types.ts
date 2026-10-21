/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ChatCallbackResponse, ConversationOriginType } from '@kbn/agent-builder-common';

/** The external conversation an execution came from. */
export interface CallbackConversationResolverContext {
  origin: { type: ConversationOriginType; external_conversation_id: string };
  spaceId: string;
  /** The callback request, for resolvers that read as the caller. */
  request: KibanaRequest;
}

/** The conversation an external conversation continues, or `undefined` when none does. Throws when the lookup fails. */
export type CallbackConversationResolver = (
  context: CallbackConversationResolverContext
) => Promise<{ conversationId: string } | undefined>;

/** Delivers callback payloads to the callback URLs it handles. */
export interface CallbackTransportDefinition {
  id: string;
  /** Whether this transport delivers to the given callback URL. */
  handles(callbackUrl: string): boolean;
  /** Resolves once delivered; throws a `CallbackDeliveryError` to say whether to retry. */
  send(callbackUrl: string, payload: ChatCallbackResponse, signal: AbortSignal): Promise<void>;
}

/** AgentBuilder callbacks setup contract. */
export interface CallbacksSetup {
  /**
   * Registers a resolver for the conversation an execution's origin continues, when the execution
   * names no conversation. Resolvers are asked in registration order and the first answer wins.
   * When all return `undefined`, the default lookup by origin runs.
   */
  registerConversationResolver(resolver: CallbackConversationResolver): void;
  /** Registers a callback transport. The first registered transport that handles a URL delivers to it. */
  registerTransport(transport: CallbackTransportDefinition): void;
}
