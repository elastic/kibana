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
const { patterns, strategy } = await logsDataAccess.services.semanticLogSearch.search({
  esClient,
  target: 'logs-*',
  nlQuery: 'connection failures',
  timeRange: { start: Date.now() - 3600000, end: Date.now() },
});
```

The implemented path is ES|QL `RERANK` + `CATEGORIZE`. If the cluster has no RERANK inference endpoint, `search` returns `{ patterns: [], unavailable: true }`.

The pre-indexed rungs (`semantic_text` / `pattern_text`) and `expand` are not implemented. Detection of those mappings is still in `detectCapabilities`; the planned direction is to feed patterns from Knowledge Indicators in the AI Index rather than querying logs at request time.

`strategy` names the ranking path that produced the result. It is a debug and eval signal, not something callers should branch on.
