# @kbn/ml-response-stream

This package provides utilities to create HTTP streaming endpoints.

- Supports optional `gzip` compression.
- Streams can be plain strings or NDJSON.
- The provided custom hook `useFetchStream()` supports debouncing to avoid flooding the DOM with lots of small incremental updates. The hook also takes care of handling potential partial chunks.

The package does not expose `index.ts` at its root, instead there's a `client` and `server` directory you should deep-import from.

For more details and examples on how to use the package please refer to `examples/response_stream/README.md`.
