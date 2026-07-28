/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry, { AbortError } from 'p-retry';
import { AgentExecutionMode } from '@kbn/agent-builder-common';
import type { PluginSetupContract as ActionsPluginSetup } from '@kbn/actions-plugin/server';
import type { AgentExecution } from '@kbn/agent-builder-server/execution';
import type { ChatCallbackResponse } from '../../../../common/http_api/chat_callback';

const callbackRetryOptions = {
  retries: 2,
  minTimeout: 200,
  factor: 2.5,
  randomize: false,
} as const;

export type MakeRequest = (
  payload: ChatCallbackResponse,
  signal: AbortSignal
) => Promise<{ status: number }>;

export class CallbackDeliveryService {
  private readonly actions: ActionsPluginSetup;

  constructor({ actions }: { actions: ActionsPluginSetup }) {
    this.actions = actions;
  }

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
