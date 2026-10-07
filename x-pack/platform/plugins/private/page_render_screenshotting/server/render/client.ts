/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import type { Dispatcher } from 'undici';
import type { Logger } from '@kbn/logging';
import type { RenderPageErrorBody, RenderPageRequest, RenderPageResult } from './types';

export interface PageRenderServiceConfig {
  url: string;
  createToken: (signal: AbortSignal) => Promise<string>;
  /** Presents Kibana's client certificate, which the service requires alongside the token. */
  dispatcher?: Dispatcher;
}

const RENDER_PATH = '/v1/render-page';
const CONTENT_TYPES = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpeg: 'image/jpeg',
} as const;
const DEFAULT_RETRY_AFTER_SECONDS = 30;
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

async function postWithRetry(
  payload: RenderPageRequest,
  config: PageRenderServiceConfig,
  deadline: number | undefined,
  signal: AbortSignal,
  logger: Logger
): Promise<RenderPageResult> {
  for (;;) {
    // Minted per attempt: a retry can outlive the previous token.
    const token = await config.createToken(signal);
    const requestInit: RequestInit & { dispatcher?: Dispatcher } = {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal,
      dispatcher: config.dispatcher,
    };
    const response = await fetch(`${config.url.replace(/\/+$/, '')}${RENDER_PATH}`, requestInit);

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
      const body = await readErrorBody(response);
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
}

/**
 * POSTs a render request, retrying 429s until `retryAt` (less a safety margin). Unsubscribing
 * aborts the request.
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
