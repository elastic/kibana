/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleChangeHistoryApi } from '../../../../services/rule_change_history_api';

/** Backoff between change-history checks after a restore (~7.5s in total). */
export const RESTORED_HISTORY_POLL_DELAYS_MS: readonly number[] = [500, 1000, 2000, 4000];

const sleep = (delayMs: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timeout);
      reject(signal?.reason);
    };
    const timeout = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, delayMs);
    signal?.addEventListener('abort', onAbort, { once: true });
  });

export interface WaitForRestoredHistoryEntryParams {
  api: Pick<RuleChangeHistoryApi, 'listRuleChanges'>;
  ruleId: string;
  /** The rule version the restore produced. */
  version: number;
  signal?: AbortSignal;
  delaysMs?: readonly number[];
}

/**
 * Resolves once the rule's newest change-history entry is at or past `version`,
 * or after the last delay when it never shows up. History is written
 * asynchronously after a restore responds, so the entry may lag the response.
 * Rejects when `signal` aborts.
 */
export const waitForRestoredHistoryEntry = async ({
  api,
  ruleId,
  version,
  signal,
  delaysMs = RESTORED_HISTORY_POLL_DELAYS_MS,
}: WaitForRestoredHistoryEntryParams): Promise<void> => {
  for (const delayMs of delaysMs) {
    await sleep(delayMs, signal);

    const {
      items: [newest],
    } = await api.listRuleChanges({ id: ruleId, page: 1, perPage: 1, signal });

    if (newest?.version !== undefined && newest.version >= version) {
      return;
    }
  }
};
