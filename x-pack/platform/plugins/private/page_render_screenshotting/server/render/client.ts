/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import type { Dispatcher } from 'undici';
import type { Logger } from '@kbn/logging';
import {
  RenderCapacityTimeoutError,
  RenderFailedError,
  RenderRequestRejectedError,
  RenderServiceError,
  RenderServiceRetryClass,
  RenderServiceSaturatedError,
  RenderServiceUnavailableError,
} from '@kbn/reporting-common';
import type { RenderPageErrorBody, RenderPageRequest, RenderPageResult } from './types';
import {
  GIVE_UP_AFTER_MS,
  REJECTION_HEADER,
  REPORT_ID_HEADER,
  RETRY_INTERVAL_HEADER,
  classifyResponse,
  jitter,
  retryIntervalMs,
  stopWaitingAt,
} from './retry_ladder';
import { pageRenderTelemetry } from './telemetry';

export interface PageRenderServiceConfig {
  url: string;
  createToken: (signal: AbortSignal) => Promise<string>;
  /** Presents Kibana's client certificate, which the service requires alongside the token. */
  dispatcher?: Dispatcher;
}

export interface RenderContext {
  /** When Task Manager times this run out. */
  retryAt?: Date | null;
  /** Its age drives the retry ladder; `waitingSince` starts the capacity-wait metric. */
  report?: { id: string; createdAt: Date; waitingSince?: Date };
  /** Caps the wait for capacity at a minute per run, then hands the worker back. */
  canHandBack?: boolean;
}

const RENDER_PATH = '/v1/render-page';
const CONTENT_TYPES = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpeg: 'image/jpeg',
} as const;
// Leaves time to fail cleanly before the task's own timeout.
const DEADLINE_SAFETY_MARGIN_MS = 15_000;

async function delay(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true }
    );
  });
}

function isRenderPageErrorBody(body: unknown): body is RenderPageErrorBody {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as Partial<RenderPageErrorBody>).error === 'string'
  );
}

async function readErrorBody(response: Response): Promise<RenderPageErrorBody | undefined> {
  try {
    const body: unknown = await response.json();
    return isRenderPageErrorBody(body) ? body : undefined;
  } catch {
    return undefined;
  }
}

function describeFailure(response: Response, body: RenderPageErrorBody | undefined): string {
  const detail = body?.phase
    ? ` (phase: ${body.phase}${
        body.documentStatus ? `, documentStatus: ${body.documentStatus}` : ''
      })`
    : '';
  return `page-render-service request failed: ${response.status} ${
    body?.error ?? response.statusText
  }${detail}`;
}

const ERRORS_BY_CLASS: Record<
  Exclude<RenderServiceRetryClass, RenderServiceRetryClass.CAPACITY>,
  new (details?: string) => Error
> = {
  [RenderServiceRetryClass.UNAVAILABLE]: RenderServiceUnavailableError,
  [RenderServiceRetryClass.RENDER_FAILURE]: RenderFailedError,
  [RenderServiceRetryClass.UNRECOVERABLE]: RenderRequestRejectedError,
};

/** Undici's own message for any network failure is just "fetch failed"; the cause says which. */
function describeNetworkError(err: unknown): string {
  const cause = err instanceof Error ? err.cause : undefined;
  const code = (cause as { code?: string } | undefined)?.code;
  const message = err instanceof Error ? err.message : String(err);
  return code ? `${message} (${code})` : message;
}

/** A failed mint counts as `unavailable`, which queues the report. */
async function mintToken(config: PageRenderServiceConfig, signal: AbortSignal): Promise<string> {
  try {
    return await config.createToken(signal);
  } catch (err) {
    if (signal.aborted || err instanceof RenderServiceError) {
      throw err;
    }
    throw new RenderServiceUnavailableError(
      `could not get a token for page-render-service: ${describeNetworkError(err)}`
    );
  }
}

