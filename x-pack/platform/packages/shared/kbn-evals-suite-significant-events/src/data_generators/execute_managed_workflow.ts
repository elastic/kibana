/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';

// Inline IDs to avoid importing @kbn/workflows, which pulls YAML files Playwright's esbuild
// transform cannot load (same constraint as the plugin's Scout specs).
export const SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID = 'system-significant-events-detection';
export const SIGNIFICANT_EVENTS_TRIAGE_WORKFLOW_ID = 'system-significant-events-triage';

const WORKFLOWS_API_VERSION = '2023-10-31';
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled', 'timed_out', 'skipped']);
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;
const POLL_INTERVAL_MS = 5_000;

export interface ManagedWorkflowResult {
  executionId: string;
  /** Terminal execution status: completed | failed | cancelled | timed_out | skipped. */
  status: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wait until a managed workflow is installed and valid. Managed workflow installation is
 * asynchronous (a reactive observable in plugin start reacts to the significant-events
 * availability flag), so a freshly flipped feature flag may race the first execution.
 */
export async function ensureManagedWorkflowReady({
  kbnClient,
  log,
  workflowId,
  timeoutMs = 120_000,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
  workflowId: string;
  timeoutMs?: number;
}): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await kbnClient.request<{ valid?: boolean }>({
        path: `/api/workflows/workflow/${workflowId}`,
        method: 'GET',
        headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
        retries: 0,
      });
      if (response.data.valid) {
        log.debug(`Managed workflow "${workflowId}" is installed and valid`);
        return;
      }
    } catch {
      // Not installed yet — keep polling.
    }
    await sleep(2_000);
  }
  throw new Error(
    `Managed workflow "${workflowId}" was not installed/valid within ${timeoutMs / 1000}s`
  );
}

/**
 * Execute a managed workflow via the public workflows API and poll its execution until it
 * reaches a terminal status. Returns the terminal status instead of throwing on `failed` /
 * `cancelled` — the detection workflow legitimately cancels itself when no alerts exist, so
 * callers decide what is fatal.
 */
export async function executeManagedWorkflow({
  kbnClient,
  log,
  workflowId,
  inputs,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
  workflowId: string;
  inputs: Record<string, unknown>;
  timeoutMs?: number;
}): Promise<ManagedWorkflowResult> {
  log.info(`Executing managed workflow "${workflowId}" with inputs ${JSON.stringify(inputs)}`);

  const runResponse = await kbnClient.request<{ workflowExecutionId: string }>({
    path: `/api/workflows/workflow/${workflowId}/run`,
    method: 'POST',
    headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
    body: { inputs },
  });

  const executionId = runResponse.data.workflowExecutionId;
  if (!executionId) {
    throw new Error(`Workflow "${workflowId}" run did not return an execution id`);
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);

    const executionResponse = await kbnClient.request<{ status?: string; error?: unknown }>({
      path: `/api/workflows/executions/${executionId}`,
      method: 'GET',
      headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
    });

    const status = executionResponse.data.status ?? 'unknown';
    if (TERMINAL_STATUSES.has(status)) {
      const suffix =
        status === 'completed'
          ? ''
          : ` (${JSON.stringify(executionResponse.data.error ?? 'no error detail')})`;
      log.info(`Workflow "${workflowId}" execution ${executionId} finished: ${status}${suffix}`);
      return { executionId, status };
    }

    log.debug(`Workflow "${workflowId}" execution ${executionId} status: ${status}`);
  }

  throw new Error(
    `Workflow "${workflowId}" execution ${executionId} did not complete within ${timeoutMs / 1000}s`
  );
}
