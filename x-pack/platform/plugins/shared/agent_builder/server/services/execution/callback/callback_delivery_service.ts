/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry, { AbortError } from 'p-retry';
import type { Logger } from '@kbn/core/server';
import type { PluginSetupContract as ActionsPluginSetup } from '@kbn/actions-plugin/server';
import { isConversationNotFoundError } from '@kbn/agent-builder-common';
import type {
  CallbackConversationResolver,
  CallbackConversationResolverContext,
  CallbacksSetup,
  CallbackTransportDefinition,
} from '@kbn/agent-builder-server';
import { isCallbackDeliveryError, throwIfNotDelivered } from '@kbn/agent-builder-server';
import type { ChatCallbackResponse } from '../../../../common/http_api/chat_callback';
import type { ConversationClient } from '../../conversation';

/** The conversation a turn continues, and the agent it runs on when the conversation decides it. */
export interface ConversationResolution {
  conversationId: string;
  agentId?: string;
}

const callbackRetryOptions = {
  retries: 2,
  minTimeout: 200,
  factor: 2.5,
  randomize: false,
} as const;

export class CallbackDeliveryService {
  private readonly actions: ActionsPluginSetup;
  private readonly logger: Logger;
  private readonly transports: CallbackTransportDefinition[];
  private readonly conversationResolvers: CallbackConversationResolver[] = [];

  constructor({ actions, logger }: { actions: ActionsPluginSetup; logger: Logger }) {
    this.actions = actions;
    this.logger = logger;
    this.transports = [this.createRelayTransport()];
  }

  setup(): CallbacksSetup {
    return {
      registerConversationResolver: (resolver) => {
        this.conversationResolvers.push(resolver);
      },
      registerTransport: (transport) => {
        this.transports.push(transport);
      },
    };
  }

  /**
   * The conversation an external conversation continues: the first registered resolver's answer the
   * caller can converse in, on its own agent, else the conversation that has the origin. An error
   * from a registered resolver propagates.
   */
  async resolveConversation(
    context: CallbackConversationResolverContext,
    conversationClient: ConversationClient
  ): Promise<ConversationResolution | undefined> {
    for (const resolver of this.conversationResolvers) {
      const resolved = await resolver(context);

      if (!resolved) {
        continue;
      }

      try {
        const conversation = await conversationClient.get(resolved.conversationId);

        return { conversationId: conversation.id, agentId: conversation.agent_id };
      } catch (error) {
        if (!isConversationNotFoundError(error)) {
          throw error;
        }

        this.logger.debug(
          `Resolved conversation [${resolved.conversationId}] is missing or not available to the caller; skipping it`
        );
      }
    }

    const conversation = await conversationClient.getByOrigin({
      external_conversation_id: context.origin.external_conversation_id,
    });

    return conversation ? { conversationId: conversation.id } : undefined;
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
    const transport = this.getTransport(callbackUrl);
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

  /** The first transport that handles the URL, else one that delivers with fetch. */
  private getTransport(callbackUrl: string): CallbackTransportDefinition {
    for (const transport of this.transports) {
      if (transport.handles(callbackUrl)) {
        return transport;
      }
    }

    return {
      handles: () => true,
      send: async (url, payload, signal) => {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          redirect: 'error',
          signal,
        });

        throwIfNotDelivered(response);
      },
    };
  }

  /** Delivers to Relay callback URLs through the Actions Relay client. */
  private createRelayTransport(): CallbackTransportDefinition {
    return {
      handles: (callbackUrl) => this.actions.getRelayClient()?.isRelayOrigin(callbackUrl) ?? false,
      send: async (callbackUrl, payload, signal) => {
        const relayClient = this.actions.getRelayClient();

        if (!relayClient) {
          throw new Error('The Relay client is not available');
        }

        throwIfNotDelivered(await relayClient.postCallback(callbackUrl, payload, signal));
      },
    };
  }
}