async function postWithRetry(
  payload: RenderPageRequest,
  config: PageRenderServiceConfig,
  { retryAt, report, canHandBack = false }: RenderContext,
  signal: AbortSignal,
  logger: Logger
): Promise<RenderPageResult> {
  const runStartedAt = Date.now();
  const deadline = retryAt ? retryAt.getTime() - DEADLINE_SAFETY_MARGIN_MS : undefined;
  const waitUntil = stopWaitingAt(runStartedAt, deadline, canHandBack);
  const createdAt = report?.createdAt.getTime() ?? runStartedAt;
  const waitStartedAt = report?.waitingSince?.getTime() ?? createdAt;
  const tags = report ? [report.id] : [];
  // One token for all capacity retries: the service checks it only on arrival, and caches that.
  let token: string | undefined;

  for (;;) {
    const sentAt = Date.now();
    const intervalMs = retryIntervalMs(sentAt - createdAt);
    token ??= await mintToken(config, signal);
    const requestInit: RequestInit & { dispatcher?: Dispatcher } = {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        [RETRY_INTERVAL_HEADER]: String(intervalMs),
        ...(report ? { [REPORT_ID_HEADER]: report.id } : {}),
      },
      body: JSON.stringify(payload),
      signal,
      dispatcher: config.dispatcher,
    };

    let response: Response;
    try {
      response = await fetch(`${config.url.replace(/\/+$/, '')}${RENDER_PATH}`, requestInit);
    } catch (err) {
      if (signal.aborted) {
        throw err;
      }
      throw new RenderServiceUnavailableError(
        `page-render-service could not be reached: ${describeNetworkError(err)}`
      );
    }

    if (response.ok) {
      pageRenderTelemetry.recordCapacityWait((sentAt - waitStartedAt) / 1000);
      return await readResult(payload, response);
    }

    const body = await readErrorBody(response);
    const retryClass = classifyResponse(
      response.status,
      response.headers.get(REJECTION_HEADER),
      body
    );

    if (retryClass !== RenderServiceRetryClass.CAPACITY) {
      // Only a 5xx with a phase means the service took a slot.
      if (response.status >= 500 && body?.phase) {
        pageRenderTelemetry.recordCapacityWait((sentAt - waitStartedAt) / 1000);
      }
      throw new ERRORS_BY_CLASS[retryClass](describeFailure(response, body));
    }

    const waitMs = jitter(intervalMs);
    const now = Date.now();
    const waitedMinutes = Math.round((now - createdAt) / 60_000);
    if (now + waitMs - createdAt >= GIVE_UP_AFTER_MS) {
      throw new RenderCapacityTimeoutError(
        `page-render-service had no capacity for this report in ${waitedMinutes} minute(s); giving up`
      );
    }
    if (now + waitMs > waitUntil) {
      throw new RenderServiceSaturatedError(
        `page-render-service is still at capacity after waiting ${Math.round(
          (now - runStartedAt) / 1000
        )}s in this run`
      );
    }

    logger.debug(`page-render-service at capacity (${response.status}), retrying in ${waitMs}ms`, {
      tags,
    });
    await delay(waitMs, signal);
  }
}

async function readResult(
  payload: RenderPageRequest,
  response: Response
): Promise<RenderPageResult> {
  const expectedContentType = CONTENT_TYPES[payload.output?.format ?? 'pdf'];
  const contentType = response.headers.get('content-type')?.split(';')[0].trim();
  if (contentType !== expectedContentType) {
    throw new Error(
      `page-render-service returned ${
        contentType ?? 'no content type'
      }, expected ${expectedContentType}`
    );
  }

  const data = Buffer.from(await response.arrayBuffer());
  // The service reports only how many panels failed, not why.
  const renderErrorCount = Number(response.headers.get('x-render-errors')) || 0;

  return {
    data,
    renderErrors:
      renderErrorCount > 0 ? [`${renderErrorCount} panel(s) reported a render error`] : [],
  };
}

/**
 * POSTs a render request, waiting out capacity rejections within the run's budget. Failures are
 * `RenderServiceError`s. Unsubscribing aborts the request.
 */
export function renderPage(
  payload: RenderPageRequest,
  config: PageRenderServiceConfig,
  context: RenderContext,
  logger: Logger
): Rx.Observable<RenderPageResult> {
  return new Rx.Observable<RenderPageResult>((subscriber) => {
    const controller = new AbortController();

    postWithRetry(payload, config, context, controller.signal, logger)
      .then((result) => {
        subscriber.next(result);
        subscriber.complete();
      })
      .catch((err) => subscriber.error(err));

    return () => controller.abort();
  });
}
