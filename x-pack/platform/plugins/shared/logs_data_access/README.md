# Logs data access

Exposes services to access logs data.

Services are registered during plugin [start](./server/plugin.ts) and defined in the [services](./server/services/) folder.

## Semantic log search

`semanticLogSearch.search()` finds recurring log patterns relevant to a natural-language query over existing logs. It uses ES|QL categorization followed by an inference rerank request, without changing mappings, ingestion pipelines, or stored documents.

Consumers provide an Elasticsearch client scoped to the caller's permissions:

```typescript
const controller = new AbortController();
const result = await logsDataAccess.services.semanticLogSearch.search({
  esClient: scopedClusterClient.asCurrentUser,
  target: 'logs-*',
  nlQuery: 'connection failures',
  timeRange: { start: Date.now() - 3_600_000, end: Date.now() },
  maxPatterns: 10,
  kqlFilter: 'service.name: checkout',
  abortSignal: controller.signal,
});

if (result.status === 'success') {
  // Consume result.patterns, ordered by relevance.
} else {
  // Handle result.reason; errors can also include result.diagnostics.
}
```

The time range uses epoch milliseconds with an inclusive start and exclusive end. `maxPatterns` defaults to 10 and accepts 1–100. The optional KQL filter restricts the corpus before grouping; the natural-language query ranks the collected patterns.

### Results and failures

| Status | Meaning | Fields |
| --- | --- | --- |
| `success` | Search completed; the pattern array can be empty | `patterns` |
| `unavailable` | No matching indices, missing required fields, or missing inference endpoint | `reason` |
| `error` | Invalid inputs, cancellation, timeout, oversized scope, inference timeout, or execution failure | `reason`, optional `diagnostics` |

Each pattern includes its template text, categorized field, occurrence count, first/last timestamps, representative message, and relevance score. It is a grouped result, not a source document with a clickable identity.

Counts and time bounds are exact for each returned category on the unsampled path. With sampling, counts are extrapolated estimates that can exceed the corpus size, and timestamps describe the sample rather than the full population. Candidate limits and sampling can omit relevant patterns; results do not establish exhaustive recall. The representative message is bounded to 2,000 characters.

Relevance scores order results within a response. They are uncalibrated, depend on the configured model, and are not confidence probabilities. There is no calibrated score threshold for declaring that nothing relevant matched. An empty success means no patterns were collected in the requested scope.

Failures never silently fall back to keyword search. Missing capabilities produce `unavailable`; authorization and transport failures produce `error`. Partial ES|QL responses are rejected. Error diagnostics identify the phase (`capabilities`, `probe`, `search`, or `rerank`) and, when available, the Elasticsearch error type or JavaScript error name. Error messages are logged server-side rather than returned in diagnostics.

A probe timeout returns `scope_too_large`; narrowing the scope may help. Rerank timeouts return `inference_not_ready`, which can indicate model startup or an inference timeout and does not prove the model is loading. Consumers decide whether to retry based on the reason and their request lifecycle.

### Configuration and data flow

| Setting | Default | Purpose |
| --- | --- | --- |
| `xpack.logsDataAccess.semanticLogSearch.rerankInferenceId` | `.rerank-v1-elasticsearch` | Inference endpoint used to rank patterns |

The general default uses local inference. Serverless Observability selects `.jina-reranker-v3` in its deployment configuration. Endpoint existence is checked before retrieval, but does not establish readiness: a local model may need to load before serving requests.

The configured endpoint receives the natural-language query and bounded candidate text derived from log patterns and sample messages. Hosted endpoints send that content to their inference provider. A custom endpoint's name alone does not establish its hosting location or data residency. Returned sample messages may also be forwarded by consumers; that data flow belongs to the consumer.

The service requires mapped `message` and `@timestamp` fields and a rerank endpoint. Field capability checks do not establish that `message` is populated or qualify every mapping combination. Cold/frozen tiers, cross-cluster targets, and production concurrency require separate qualification.

### Execution and limits

1. Validate input and check field/inference capabilities.
2. Count matching documents with a 5-second transport timeout.
3. Categorize with a 30-second timeout per pass. Small scopes use one unsampled pass. Larger scopes use a sampled frequent-pattern pass followed by a pass excluding those patterns to recover rare candidates.
4. Deduplicate and select at most 500 candidates, reserving 20% of the selection for frequent patterns and 80% for rare patterns when the cap applies.
5. Rank through `esClient.inference.rerank`, with a 55-second inference timeout and a 60-second transport timeout, then return at most `maxPatterns` results.

Each categorization pass returns at most 1,000 rows. The sampling target is approximately 50,000 documents; it is not a hard scan bound. Filtering, shard fan-out, and the count probe still incur work outside that sample. Phase timeouts are not a single end-to-end deadline.

Rerank input is capped at 1,200 characters per candidate with a target total of 12,000 characters. An 80-character allowance per candidate takes precedence over the total target, so 500 candidates can require up to 40,000 characters. These limits bound inputs, not inference latency.

### Query construction

The target uses a bounded character allowlist because `esql.from()` interpolates source patterns without quoting them. KQL and pattern-exclusion strings use `esql.str()` escaping. Absolute time bounds are sent as named ES|QL parameters. The natural-language query is a separate inference API parameter and is never interpolated into ES|QL.

### Validation

Run the plugin's tests and scoped type check from the repository root:

```bash
node scripts/jest x-pack/platform/plugins/shared/logs_data_access
node scripts/type_check --project x-pack/platform/plugins/shared/logs_data_access/tsconfig.json
```
