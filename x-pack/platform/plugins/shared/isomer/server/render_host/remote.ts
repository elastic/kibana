/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition } from '@elastic/isomer-sdk';
import type { Logger } from '@kbn/logging';

import type { RenderHost } from './client';
import type { HostDrawOptions } from './protocol';

const RENDER_PATH = '/v1/render-composition';
const REJECTION_HEADER = 'x-isomer-render-service-rejection';
const RETRY_INTERVAL_HEADER = 'x-render-retry-interval-ms';

/** Why a remote draw failed, for a caller deciding whether to draw elsewhere. */
export type RenderServiceFailure =
  /** Unreachable, saturated or draining for the whole budget: another host may succeed. */
  | 'unavailable'
  /** The service renders a different vocabulary than this runtime composes. */
  | 'vocabulary'
  /** The service refused the request: invalid, too large, or an error of its own. */
  | 'rejected';

export class RenderServiceError extends Error {
  constructor(public readonly failure: RenderServiceFailure, message: string) {
    super(message);
    this.name = 'RenderServiceError';
  }
}

export interface RemoteRenderHostOptions {
  /** The service's origin, e.g. `http://localhost:3000`. */
  url: string;
  /** This runtime's vocabulary digest; the service refuses a request from a different one. */
  vocabulary?: string;
  /** How long one draw may spend, waiting for capacity included. Defaults to a minute. */
  timeoutMs?: number;
  /** The first wait after a saturated or draining answer; each later wait doubles, to a cap. */
  retryMs?: number;
  fetch?: typeof fetch;
  logger?: Logger;
}

const MAX_RETRY_MS = 5_000;

const jitter = (ms: number) => Math.round(ms * (0.75 + Math.random() * 0.5));

const delay = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true }
    );
  });

const errorBody = async (response: Response): Promise<{ error?: string; code?: string }> => {
  try {
    const body: unknown = await response.json();
    return body && typeof body === 'object' ? (body as { error?: string; code?: string }) : {};
  } catch {
    return {};
  }
};

/**
 * A {@link RenderHost} that draws in the Isomer render service instead of a forked process: the same draw
 * options, posted as JSON, with the vocabulary this runtime composes in. A saturated or draining answer is
 * retried, with the interval sent as the service's busy signal expects, until the budget runs out.
 */
export const createRemoteRenderHost = ({
  url,
  vocabulary,
  timeoutMs = 60_000,
  retryMs = 500,
  fetch: fetchImpl = fetch,
  logger,
}: RemoteRenderHostOptions): RenderHost => {
  const endpoint = `${url.replace(/\/+$/, '')}${RENDER_PATH}`;
  let closed = false;

  const draw = async (composition: Composition, options: HostDrawOptions): Promise<Buffer> => {
    if (closed) {
      throw new Error('the render host is closed');
    }
    const controller = new AbortController();
    const budget = setTimeout(
      () =>
        controller.abort(new RenderServiceError('unavailable', `no render within ${timeoutMs} ms`)),
      timeoutMs
    );
    const body = JSON.stringify({
      composition,
      options,
      ...(vocabulary ? { expects: { vocabulary } } : {}),
    });
    let wait = retryMs;
    try {
      for (;;) {
        let response: Response;
        try {
          response = await fetchImpl(endpoint, {
            method: 'POST',
            headers: { 'content-type': 'application/json', [RETRY_INTERVAL_HEADER]: String(wait) },
            body,
            signal: controller.signal,
          });
        } catch (error) {
          if (controller.signal.aborted) {
            throw controller.signal.reason;
          }
          throw new RenderServiceError(
            'unavailable',
            `could not reach the render service at ${url}: ${(error as Error).message}`
          );
        }
        if (response.ok) {
          return Buffer.from(await response.arrayBuffer());
        }
        const rejection = response.headers.get(REJECTION_HEADER);
        if (response.status === 429 || response.status === 503 || rejection) {
          logger?.debug(`render service ${rejection ?? response.status}; retrying in ${wait} ms`);
          await delay(jitter(wait), controller.signal);
          wait = Math.min(wait * 2, MAX_RETRY_MS);
          continue;
        }
        const { error, code } = await errorBody(response);
        const message = `render service answered ${response.status}${code ? ` ${code}` : ''}: ${
          error ?? response.statusText
        }`;
        throw new RenderServiceError(response.status === 409 ? 'vocabulary' : 'rejected', message);
      }
    } finally {
      clearTimeout(budget);
    }
  };

  return {
    drawPng: (composition, options = {}) => draw(composition, { ...options, format: 'png' }),
    drawPdf: (composition, options = {}) => draw(composition, { ...options, format: 'pdf' }),
    get pid() {
      return undefined;
    },
    close: async () => {
      closed = true;
    },
  };
};

/**
 * Draws remotely, and locally when the service is unavailable or renders another vocabulary. A request the
 * service rejected on its merits is not retried locally: the local host would reject it the same way.
 */
export const withLocalFallback = (
  remote: RenderHost,
  local: () => Promise<RenderHost>,
  logger?: Logger
): RenderHost => {
  const attempt = async (
    method: 'drawPng' | 'drawPdf',
    composition: Composition,
    options: Omit<HostDrawOptions, 'format'> | undefined
  ): Promise<Buffer> => {
    try {
      return await remote[method](composition, options);
    } catch (error) {
      if (!(error instanceof RenderServiceError) || error.failure === 'rejected') {
        throw error;
      }
      logger?.warn(`${error.message}; drawing locally`);
      return (await local())[method](composition, options);
    }
  };
  return {
    drawPng: (composition, options) => attempt('drawPng', composition, options),
    drawPdf: (composition, options) => attempt('drawPdf', composition, options),
    get pid() {
      return remote.pid;
    },
    close: async () => {
      await remote.close();
    },
  };
};
