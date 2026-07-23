/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';

const ORCHESTRATOR_EXECUTE_PATH = '/internal/streams/significant_events/discovery/_execute';
const ORCHESTRATOR_STATUS_PATH = '/internal/streams/significant_events/discovery/_status';

const POLL_INTERVAL_MS = 10_000;
/** Matches the orchestrator workflow's own 40m timeout, plus margin. */
const DEFAULT_TIMEOUT_MS = 45 * 60 * 1000;
/**
 * Statuses meaning an execution is still doing (or undoing) work. Everything else —
 * completed, failed, canceled, not_started — is settled. Kept as a deny-list of active states
 * so an unknown new status reads as settled rather than wedging the poll loops.
 */
const ACTIVE_STATUSES = new Set(['in_progress', 'running', 'being_canceled']);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface OrchestratorStatus {
  status?: string;
  executionId?: string;
  error?: unknown;
}

const getStatus = async (kbnClient: KbnClient): Promise<OrchestratorStatus> => {
  const response = await kbnClient.request<OrchestratorStatus>({
    path: ORCHESTRATOR_STATUS_PATH,
    method: 'GET',
  });
  return response.data;
};

/**
 * Run the significant-events orchestrator (detection -> discovery -> triage) to completion.
 *
 * The trigger endpoint reuses a non-terminal execution instead of starting a new one, so a
 * leftover run from a previous scenario would silently hijack this one — if anything is in
 * flight, cancel it and wait for it to settle before triggering.
 */
export async function runOrchestratorToCompletion({
  kbnClient,
  log,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
  timeoutMs?: number;
}): Promise<void> {
  const preexisting = await getStatus(kbnClient);
  if (preexisting.status && ACTIVE_STATUSES.has(preexisting.status)) {
    log.warning(
      `Orchestrator execution ${preexisting.executionId} is already ${preexisting.status} — cancelling it before triggering a fresh run`
    );
    await kbnClient.request({
      path: ORCHESTRATOR_EXECUTE_PATH,
      method: 'POST',
      body: { action: 'cancel' },
    });
    const cancelDeadline = Date.now() + 2 * 60 * 1000;
    let settled = false;
    while (Date.now() < cancelDeadline) {
      await sleep(POLL_INTERVAL_MS);
      const status = await getStatus(kbnClient);
      if (!status.status || !ACTIVE_STATUSES.has(status.status)) {
        settled = true;
        break;
      }
    }
    // Triggering while a run is still active would silently REUSE that execution instead of
    // starting a fresh one — exactly the hijack this pre-check exists to prevent.
    if (!settled) {
      throw new Error(
        `A pre-existing orchestrator execution (${preexisting.executionId}) did not settle after cancellation — refusing to trigger into it`
      );
    }
  }

  log.info('Triggering the significant-events orchestrator (detect -> discover -> triage)...');
  await kbnClient.request({
    path: ORCHESTRATOR_EXECUTE_PATH,
    method: 'POST',
    body: { action: 'trigger' },
  });

  const start = Date.now();
  const deadline = start + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const status = await getStatus(kbnClient);

    if (status.status === 'completed') {
      log.info(
        `Orchestrator completed in ${Math.round((Date.now() - start) / 1000)}s (execution ${
          status.executionId
        })`
      );
      return;
    }
    if (status.status === 'failed' || status.status === 'canceled') {
      throw new Error(
        `Orchestrator execution ${status.executionId} ended with status "${
          status.status
        }": ${JSON.stringify(status.error ?? 'no error detail')}`
      );
    }
    log.info(
      `  orchestrator status: ${status.status} (${Math.round(
        (Date.now() - start) / 1000
      )}s elapsed)`
    );
  }

  throw new Error(`Orchestrator did not complete within ${timeoutMs / 1000}s`);
}
