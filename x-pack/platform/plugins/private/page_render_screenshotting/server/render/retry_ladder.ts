/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderServiceRetryClass } from '@kbn/reporting-common';
import type { RenderPageErrorBody } from './types';

/**
 * The in-run half of the retry ladder (#754). page-render-service has no queue: a saturated pod
 * answers 429 at once, and the caller decides when to try again. This module owns that schedule;
 * the reporting task owns what happens between runs (`render_retry.ts` in the reporting plugin).
 * Delete both when the service gets a queue.
 */

/** Retry interval while a report is young. */
export const FAST_RETRY_INTERVAL_MS = 2_000;
/** Retry interval once a report has clearly been waiting on saturation: a fifth of the load. */
export const SLOW_RETRY_INTERVAL_MS = 10_000;
/** Report age after which the slow interval applies. */
export const SLOW_AFTER_MS = 4 * 60_000;
/** Report age at which waiting for capacity gives up. Measured from creation, not per run. */
export const GIVE_UP_AFTER_MS = 10 * 60_000;
/** Longest one task run waits for capacity before handing its worker back to Task Manager. */
export const MAX_WAIT_PER_RUN_MS = 60_000;
/** Time a run keeps clear for the render itself: the service's 180s delivery target. */
export const RENDER_RESERVE_MS = 180_000;

/** The service's own 429 and 503 carry this, so they can be told from a proxy's. */
export const REJECTION_HEADER = 'x-page-render-service-rejection';
/** Sent on every request: what a refusal will cost this report, for the service's busy signal. */
export const RETRY_INTERVAL_HEADER = 'x-render-retry-interval-ms';
/** Sent on every request: ties the service's logs and trace to the report across its retries. */
export const REPORT_ID_HEADER = 'x-report-id';

export function retryIntervalMs(reportAgeMs: number): number {
  return reportAgeMs >= SLOW_AFTER_MS ? SLOW_RETRY_INTERVAL_MS : FAST_RETRY_INTERVAL_MS;
}

/** ±50%, so reports refused together do not retry together. */
export function jitter(ms: number, random: () => number = Math.random): number {
  return Math.round(ms * (0.5 + random()));
}

/**
 * When this run stops waiting for capacity: after `MAX_WAIT_PER_RUN_MS`, or earlier if the run's
 * deadline would not leave room for the render.
 */
export function stopWaitingAt(runStartedAt: number, deadline: number | undefined): number {
  const budgetEnd = runStartedAt + MAX_WAIT_PER_RUN_MS;
  return deadline === undefined ? budgetEnd : Math.min(budgetEnd, deadline - RENDER_RESERVE_MS);
}

/** How the reporting task should respond to a failed render request. */
export function classifyResponse(
  status: number,
  rejection: string | null,
  body: RenderPageErrorBody | undefined
): RenderServiceRetryClass {
  if (status === 429 || (status === 503 && rejection === 'draining')) {
    return 'capacity';
  }
  if (status >= 400 && status < 500) {
    // Bad payload, failed caller authentication, or an oversized body.
    return 'unrecoverable';
  }
  if (body?.phase) {
    // The service's own render failure. A page Kibana refused to serve will not load next time.
    return status === 502 && (body.documentStatus === 401 || body.documentStatus === 403)
      ? 'unrecoverable'
      : 'render_failure';
  }
  // No service error body: a proxy or the network in front of the service.
  return status === 502 || status === 503 || status === 504 ? 'unavailable' : 'render_failure';
}
