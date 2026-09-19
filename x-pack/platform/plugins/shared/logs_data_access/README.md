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
  // result.reason: 'timeout' | 'cancelled' | 'execution'
}
```

`search` returns a discriminated union on `status`:

| `status` | When | Extra fields |
|---|---|---|
| `'success'` | Patterns found (may be empty array) | `patterns: LogPattern[]` |
| `'unavailable'` | Cluster lacks required capability | `reason: 'missing_fields' \| 'inference_unavailable'` |
| `'error'` | Request failed or was rejected | `reason: 'timeout' \| 'cancelled' \| 'execution'` |

### Capability checks

Before running the query the service performs two checks:

1. **`hasRequiredFields`** — verifies `message` and `@timestamp` exist on the target via field caps. Returns `{ status: 'unavailable', reason: 'missing_fields' }` when absent.
2. **`detectRerankCapability`** — checks that the `.rerank-v1-elasticsearch` inference endpoint is available (preconfigured in ES 9.3+). Returns `{ status: 'unavailable', reason: 'inference_unavailable' }` when absent.

### Strategy

The only implemented ranking path is ES|QL `CATEGORIZE` + `RERANK`. Pre-indexed strategies (`semantic_text`, `pattern_text`) and pattern expansion are not implemented.
