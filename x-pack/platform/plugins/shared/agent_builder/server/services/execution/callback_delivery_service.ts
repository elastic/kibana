/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry, { AbortError } from 'p-retry';
import { ExecutionStatus, type ChatEvent } from '@kbn/agent-builder-common';
import type { PluginSetupContract as ActionsPluginSetup } from '@kbn/actions-plugin/server';
import type {
  CallbackPayload,
  ChatCallbackFailurePayload,
} from '../../../common/http_api/chat_callback';
import { buildChatResponseFromEvents } from './utils/chat_response';

const callbackRetryOptions = {
  retries: 2,
  minTimeout: 200,
  factor: 2.5,
  randomize: false,
} as const;

export class CallbackDeliveryService {
  private readonly actions: ActionsPluginSetup;

  constructor({ actions }: { actions: ActionsPluginSetup }) {
    this.actions = actions;
  }

  validateCallbackUrl(callbackUrl: string): void {
    if (!callbackUrl.trim()) {
      throw new Error('Callback URL must be a non-empty string');
    }

    this.actions.getActionsConfigurationUtilities().ensureUriAllowed(callbackUrl);
  }

  /**
   * Delivers a success callback for a completed execution when a callback URL is configured.
   * No-op otherwise.
   */
  async makeSuccessCallbackRequestIfConfigured({
    executionId,
    events,
    callbackUrl,
  }: {
    executionId: string;
    events: ChatEvent[];
    callbackUrl: string | undefined;
  }): Promise<void> {
    if (!callbackUrl) {
      return;
    }

    await this.makeCallbackRequest({
      callbackUrl,
      payload: {
        execution_id: executionId,
        status: ExecutionStatus.completed,
        response: buildChatResponseFromEvents(events),
      },
    });
  }

  /**
   * Delivers a failure callback for a failed or aborted execution when a callback URL is
   * configured. No-op otherwise.
   */
  async makeFailureCallbackRequestIfConfigured({
    callbackUrl,
    payload,
  }: {
    callbackUrl: string | undefined;
    payload: ChatCallbackFailurePayload;
  }): Promise<void> {
    if (!callbackUrl) {
      return;
    }

    await this.makeCallbackRequest({ callbackUrl, payload });
  }

  private async makeCallbackRequest({
    callbackUrl,
    payload,
  }: {
    callbackUrl: string;
    payload: CallbackPayload;
  }): Promise<void> {
    this.validateCallbackUrl(callbackUrl);

    const { timeout } = this.actions.getActionsConfigurationUtilities().getResponseSettings();

    const body = JSON.stringify(payload);
    const headers = {
      'Content-Type': 'application/json',
    };

    await pRetry(async () => {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), timeout);

      let response: Response;
      try {
        response = await fetch(callbackUrl, {
          method: 'POST',
          headers,
          body,
          redirect: 'error',
          signal: abortController.signal,
        });
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
    }, callbackRetryOptions);
  }
}
