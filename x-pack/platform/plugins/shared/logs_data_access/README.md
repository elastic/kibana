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
const { patterns } = await logsDataAccess.services.semanticLogSearch.search({
  esClient,
  target: 'logs-*',
  nlQuery: 'connection failures',
  timeRange: { start: Date.now() - 3600000, end: Date.now() },
});

// Expand a pattern to get raw documents
const { documents } = await logsDataAccess.services.semanticLogSearch.expand({
  esClient,
  target: 'logs-*',
  field: patterns[0].field,
  pattern: patterns[0].pattern,
  timeRange: { start: Date.now() - 3600000, end: Date.now() },
});
```

The service automatically detects index capabilities:
- If `semantic_text` is mapped: uses semantic ranking
- If `pattern_text` is mapped: uses exact template matching for expansion
- Otherwise: falls back to `categorize_text` aggregation

See [scripts/semantic_log_search/README.md](./scripts/semantic_log_search/README.md) for the evaluation harness.
