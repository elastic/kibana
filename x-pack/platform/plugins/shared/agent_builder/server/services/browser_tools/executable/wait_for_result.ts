/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { BrowserToolCallStatus } from '@kbn/agent-builder-common';
import type { BrowserToolResultPayload } from '@kbn/agent-builder-common';
import type { BrowserToolCallClientContract } from '@kbn/agent-builder-server/runner';
import { FOLLOW_POLL_INTERVAL_MS } from '../../execution/constants';

export type WaitOutcome =
  | { type: 'answered'; result: BrowserToolResultPayload }
  | { type: 'timeout' }
  | { type: 'aborted' };

/**
 * Resolves after `ms`, or as soon as `abortSignal` fires.
 */
const sleep = (ms: number, abortSignal?: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      abortSignal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    abortSignal?.addEventListener('abort', onAbort, { once: true });
  });

/**
 * Polls a browser tool call document until the browser answers it, the call expires,
 * or the execution is aborted. Never throws: read errors are logged and polling continues.
 */
export const waitForBrowserToolResult = async ({
  callClient,
  logger,
  executionId,
  toolCallId,
  expiresAt,
  abortSignal,
  pollIntervalMs = FOLLOW_POLL_INTERVAL_MS,
  now = Date.now,
}: {
  callClient: Pick<BrowserToolCallClientContract, 'get'>;
  logger: Logger;
  executionId: string;
  toolCallId: string;
  expiresAt: Date;
  abortSignal?: AbortSignal;
  pollIntervalMs?: number;
  now?: () => number;
}): Promise<WaitOutcome> => {
  const deadline = expiresAt.getTime();

  while (true) {
    if (abortSignal?.aborted) {
      return { type: 'aborted' };
    }

    try {
      const call = await callClient.get(executionId, toolCallId);
      if (call?.status === BrowserToolCallStatus.answered && call.result) {
        return { type: 'answered', result: call.result };
      }
    } catch (error) {
      logger.warn(
        `Failed to read browser tool call [${toolCallId}] of execution [${executionId}]: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    if (abortSignal?.aborted) {
      return { type: 'aborted' };
    }

    const remaining = deadline - now();
    if (remaining <= 0) {
      return { type: 'timeout' };
    }

    await sleep(Math.min(pollIntervalMs, remaining), abortSignal);
  }
};
