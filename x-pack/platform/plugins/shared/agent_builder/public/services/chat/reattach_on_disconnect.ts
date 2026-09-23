/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OperatorFunction, Subscription } from 'rxjs';
import { defer, Observable, tap } from 'rxjs';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { isSSEError } from '@kbn/sse-utils';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { isExecutionTerminalEvent } from '@kbn/agent-builder-common';

const GATEWAY_ERROR_STATUSES: ReadonlySet<number> = new Set([502, 503, 504]);

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

/**
 * Whether a stream error was caused by the connection rather than by Kibana.
 */
export const isDisconnectError = (error: unknown): boolean => {
  if (isSSEError(error) || isAbortError(error)) {
    return false;
  }
  if (isHttpFetchError(error)) {
    const status = error.response?.status;
    return status === undefined || GATEWAY_ERROR_STATUSES.has(status);
  }
  return true;
};

const isNotFoundError = (error: unknown): boolean =>
  isHttpFetchError(error) && error.response?.status === 404;

interface StreamWithReattachParams<TResponse> {
  connect: () => Promise<TResponse>;
  reattach: (offset: number) => Promise<TResponse>;
  parse: OperatorFunction<TResponse, ChatEvent>;
  signal?: AbortSignal;
}

/**
 * Streams the events of an execution, re-attaching to it when the connection is cut by something
 * other than Kibana (e.g. a proxy timeout).
 *
 * @returns The events of the execution, without duplicates across reattaches.
 */
export const streamWithReattach = <TResponse>({
  connect,
  reattach,
  parse,
  signal,
}: StreamWithReattachParams<TResponse>): Observable<ChatEvent> =>
  new Observable<ChatEvent>((subscriber) => {
    let offset = 0;
    let terminated = false;
    let canReattach = true;
    let disconnectError: unknown;
    let connection: Subscription | undefined;

    const shouldReattach = () => canReattach && !signal?.aborted;

    const open = (request: () => Promise<TResponse>, isReattach: boolean) => {
      let receivedOnConnection = 0;
      connection = defer(request)
        .pipe(
          tap(() => {
            if (isReattach) {
              canReattach = true;
            }
          }),
          parse
        )
        .subscribe({
          next: (event) => {
            offset++;
            receivedOnConnection++;
            if (isExecutionTerminalEvent(event)) {
              terminated = true;
            }
            subscriber.next(event);
          },
          error: (error) => {
            if (shouldReattach() && isDisconnectError(error)) {
              disconnectError = error;
              reconnect();
              return;
            }
            subscriber.error(isReattach && isNotFoundError(error) ? disconnectError : error);
          },
          complete: () => {
            if (shouldReattach() && !terminated && receivedOnConnection > 0) {
              reconnect();
              return;
            }
            subscriber.complete();
          },
        });
    };

    const reconnect = () => {
      canReattach = false;
      open(() => reattach(offset), true);
    };

    open(connect, false);

    return () => {
      connection?.unsubscribe();
    };
  });
