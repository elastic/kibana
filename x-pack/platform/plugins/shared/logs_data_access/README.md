# Logs data access

Exposes services to access logs data.

Services are registered during plugin [start](./server/plugin.ts) phase and defined in the [services](./server/services/) folder.

## Services

- **logSourcesServiceFactory** — Resolves log source indices
- **getLogsRatesService** — Calculates log rates and metrics
- **getLogsRateTimeseries** — Log rate time series data
- **getLogsErrorRateTimeseries** — Error rate time series data
- **semanticLogSearch** — Semantic search for log patterns (see below)

## Semantic Log Search

The `semanticLogSearch` service provides natural language search for log patterns:

```typescript
const result = await logsDataAccess.services.semanticLogSearch.search({
  esClient,
  target: 'logs-*',
  nlQuery: 'connection failures',
  timeRange: { start: Date.now() - 3600000, end: Date.now() },
  // optional:
  maxPatterns: 10,       // default 10, max 100
  kqlFilter: 'host.name: "my-host"',
  abortSignal: controller.signal,
});

if (result.status === 'success') {
  // result.patterns: LogPattern[]
} else if (result.status === 'unavailable') {
  // result.reason: 'missing_fields' | 'inference_unavailable'
} else {
  // result.reason: 'timeout' | 'cancelled' | 'execution' | 'invalid_params'
}
```

`search` returns a discriminated union on `status`:

| `status` | When | Extra fields |
|---|---|---|
| `'success'` | Patterns found (may be empty array) | `patterns: LogPattern[]` |
| `'unavailable'` | Cluster lacks required capability | `reason: 'missing_fields' \| 'inference_unavailable'` |
| `'error'` | Request failed or was rejected | `reason: 'timeout' \| 'cancelled' \| 'execution' \| 'invalid_params'` |

### Capability checks

Before running the query the service performs two checks:

1. **`hasRequiredFields`** — verifies `message` and `@timestamp` exist on the target via field caps. Returns `{ status: 'unavailable', reason: 'missing_fields' }` when absent.
2. **`detectRerankCapability`** — checks that the configured `rerank` inference endpoint is available. Returns `{ status: 'unavailable', reason: 'inference_unavailable' }` when absent. A configured endpoint that does not exist is reported the same way, since the result type cannot distinguish them; the server log names the endpoint so an operator can tell a typo from a cluster without reranking.

### Configuration

| Setting | Default | Purpose |
|---|---|---|
| `xpack.logsDataAccess.semanticLogSearch.rerankInferenceId` | `.rerank-v1-elasticsearch` | Inference endpoint used to rank log patterns. |

The default runs locally and is preconfigured by Elasticsearch in 9.3+, so the feature needs no setup. Pointing it at another `rerank` endpoint trades that for speed — a hosted (EIS) reranker measured 147 ms against 2,311 ms for the same 17 candidates — at two costs: a hosted endpoint sends log message text out of the cluster, and `relevanceScore` is per-model, so scores are not comparable across endpoints.

### Strategy

The only implemented ranking path is ES|QL `CATEGORIZE` + `RERANK`. Pre-indexed strategies (`semantic_text`, `pattern_text`) and pattern expansion are not implemented.

Rerank latency is linear in the **total characters** sent, not in the number of candidates: roughly 0.8 ms per character divided by the endpoint's allocation count. `RERANK_INPUT_TOTAL_CHAR_BUDGET` therefore bounds a query's cost, and `buildRerankInputs` spends that budget by trimming the longest candidates rather than dropping any — a dropped candidate is a pattern the caller can never see, which is the failure this feature exists to avoid.

### Security invariants

Two properties must never be regressed:

1. **`target` is validated against an allowlist, never a denylist.** `esql.from(target)` interpolates its argument verbatim — the `@elastic/esql` library's `Builder.expression.source.node` hardcodes `{ unquoted: true }` for string inputs and `LeafPrinter.string` short-circuits all escaping on that flag. The allowlist in `schema.ts` is derived directly from the ES|QL lexer's `UNQUOTED_SOURCE_PART` grammar fragment and is covered by a parser-pinned property test in `schema.test.ts` that asserts anything the schema accepts cannot change the query's shape. A denylist would need to enumerate every whitespace and syntax character the ES|QL tokenizer recognises — `\n`, `\r`, `\t` are whitespace in ES|QL but not in standard index-name rules. Do not replace the allowlist with a denylist.

2. **`nlQuery` and `kqlFilter` must remain parameterized through `esql.str()`.** They reach the query as `query.where\`KQL(${esql.str(kqlFilter)})\`` and `.pipe\`RERANK ${esql.str(nlQuery)} ON …\``. `esql.str()` produces a properly escaped triple-quoted ES|QL string literal; inlining the values directly into the query string would allow injection.
