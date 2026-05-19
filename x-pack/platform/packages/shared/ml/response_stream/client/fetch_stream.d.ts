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
export declare function fetchStream<B extends object, R extends Reducer<any, any>>(http: HttpSetup, endpoint: string, apiVersion: string | undefined, abortCtrl: React.MutableRefObject<AbortController>, body?: B, ndjson?: boolean, headers?: HttpFetchOptions['headers']): AsyncGenerator<[GeneratorError, ReducerAction<R> | undefined]>;
export {};
