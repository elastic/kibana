/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry, { AbortError } from 'p-retry';
import type { PluginSetupContract as ActionsPluginSetup } from '@kbn/actions-plugin/server';
import type {
  CallbackConversationResolver,
  CallbackConversationResolverContext,
  CallbacksSetup,
} from '@kbn/agent-builder-server';
import { isCallbackDeliveryError } from '@kbn/agent-builder-server';
import type { ChatCallbackResponse } from '../../../../common/http_api/chat_callback';
import type { ConversationService } from '../../conversation';
import { CallbackTransportRegistry } from './callback_transport_registry';
import { createDefaultConversationResolver } from './default_conversation_resolver';
import { createRelayTransport } from './relay_transport';

const callbackRetryOptions = {
  retries: 2,
  minTimeout: 200,
  factor: 2.5,
  randomize: false,
} as const;

export class CallbackDeliveryService {
  private readonly actions: ActionsPluginSetup;
  private readonly transports: CallbackTransportRegistry;
  private readonly conversationResolvers: CallbackConversationResolver[] = [];
  private defaultConversationResolver?: CallbackConversationResolver;

  constructor({ actions }: { actions: ActionsPluginSetup }) {
    this.actions = actions;
    this.transports = new CallbackTransportRegistry();
    this.transports.register(createRelayTransport({ actions }));
  }

  setup(): CallbacksSetup {
    return {
      registerConversationResolver: (resolver) => {
        this.conversationResolvers.push(resolver);
      },
      registerTransport: (transport) => this.transports.register(transport),
    };
  }

  /** Sets the default lookup by origin, which needs the conversation service from start. */
  start({ conversations }: { conversations: ConversationService }): void {
    this.defaultConversationResolver = createDefaultConversationResolver({ conversations });
  }

  /**
   * The conversation an external conversation continues: the first registered resolver's answer,
   * else the default lookup's. An error from a registered resolver propagates.
   */
  async resolveConversation(
    context: CallbackConversationResolverContext
  ): Promise<{ conversationId: string } | undefined> {
    for (const resolver of this.conversationResolvers) {
      const resolved = await resolver(context);

      if (resolved) {
        return resolved;
      }
    }

    return this.defaultConversationResolver?.(context);
  }

  validateCallbackUrl(callbackUrl: string): void {
    if (!callbackUrl.trim()) {
      throw new Error('Callback URL must be a non-empty string');
    }

    this.actions.getActionsConfigurationUtilities().ensureUriAllowed(callbackUrl);
  }

  async makeCallbackRequest({
    callbackUrl,
    payload,
    retry,
  }: {
    callbackUrl: string;
    payload: ChatCallbackResponse;
    retry: boolean;
  }): Promise<void> {
    const transport = this.transports.get(callbackUrl);
    const { timeout } = this.actions.getActionsConfigurationUtilities().getResponseSettings();

    await pRetry(
      async () => {
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), timeout);

        try {
          await transport.send(callbackUrl, payload, abortController.signal);
        } catch (error) {
          if (isCallbackDeliveryError(error) && !error.retryable) {
            throw new AbortError(error);
          }

          throw error instanceof Error ? error : new Error(String(error));
        } finally {
          clearTimeout(timeoutId);
        }
      },
      retry ? callbackRetryOptions : { retries: 0 }
    );
  }
}
