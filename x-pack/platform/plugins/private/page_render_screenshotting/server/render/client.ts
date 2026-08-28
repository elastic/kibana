/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { RenderPageErrorBody, RenderPageRequest, RenderPageResult } from './types';

export interface PageRenderServiceConfig {
  url: string;
  secret: string;
}

const SERVICE_SECRET_HEADER = 'x-render-service-secret';
const RENDER_PATH = '/v1/render-page';
const DEFAULT_RETRY_AFTER_SECONDS = 30;
// Keep enough runway before the task's own hard timeout (report:execute's queue.timeout, ~4
// minutes) to still fail cleanly and let task-manager's own retry take over, rather than getting
// cut off mid-request.
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

async function safeReadErrorBody(response: Response): Promise<RenderPageErrorBody | undefined> {
  try {
    return (await response.json()) as RenderPageErrorBody;
  } catch {
    return undefined;
  }
}

async function postWithRetry(
  payload: RenderPageRequest,
  config: PageRenderServiceConfig,
  deadline: number | undefined,
  signal: AbortSignal,
  logger: Logger
): Promise<RenderPageResult> {
  for (;;) {
    const response = await fetch(`${config.url}${RENDER_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', [SERVICE_SECRET_HEADER]: config.secret },
      body: JSON.stringify(payload),
      signal,
    });

    if (response.status === 429) {
      const retryAfterSeconds =
        Number(response.headers.get('retry-after')) || DEFAULT_RETRY_AFTER_SECONDS;
      const retryAfterMs = retryAfterSeconds * 1000;

      if (deadline !== undefined && Date.now() + retryAfterMs > deadline) {
        throw new Error(
          `page-render-service is saturated (429) and there isn't enough time left in the task ` +
            `to wait out its Retry-After (${retryAfterSeconds}s)`
        );
      }

      logger.debug(`page-render-service saturated (429), retrying in ${retryAfterSeconds}s`);
      await delay(retryAfterMs, signal);
      continue;
    }

    if (!response.ok) {
      const body = await safeReadErrorBody(response);
      const detail = body?.phase
        ? ` (phase: ${body.phase}${
            body.documentStatus ? `, documentStatus: ${body.documentStatus}` : ''
          })`
        : '';
      throw new Error(
        `page-render-service request failed: ${response.status} ${
          body?.error ?? response.statusText
        }${detail}`
      );
    }

    const data = Buffer.from(await response.arrayBuffer());
    // The service only reports a count of panels that failed to render, not their messages.
    const renderErrorCount = Number(response.headers.get('x-render-errors')) || 0;

    return {
      data,
      renderErrors:
        renderErrorCount > 0 ? [`${renderErrorCount} panel(s) reported a render error`] : [],
    };
  }
}

/**
 * POSTs a render request to page-render-service, retrying on 429 (honoring `Retry-After`) up to
 * `retryAt` minus a safety margin. Returned as an Observable, not a Promise, so that unsubscribing
 * (e.g. the export type's `takeUntil(cancellationToken)`) aborts the in-flight request/retry loop
 * instead of leaking it.
 */
export function renderPage(
  payload: RenderPageRequest,
  config: PageRenderServiceConfig,
  retryAt: Date | null | undefined,
  logger: Logger
): Rx.Observable<RenderPageResult> {
  return new Rx.Observable<RenderPageResult>((subscriber) => {
    const controller = new AbortController();
    const deadline = retryAt ? retryAt.getTime() - DEADLINE_SAFETY_MARGIN_MS : undefined;

    postWithRetry(payload, config, deadline, controller.signal, logger)
      .then((result) => {
        subscriber.next(result);
        subscriber.complete();
      })
      .catch((err) => subscriber.error(err));

    return () => controller.abort();
  });
}
