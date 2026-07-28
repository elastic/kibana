/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY, from, concatMap, catchError, type Observable } from 'rxjs';
import pRetry, { AbortError } from 'p-retry';
import type { Logger } from '@kbn/logging';
import {
  AgentExecutionMode,
  isRoundCompleteEvent,
  type ChatEvent,
} from '@kbn/agent-builder-common';
import type { PluginSetupContract as ActionsPluginSetup } from '@kbn/actions-plugin/server';
import type { AgentExecution } from '@kbn/agent-builder-server/execution';
import type { ChatCallbackResponse } from '../../../common/http_api/chat_callback';
import { serializeExecutionError } from './execution_runner';

const callbackRetryOptions = {
  retries: 2,
  minTimeout: 200,
  factor: 2.5,
  randomize: false,
} as const;

/** Posts a single callback payload, resolving with the response status. */
export type MakeRequest = (
  payload: ChatCallbackResponse,
  signal: AbortSignal
) => Promise<{ status: number }>;

export class CallbackDeliveryService {
  private readonly actions: ActionsPluginSetup;

  constructor({ actions }: { actions: ActionsPluginSetup }) {
    this.actions = actions;
  }

  /**
   * Returns the execution's callback URL, or undefined when no callback is configured.
   * Callback delivery is only supported for conversation-mode executions.
   */
  getCallbackUrl(execution: AgentExecution): string | undefined {
    return execution.executionMode === AgentExecutionMode.conversation
      ? execution.agentParams.callback?.url
      : undefined;
  }

  validateCallbackUrl(callbackUrl: string): void {
    if (!callbackUrl.trim()) {
      throw new Error('Callback URL must be a non-empty string');
    }

    this.actions.getActionsConfigurationUtilities().ensureUriAllowed(callbackUrl);
  }

  /**
   * Creates the {@link MakeRequest} for the callback URL, choosing between the Actions
   * Relay mTLS client (for Relay origins) and plain fetch.
   */
  createMakeRequest(callbackUrl: string): MakeRequest {
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

  /**
   * Posts the payload through `makeRequest` with the Actions response timeout. When `retry`
   * is true, retries network errors and 5xx responses; otherwise the request is attempted once.
   */
  async makeCallbackRequest({
    payload,
    makeRequest,
    retry,
  }: {
    payload: ChatCallbackResponse;
    makeRequest: MakeRequest;
    retry: boolean;
  }): Promise<void> {
    const { timeout } = this.actions.getActionsConfigurationUtilities().getResponseSettings();

    await pRetry(
      async () => {
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), timeout);

        let response: { status: number };

        try {
          response = await makeRequest(payload, abortController.signal);
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

/**
 * Consumes the event stream and delivers one callback request per event through the
 * callback delivery service, sequentially and in order, as the events are emitted.
 * Delivery is best-effort: per-event failures are logged and the stream continues.
 * When the stream errors, a failure payload is delivered instead.
 *
 * Terminal payloads — `round_complete` events and the failure payload — are retried
 * (at-least-once) and carry an `idempotency_key` so the receiver can dedupe redeliveries.
 * Progress events are delivered at-most-once.
 *
 * Resolves once all deliveries have drained; never rejects. No-op (without subscribing)
 * when the execution has no callback configured — callback delivery is only supported
 * for conversation-mode executions.
 */
export const deliverStream = ({
  execution,
  events$,
  callbackDeliveryService,
  logger,
}: {
  execution: AgentExecution;
  events$: Observable<ChatEvent>;
  callbackDeliveryService: CallbackDeliveryService;
  logger: Logger;
}): Promise<void> => {
  const callbackUrl = callbackDeliveryService.getCallbackUrl(execution);

  if (!callbackUrl) {
    return Promise.resolve();
  }

  try {
    callbackDeliveryService.validateCallbackUrl(callbackUrl);
  } catch (error) {
    logger.error(
      `Skipping callback delivery for execution ${execution.executionId}: ${error.message}`
    );

    return Promise.resolve();
  }

  const makeRequest = callbackDeliveryService.createMakeRequest(callbackUrl);

  return new Promise<void>((resolve) => {
    events$
      .pipe(
        concatMap((event) => {
          const isTerminal = isRoundCompleteEvent(event);
          const delivery = callbackDeliveryService.makeCallbackRequest({
            payload: {
              execution_id: execution.executionId,
              event,
              ...(isTerminal ? { idempotency_key: execution.executionId } : {}),
            },
            makeRequest,
            retry: isTerminal,
          });

          return from(delivery).pipe(
            catchError((error) => {
              logger.warn(
                `Failed to deliver callback event for execution ${execution.executionId}: ${error.message}`
              );

              return EMPTY;
            })
          );
        }),
        catchError((error) => {
          const failureDelivery = callbackDeliveryService.makeCallbackRequest({
            payload: {
              execution_id: execution.executionId,
              error: serializeExecutionError(error),
              idempotency_key: execution.executionId,
            },
            makeRequest,
            retry: true,
          });

          return from(failureDelivery).pipe(
            catchError((deliveryError) => {
              logger.warn(
                `Failed to deliver failure callback for execution ${execution.executionId}: ${deliveryError.message}`
              );
              return EMPTY;
            })
          );
        })
      )
      .subscribe({
        complete: () => resolve(),
        error: () => resolve(),
      });
  });
};
