/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReducerAction } from 'react';

import type { UseFetchStreamParamsDefault } from './use_fetch_stream';

type GeneratorError = string | null;

/**
 * Uses `fetch` and `getReader` to receive an API call as a stream with multiple chunks
 * as soon as they are available. `fetchStream` is implemented as a generator that will
 * yield/emit chunks and can be consumed for example like this:
 *
 * ```js
 * for await (const [error, chunk] of fetchStream(...) {
 *     ...
 * }
 * ```
 *
 * @param endpoint     — The API endpoint including the Kibana basepath.
 * @param abortCtrl    — Abort controller for cancelling the request.
 * @param body         — The request body. For now all requests are POST.
 * @param ndjson       — Boolean flag to receive the stream as a raw string or NDJSON.
 * @param bufferBounce — A buffer timeout which defaults to 100ms. This collects stream
 *                       chunks for the time of the timeout and only then yields/emits them.
 *                       This is useful so we are more in control of passing on data to
 *                       consuming React components and we won't hammer the DOM with
 *                       updates on every received chunk.
 *
 * @returns            - Yields/emits items in the format [error, value]
 *                       inspired by node's recommended error convention for callbacks.
 */
export async function* fetchStream<I extends UseFetchStreamParamsDefault, BasePath extends string>(
  endpoint: `${BasePath}${I['endpoint']}`,
  abortCtrl: React.MutableRefObject<AbortController>,
  body: I['body'],
  ndjson = true,
  bufferBounce = 100
): AsyncGenerator<
  [GeneratorError, ReducerAction<I['reducer']> | Array<ReducerAction<I['reducer']>> | undefined]
> {
  let stream: Response;

  try {
    stream = await fetch(endpoint, {
      signal: abortCtrl.current.signal,
      method: 'POST',
      headers: {
        // This refers to the format of the request body,
        // not the response, which will be a uint8array Buffer.
        'Content-Type': 'application/json',
        'kbn-xsrf': 'stream',
      },
      ...(Object.keys(body).length > 0 ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    yield [error.toString(), undefined];
    return;
  }

  if (!stream.ok) {
    yield [`Error ${stream.status}: ${stream.statusText}`, undefined];
    return;
  }

  if (stream.body !== null) {
    // Note that Firefox 99 doesn't support `TextDecoderStream` yet.
    // That's why we skip it here and use `TextDecoder` later to decode each chunk.
    // Once Firefox supports it, we can use the following alternative:
    // const reader = stream.body.pipeThrough(new TextDecoderStream()).getReader();
    const reader = stream.body.getReader();

    let partial = '';
    let actionBuffer: Array<ReducerAction<I['reducer']>> = [];
    let lastCall = 0;

    while (true) {
      try {
        const { value: uint8array, done } = await reader.read();
        if (done) break;

        const value = new TextDecoder().decode(uint8array);

        const full = `${partial}${value}`;
        const parts = ndjson ? full.split('\n') : [full];
        const last = ndjson ? parts.pop() : '';

        partial = last ?? '';

        const actions = (ndjson ? parts.map((p) => JSON.parse(p)) : parts) as Array<
          ReducerAction<I['reducer']>
        >;
        actionBuffer.push(...actions);

        const now = Date.now();

        if (now - lastCall >= bufferBounce && actionBuffer.length > 0) {
          yield [null, actionBuffer];
          actionBuffer = [];
          lastCall = now;

          // In cases where the next chunk takes longer to be received than the `bufferBounce` timeout,
          // we trigger this client side timeout to clear a potential intermediate buffer state.
          // Since `yield` cannot be passed on to other scopes like callbacks,
          // this pattern using a Promise is used to wait for the timeout.
          yield new Promise<
            [
              GeneratorError,
              ReducerAction<I['reducer']> | Array<ReducerAction<I['reducer']>> | undefined
            ]
          >((resolve) => {
            setTimeout(() => {
              if (actionBuffer.length > 0) {
                resolve([null, actionBuffer]);
                actionBuffer = [];
                lastCall = now;
              } else {
                resolve([null, []]);
              }
            }, bufferBounce + 10);
          });
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          yield [error.toString(), undefined];
        }
        break;
      }
    }

    // The stream reader might finish with a partially filled actionBuffer so
    // we need to clear it once more after the request is done.
    if (actionBuffer.length > 0) {
      yield [null, actionBuffer];
      actionBuffer.length = 0;
    }
  }
}
