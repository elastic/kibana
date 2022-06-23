# @kbn/aiops-utils

The `aiops-utils` package contains static utilities maintained by the ML team for AIOps related efforts.

<!-- INSERT GENERATED DOCS START -->

### `acceptCompression` (function)

Returns whether request headers accept a response using gzip compression.

**Parameters:**

- headers (`Headers`) - Request headers.

**returns:** boolean

### `streamFactory` (function)

Overload to set up a string based response stream with support
for gzip compression depending on provided request headers.

**Parameters:**

- headers (`Headers`) - Request headers.

**returns:** StreamFactoryReturnType<T>

### `streamFactory` (function)

Sets up a response stream with support for gzip compression depending on provided
request headers. Any non-string data pushed to the stream will be stream as NDJSON.

**Parameters:**

- headers (`Headers`) - Request headers.

**returns:** StreamFactoryReturnType<T>

### `fetchStream` (function)

Uses `fetch` and `getReader` to receive an API call as a stream with multiple chunks
as soon as they are available. `fetchStream` is implemented as a generator that will
yield/emit chunks and can be consumed for example like this:

```js
for await (const [error, chunk] of fetchStream(...) {
    ...
}
```

**Parameters:**

- endpoint (`${BasePath}${I["endpoint"]}`) - — The API endpoint including the Kibana basepath.
- abortCtrl (`MutableRefObject<AbortController>`) - — Abort controller for cancelling the request.
- body (`I["body"]`) - — The request body. For now all requests are POST.
- ndjson (`boolean`) - — Boolean flag to receive the stream as a raw string or NDJSON.
- bufferBounce (`number`) - — A buffer timeout which defaults to 100ms. This collects stream
  chunks for the time of the timeout and only then yields/emits them.
  This is useful so we are more in control of passing on data to
  consuming React components and we won't hammer the DOM with
  updates on every received chunk.

**returns:** AsyncGenerator<[string, ReducerAction<I["reducer"]> | ReducerAction<I["reducer"]>[]], any, unknown>

### `StringReducer` (type)

### `stringReducer` (function)

The `stringReducer` is provided to handle plain string based streams with `streamFactory()`.

**Parameters:**

- state (`string`) - The current state, being the string fetched so far.
- payload (`StringReducerPayload`) - — The state update can be a plain string, an array of strings or `undefined`.
  - An array of strings will be joined without a delimiter and added to the current string.
    In combination with `useFetchStream`'s buffering this allows to do bulk updates
    within the reducer without triggering a React/DOM update on every stream chunk.
  - `undefined` can be used to reset the state to an empty string, for example, when a
    UI has the option to trigger a refetch of a stream.

**returns:** string

### `UseFetchStreamCustomReducerParams` (interface)

Custom hook type definition of the base params for an NDJSON stream with custom reducer.

**Members:**

- endpoint (`string`)
- body (`object`)
- reducer (`Reducer<any, any>`)

### `UseFetchStreamParamsDefault` (interface)

Custom hook type definition of the base params for a string base stream without a custom reducer.

**Members:**

- endpoint (`string`)
- body (`object`)
- reducer (`StringReducer`)

### `useFetchStream` (function)

**Parameters:**

- endpoint (`${BasePath}${I["endpoint"]}`)
- body (`I["body"]`)

**returns:** UseFetchStreamReturnType<string, ReducerAction<I["reducer"]>>

### `useFetchStream` (function)

**Parameters:**

- endpoint (`${BasePath}${I["endpoint"]}`)
- body (`I["body"]`)
- options (`{ reducer: I["reducer"]; initialState: ReducerState<I["reducer"]>; }`)

**returns:** UseFetchStreamReturnType<string, ReducerAction<I["reducer"]>>

### `useFetchStream` (function)

Custom hook to receive streaming data.

**Parameters:**

- endpoint (`${BasePath}${I["endpoint"]}`) - API endpoint including Kibana base path.
- body (`I["body"]`) - API request body.
- options (`{ reducer: I["reducer"]; initialState: ReducerState<I["reducer"]>; }`) - Optional custom reducer and initial state.

**returns:** UseFetchStreamReturnType<string, ReducerAction<I["reducer"]>>

<!-- INSERT GENERATED DOCS END -->
