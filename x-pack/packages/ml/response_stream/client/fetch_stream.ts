/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { startsWith } from 'lodash';
import type { Reducer, ReducerAction } from 'react';

import type { HttpSetup, HttpFetchOptions } from '@kbn/core/public';

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
 * Note on the use of `any`:
 * The generic `R` extends from `Reducer<any, any>`
 * to match the definition in React itself.
 *
 * @param endpoint     — The API endpoint including the Kibana basepath.
 * @param apiVersion   - Optional API version to be used.
 * @param abortCtrl    — Abort controller for cancelling the request.
 * @param body         — The request body. For now all requests are POST.
 * @param ndjson       — Boolean flag to receive the stream as a raw string or NDJSON.
 *
 * @returns            - Yields/emits items in the format [error, value]
 *                       inspired by node's recommended error convention for callbacks.
 */
export async function* fetchStream<B extends object, R extends Reducer<any, any>>(
  http: HttpSetup,
  endpoint: string,
  apiVersion: string | undefined,
  abortCtrl: React.MutableRefObject<AbortController>,
  body?: B,
  ndjson = true,
  headers?: HttpFetchOptions['headers']
): AsyncGenerator<[GeneratorError, ReducerAction<R> | Array<ReducerAction<R>> | undefined]> {
  let stream: Readonly<Response> | undefined;

  try {
    const response = await http.post(endpoint, {
      signal: abortCtrl.current.signal,
      version: apiVersion,
      asResponse: true,
      rawResponse: true,
      headers,
      ...(body && Object.keys(body).length > 0 ? { body: JSON.stringify(body) } : {}),
    });

    stream = response.response;
  } catch (error) {
    yield [error.toString(), undefined];
    return;
  }

  if (!stream) {
    yield [`Error: Response was undefined`, undefined];
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

    while (true) {
      try {
        const { value: uint8array, done } = await reader.read();
        if (done) break;

        const value = new TextDecoder().decode(uint8array);

        const full = `${partial}${value}`;
        const parts = ndjson ? full.split('\n') : [full];
        const last = ndjson ? parts.pop() : '';

        partial = last ?? '';

        const actions = (
          ndjson
            ? parts
                .map((p) => {
                  // Check if the response is an `event: ` or `data: ` prefixed SSE event.
                  // Note this is a workaround, we don't have actual support for SSE events yet.
                  if (p === '' || startsWith(p, 'event: ') || p === 'data: [DONE]') {
                    return '[IGNORE]';
                  } else if (startsWith(p, 'data: ')) {
                    return JSON.parse(p.split('data: ')[1]);
                  }
                  return JSON.parse(p);
                })
                .filter((p) => p !== '[IGNORE]')
            : parts
        ) as Array<ReducerAction<R>>;

        yield [null, actions];
      } catch (error) {
        if (error.name !== 'AbortError') {
          yield [error.toString(), undefined];
        }
        break;
      }
    }
  }
}
