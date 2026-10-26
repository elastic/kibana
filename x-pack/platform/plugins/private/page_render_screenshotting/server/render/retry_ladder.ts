/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RenderServiceRetryClass } from '@kbn/reporting-common';
import type { RenderPageErrorBody } from './types';

/**
 * The in-run half of the retry ladder: page-render-service has no queue, so a saturated pod
 * answers 429 at once and the caller paces retries. The between-runs half is `render_retry.ts` in
 * the reporting plugin.
 */

export const FAST_RETRY_INTERVAL_MS = 2_000;
/** A fifth of the fast interval's load on a saturated service. */
export const SLOW_RETRY_INTERVAL_MS = 10_000;
/** Report age, across task runs, at which retries slow down. */
export const SLOW_AFTER_MS = 4 * 60_000;
/** Report age, across task runs, at which waiting gives up. */
export const GIVE_UP_AFTER_MS = 10 * 60_000;
/** After this, the run hands its worker back to Task Manager. */
export const MAX_WAIT_PER_RUN_MS = 60_000;
/** Kept clear for the render: the service's 180s delivery target. */
export const RENDER_RESERVE_MS = 180_000;

/** The service's own 429 and 503 carry this, so they can be told from a proxy's. */
export const REJECTION_HEADER = 'x-page-render-service-rejection';
/** Tells the service what a refusal costs this report, for its busy signal. */
export const RETRY_INTERVAL_HEADER = 'x-render-retry-interval-ms';
/** Ties the service's logs and traces to the report across retries. */
export const REPORT_ID_HEADER = 'x-report-id';

export function retryIntervalMs(reportAgeMs: number): number {
  return reportAgeMs >= SLOW_AFTER_MS ? SLOW_RETRY_INTERVAL_MS : FAST_RETRY_INTERVAL_MS;
}

/** ±50%, so reports refused together do not retry together. */
export function jitter(ms: number, random: () => number = Math.random): number {
  return Math.round(ms * (0.5 + random()));
}

/** Leaves room for the render before the deadline, and stops after a minute if it can hand back. */
export function stopWaitingAt(
  runStartedAt: number,
  deadline: number | undefined,
  canHandBack: boolean
): number {
  const renderBy = deadline === undefined ? Infinity : deadline - RENDER_RESERVE_MS;
  return canHandBack ? Math.min(runStartedAt + MAX_WAIT_PER_RUN_MS, renderBy) : renderBy;
}

/** How the reporting task should respond to a failed render request. */
export function classifyResponse(
  status: number,
  rejection: string | null,
  body: RenderPageErrorBody | undefined
): RenderServiceRetryClass {
  if (status === 429 || (status === 503 && rejection === 'draining')) {
    return RenderServiceRetryClass.CAPACITY;
  }
  if (status >= 400 && status < 500) {
    // Bad payload, failed caller authentication, or an oversized body.
    return RenderServiceRetryClass.UNRECOVERABLE;
  }
  if (body?.phase) {
    // The service's own render failure. A page Kibana refused to serve will not load next time.
    return status === 502 && (body.documentStatus === 401 || body.documentStatus === 403)
      ? RenderServiceRetryClass.UNRECOVERABLE
      : RenderServiceRetryClass.RENDER_FAILURE;
  }
  // No service error body: a proxy or the network in front of the service.
  return status === 502 || status === 503 || status === 504
    ? RenderServiceRetryClass.UNAVAILABLE
    : RenderServiceRetryClass.RENDER_FAILURE;
}
