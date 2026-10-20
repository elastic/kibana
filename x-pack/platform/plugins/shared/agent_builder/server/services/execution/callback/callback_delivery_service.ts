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
  CallbackTransportDefinition,
  CallbacksSetup,
} from '@kbn/agent-builder-server';
import type { ChatCallbackResponse } from '../../../../common/http_api/chat_callback';

const callbackRetryOptions = {
  retries: 2,
  minTimeout: 200,
  factor: 2.5,
  randomize: false,
} as const;

export type CallbackTransport = (
  payload: ChatCallbackResponse,
  signal: AbortSignal
) => Promise<{ status: number }>;

export class CallbackDeliveryService {
  private readonly actions: ActionsPluginSetup;
  private readonly transports: CallbackTransportDefinition[] = [];
  private conversationResolver?: CallbackConversationResolver;
  private defaultConversationResolver?: CallbackConversationResolver;

  constructor({ actions }: { actions: ActionsPluginSetup }) {
    this.actions = actions;
  }

  setup(): CallbacksSetup {
    return {
      registerConversationResolver: (resolver) => {
        if (this.conversationResolver) {
          throw new Error('A callback conversation resolver is already registered');
        }

        this.conversationResolver = resolver;
      },
      registerTransport: (transport) => {
        if (this.transports.some(({ id }) => id === transport.id)) {
          throw new Error(`Callback transport [${transport.id}] is already registered`);
        }

        this.transports.push(transport);
      },
    };
  }

  /** Sets the lookup that runs when the registered resolver finds nothing; it needs start services. */
  start({
    defaultConversationResolver,
  }: {
    defaultConversationResolver: CallbackConversationResolver;
  }): void {
    this.defaultConversationResolver = defaultConversationResolver;
  }

  /**
   * The conversation an external conversation continues: the registered resolver's answer, else
   * the default lookup's. An error from the registered resolver propagates.
   */
  async resolveConversation(
    context: CallbackConversationResolverContext
  ): Promise<{ conversationId: string } | undefined> {
    const resolved = await this.conversationResolver?.(context);

    if (resolved) {
      return resolved;
    }

    return this.defaultConversationResolver?.(context);
  }

  validateCallbackUrl(callbackUrl: string): void {
    if (!callbackUrl.trim()) {
      throw new Error('Callback URL must be a non-empty string');
    }

    this.actions.getActionsConfigurationUtilities().ensureUriAllowed(callbackUrl);
  }

  createTransport(callbackUrl: string): CallbackTransport {
    const registered = this.transports.find((transport) => transport.handles(callbackUrl));

    if (registered) {
      return (payload, signal) => registered.send(callbackUrl, payload, signal);
    }

    const relayClient = this.actions.getRelayClient();

    if (relayClient?.isRelayOrigin(callbackUrl)) {
      return (payload, signal) => relayClient.postCallback(callbackUrl, payload, signal);
    }

    return (payload, signal) =>
      fetch(callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        redirect: 'error',
        signal,
      });
  }

  async makeCallbackRequest({
    payload,
    transport,
    retry,
  }: {
    payload: ChatCallbackResponse;
    transport: CallbackTransport;
    retry: boolean;
  }): Promise<void> {
    const { timeout } = this.actions.getActionsConfigurationUtilities().getResponseSettings();

    await pRetry(
      async () => {
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), timeout);

        let response: { status: number };

        try {
          response = await transport(payload, abortController.signal);
        } catch (error) {
          throw error instanceof Error ? error : new Error(String(error));
        } finally {
          clearTimeout(timeoutId);
        }

        if (response.status >= 200 && response.status < 300) {
          return;
        }

        const error = new Error(`Callback delivery failed with status ${response.status}`);

        if (response.status >= 500) {
          throw error;
        }

        throw new AbortError(error);
      },
      retry ? callbackRetryOptions : { retries: 0 }
    );
  }
}
