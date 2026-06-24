---
name: elasticsearch-esql
description: >
  Execute ES|QL (Elasticsearch Query Language) queries, use when the user wants to query Elasticsearch data, analyze
  logs, aggregate metrics, explore data, or create charts and dashboards from ES|QL results.
compatibility: >
  Requires Elasticsearch 8.11+ (8.14+ for GA ES|QL) or Elastic Cloud Serverless. Uses the `elastic` CLI for all
  operations.
metadata:
  author: es-analytical-engine
  version: "0.5.0"
  visibility: public
---

# Elasticsearch ES|QL

Execute ES|QL queries against Elasticsearch.

## What is ES|QL?

ES|QL (Elasticsearch Query Language) is a piped query language for Elasticsearch. It is **NOT** the same as:

- Elasticsearch Query DSL (JSON-based)
- SQL
- EQL (Event Query Language)

ES|QL uses pipes (`|`) to chain commands:
`FROM index | WHERE condition | STATS aggregation BY field | SORT field | LIMIT n`

> **Prerequisite:** ES|QL requires `_source` to be enabled on queried indices. Indices with `_source` disabled (e.g.,
> `"_source": { "enabled": false }`) will cause ES|QL queries to fail.
>
> **Version Compatibility:** ES|QL was introduced in 8.11 (tech preview) and became GA in 8.14. Features like
> `LOOKUP JOIN` (8.18+), `MATCH` (8.17+), and `INLINE STATS` (9.2+) were added in later versions. On pre-8.18 clusters,
> use `ENRICH` as a fallback for `LOOKUP JOIN` (see generation tips). `INLINE STATS` and counter-field `RATE()` have
> **no fallback** before 9.2. Check [references/esql-version-history.md](references/esql-version-history.md) for feature
> availability by version.
>
> **Cluster Detection:** Use the `GET /` response to determine the cluster type and version:
>
> - `build_flavor: "serverless"` — Elastic Cloud Serverless. `version.number` tracks the stack line under active
>   development (next minor from main), so clients that only semver-compare may treat Serverless as “latest.” **Do not**
>   use `version.number` to gate features: if `build_flavor` is `"serverless"`, assume all GA and preview ES|QL features
>   are available.
> - `build_flavor: "default"` — Self-managed or Elastic Cloud Hosted. Use `version.number` for feature availability.
> - **Snapshot builds** have `version.number` like `9.4.0-SNAPSHOT`. Strip the `-SNAPSHOT` suffix and use the
>   major.minor for version checks. Snapshot builds include all features from that version plus potentially unreleased
>   features from development — if a query fails with an unknown function/command, it may simply not have landed yet.
>   Elastic employees commonly use snapshot builds for testing.

<!-- begin-partial: preamble -->

## Environment Configuration

This skill executes Elasticsearch operations through the `elastic` CLI. Before running any other step, confirm the
`elastic` CLI is installed and available. If it is not installed, ask the user:

> "The `elastic` CLI is not available. You must install the
> [`elastic` CLI](https://github.com/elastic/cli#configuration) before continuing?"

Wait for the user's response. Do not guess credentials, call the HTTP API directly, or attempt other workarounds.

This skill references operations in HTTP-shorthand form (e.g., `GET /`, `GET /_cat/indices`, `GET /{index}/_mapping`,
`GET /{index}/_settings/index.mode`, `POST /_query`). The [Operations](#operations) table at the end of this document
maps each shorthand to the equivalent `elastic` CLI command — always use the CLI rather than calling the HTTP API
directly.

Verify the connection by calling `GET /`. If verification fails, point the user to the
[CLI configuration instructions](https://github.com/elastic/cli#configuration).

<!-- end-partial: preamble -->

## Guidelines

1. **Detect deployment type**: Always run `GET /` first. This detects whether the deployment is a Serverless project
   (all features available) or a versioned cluster (features depend on version). The `build_flavor` field from the
   cluster info response is the authoritative signal — if it equals `"serverless"`, ignore the reported version number
   and use all ES|QL features freely.

2. **Discover schema** (required — never guess index or field names): list matching indices
   (`GET /_cat/indices/{pattern}`), then fetch the field mappings for the chosen index (`GET /{index}/_mapping`).

   Always run schema discovery before generating queries. Index names and field names vary across deployments and cannot
   be reliably guessed. Even common-sounding data (e.g., "logs") may live in indices named `logs-test`, `logs-app-*`, or
   `application_logs`. Field names may use ECS dotted notation (`source.ip`, `service.name`) or flat custom names — the
   only way to know is to check.

   **Prefer simplicity:** Query a single index unless the user explicitly asks for data across multiple sources. Do not
   combine indices with different schemas using `COALESCE` unless specifically requested — pick the single most relevant
   index for the question. When multiple indices contain similar data, prefer the one with the most complete schema for
   the task at hand.

   `GET /{index}/_mapping` reports the index mode. If it shows `Index mode: time_series`, the output includes the data
   stream name and copy-pasteable TS syntax — use `TS <data-stream>` (not `FROM`), `TBUCKET(interval)` (not
   `DATE_TRUNC`), and wrap counter fields with `SUM(RATE(...))`. Read the full TS section in
   [Generation Tips](references/generation-tips.md) before writing any time series query. You can also check the index
   mode directly via `GET /{index}/_settings/index.mode`.

   For TSDS indices on 9.4+, prefer the in-language discovery commands `METRICS_INFO` and `TS_INFO` (both GA) over
   inspecting mappings — they enumerate the metric catalogue and the dimension labels of each time series directly. Both
   must follow `TS` and must precede `STATS`/`SORT`/`LIMIT`. See
   [Time Series Queries](references/time-series-queries.md#metric-and-time-series-discovery). Run them via
   `POST /_query?format=tsv` with queries like `TS metrics-tsds | METRICS_INFO | SORT metric_name` and
   `TS metrics-tsds | TS_INFO | KEEP metric_name, dimensions | SORT metric_name`.

3. **Choose the right ES|QL feature for the task**: Before writing queries, match the user's intent to the most
   appropriate ES|QL feature. Prefer a single advanced query over multiple basic ones.
   - "find patterns," "categorize," "group similar messages" → `CATEGORIZE(field)`
   - "spike," "dip," "anomaly," "when did X change" → `CHANGE_POINT value ON key`
   - "trend over time," "time series" → `STATS ... BY BUCKET(@timestamp, interval)` or `TS` for TSDB
   - "PromQL", "Prometheus query/dashboard/alert", `sum by (instance) (...)`, label matchers like `{cluster="prod"}` →
     `PROMQL` source command (9.4+ preview); see [PROMQL Command](references/promql-command.md). Prefer `TS` for native
     ES|QL phrasing.
   - "search," "find documents matching" → `MATCH` (default), `QSTR` (advanced boolean), `KQL` (Kibana migration). For
     content/document relevance search, follow the [ES|QL Search Strategy](references/esql-search-strategy.md)
   - "count," "average," "breakdown" → `STATS` with aggregation functions

4. **Read the references** before generating queries:
   - [Generation Tips](references/generation-tips.md) - key patterns (TS/TBUCKET/RATE, per-agg WHERE, LOOKUP JOIN,
     CIDR_MATCH), common templates, and ambiguity handling
   - [Time Series Queries](references/time-series-queries.md) - **read before any TS query**: inner/outer aggregation
     model, TBUCKET syntax, RATE constraints
   - [PROMQL Command](references/promql-command.md) — **read before any PROMQL query**: options, output schema,
     limitations, and `PROMQL` vs `TS` decision matrix (9.4+ preview)
   - [ES|QL Complete Reference](references/esql-reference.md) - full syntax for all commands and functions
   - [ES|QL Search Strategy](references/esql-search-strategy.md) — for content/document relevance search (retrieve →
     fuse → rerank)
   - [ES|QL Search Reference](references/esql-search.md) — for full-text search function syntax (MATCH, QSTR, KQL,
     scoring)

5. **Generate the query** following ES|QL syntax. Prefer the **simplest query** that answers the question — do not add
   extra indices, fields, or transformations unless the user asks for them. Only include fields in `KEEP` that directly
   answer the question. Do not add extra filter conditions beyond what the user specified (e.g., don't add
   `OR level == "ERROR"` when the user just said "errors").
   - Start with `FROM index-pattern` (or `TS index-pattern` for time series indices)
   - Add `WHERE` for filtering (use `TRANGE` for time ranges on 9.3+)
   - Use `EVAL` for computed fields
   - Use `STATS ... BY` for aggregations
   - For time series metrics: `TS` with `SUM(RATE(...))` for counters, `AVG(...)` for gauges, and `TBUCKET(interval)`
     for time bucketing — see the TS section in [Generation Tips](references/generation-tips.md) for the three critical
     syntax rules
   - For detecting spikes, dips, or anomalies, use `CHANGE_POINT` after time-bucketed aggregation
   - Add `SORT` and `LIMIT` as needed

6. **Execute with TSV format** for clean, undecorated tab-separated output. Use `POST /_query?format=tsv`

## ES|QL Quick Reference

> **Version availability:** This section omits version annotations for readability. Check
> [ES|QL Version History](references/esql-version-history.md) for feature availability by Elasticsearch version.

### Basic Structure

```esql
FROM index-pattern
| WHERE condition
| EVAL new_field = expression
| STATS aggregation BY grouping
| SORT field DESC
| LIMIT n
```

### Examples

**Filter and limit:**

```esql
FROM logs-*
| WHERE @timestamp > NOW() - 24 hours AND level == "error"
| SORT @timestamp DESC
| LIMIT 100
```

**Aggregate by time:**

```esql
FROM metrics-*
| WHERE @timestamp > NOW() - 7 days
| STATS avg_cpu = AVG(cpu.percent) BY bucket = DATE_TRUNC(1 hour, @timestamp)
| SORT bucket DESC
```

**Top N with count:**

```esql
FROM web-logs
| STATS count = COUNT(*) BY response.status_code
| SORT count DESC
| LIMIT 10
```

**Text search (8.17+):** Use `MATCH` as the default for full-text search instead of `LIKE`/`RLIKE` — it is significantly
faster and supports relevance scoring. `MATCH` on a `text` field is usually sufficient on its own — do not add redundant
keyword equality filters (e.g., `category == "X"`) alongside `MATCH` unless the user explicitly requests filtering. Use
`QSTR` only when you need advanced boolean logic, wildcards, or multi-field searches in a single expression. The first
argument to `MATCH` must be **one** real field name — not a string listing several fields (e.g. `"title,content"`) and
not multiple field arguments; combine fields with `MATCH(a, "q") OR MATCH(b, "q")`. `KQL` is available from 8.18/9.0+.
For content/document search use cases, follow the [ES|QL Search Strategy](references/esql-search-strategy.md). See
[ES|QL Search Reference](references/esql-search.md) for the full function guide.

```esql
FROM documents METADATA _score
| WHERE MATCH(content, "search terms")
| SORT _score DESC
| LIMIT 20
```

**String extraction:** Use `DISSECT` for structured delimiter-based patterns (preferred — produces named fields) and
`GROK` for regex-based extraction. For simple cases, `SUBSTRING(s, start, len)` for fixed-position extraction,
`SPLIT(s, delim)` to split into a multivalue, `LOCATE(substr, s)` to find a character position. `SPLIT` returns a
multivalue — use `MV_FIRST`, `MV_LAST`, or `MV_SLICE` to pick elements. `INSTR` and `STRPOS` do **not** exist — use
`LOCATE`. `REGEXP_EXTRACT` does not exist — use `GROK`.

```esql
// Extract domain from email using DISSECT (preferred — produces named fields)
FROM customers
| DISSECT email "%{local}@%{domain}"
| STATS count = COUNT(*) BY domain

// Alternative: extract domain from email using SPLIT
FROM customers
| EVAL domain = MV_LAST(SPLIT(email, "@"))
| STATS count = COUNT(*) BY domain

// Parse HTTP log lines
FROM logs-*
| DISSECT message "%{method} %{path} %{status_text}"
| KEEP @timestamp, method, path, status_text
```

**Log categorization (Platinum license):** Use `CATEGORIZE` to auto-cluster log messages into pattern groups. Prefer
this over running multiple `STATS ... BY field` queries when exploring or finding patterns in unstructured text.

```esql
FROM logs-*
| WHERE @timestamp > NOW() - 24 hours
| STATS count = COUNT(*) BY category = CATEGORIZE(message)
| SORT count DESC
| LIMIT 20
```

**Change point detection (Platinum license):** Use `CHANGE_POINT` to detect spikes, dips, and trend shifts in a metric
series. Prefer this over manual inspection of time-bucketed counts.

```esql
FROM logs-*
| STATS c = COUNT(*) BY t = BUCKET(@timestamp, 30 seconds)
| SORT t
| CHANGE_POINT c ON t
| WHERE type IS NOT NULL
```

**Time series metrics:** With `TS`, use `TRANGE` for time filtering (9.3+) or omit it entirely — do **not** add a
redundant `WHERE @timestamp > NOW() - ...` alongside `TBUCKET`. The `TBUCKET` duration defines the aggregation window.

```esql
// Counter metric: SUM(RATE(...)) with TBUCKET(duration)
TS metrics-tsds
| WHERE TRANGE(1 hour)
| STATS SUM(RATE(requests)) BY TBUCKET(1 hour), host

// Gauge metric: AVG(...) — no RATE needed
TS metrics-tsds
| STATS avg_cpu = AVG(cpu) BY service.name, bucket = TBUCKET(5 minutes)
| SORT bucket
```

**Time series with PromQL syntax (9.4+ preview):** Use the `PROMQL` source command when the user explicitly asks for
PromQL, references Prometheus syntax (`sum by (instance) (...)`, label matchers like `{cluster="prod"}`), or is
migrating a Prometheus dashboard or alert. The `PROMQL` command accepts standard PromQL with optional `index`, `step`,
`buckets`, `start`, `end`, and `scrape_interval` options, and produces a table that the rest of the ES|QL pipeline can
process. Range selectors are optional — when omitted, the window is `max(step, scrape_interval)`. Otherwise prefer `TS`
(GA in 9.4). `PROMQL` does **not** support group modifiers, set operators (`or`/`and`/`unless`), or functions like
`histogram_quantile`, `predict_linear`, and `label_join` — fall back to `TS` for those. See
[PROMQL Command](references/promql-command.md) for the full reference.

```esql
// Adaptive Kibana query — date picker drives time range and step
PROMQL index=metrics-* sum by (instance) (rate(http_requests_total))

// Named result, post-processed with ES|QL
PROMQL index=k8s step=1h bytes=(max by (cluster) (network.bytes_in))
| STATS max_bytes = MAX(bytes) BY cluster
| SORT cluster
```

**Data enrichment with LOOKUP JOIN:** The basic `ON` clause matches fields by name in both indices
(`LOOKUP JOIN idx ON field_name`). When the join key has a different name in the source, use `RENAME` first to align
names. 9.2+ tech preview also supports expression predicates (`ON expr == expr`); see
[ES|QL Complete Reference](references/esql-reference.md) for details. After `LOOKUP JOIN`, lookup columns are available
by their **original field names** — do **not** table-qualify them (e.g., write `threat_level`, not
`threat_intel.threat_level`). **Ordering tip:** when the question asks for top-N results, `SORT` and `LIMIT` _before_
`LOOKUP JOIN` to reduce enrichment cost. For general listings or full enrichment, place `LOOKUP JOIN` right after
`FROM`/`WHERE`.

```esql
// Field name mismatch — RENAME before joining
FROM support_tickets
| RENAME product AS product_name
| LOOKUP JOIN knowledge_base ON product_name

// Aggregate, limit, THEN enrich (top-N only)
FROM orders
| STATS total_spent = SUM(total) BY customer_id
| SORT total_spent DESC
| LIMIT 3
| LOOKUP JOIN customers_lookup ON customer_id
| KEEP name, customer_id, total_spent

// Multi-field join (9.2+)
FROM application_logs
| LOOKUP JOIN service_registry ON service_name, environment
| KEEP service_name, environment, owner_team
```

**Multivalue field filtering:** Use `MV_CONTAINS` to check if a multivalue field contains a specific value. Use
`MV_COUNT` to count values.

```esql
// Filter by multivalue membership
FROM employees
| WHERE MV_CONTAINS(languages, "Python")

// Find entries matching multiple values
FROM employees
| WHERE MV_CONTAINS(languages, "Java") AND MV_CONTAINS(languages, "Python")

// Count multivalue entries
FROM employees
| EVAL num_languages = MV_COUNT(languages)
| SORT num_languages DESC
```

**Change point detection (alternate example):** Use when the user asks about spikes, dips, or anomalies. Requires
time-bucketed aggregation, `SORT`, then `CHANGE_POINT`.

```esql
FROM logs-*
| STATS error_count = COUNT(*) BY bucket = DATE_TRUNC(1 hour, @timestamp)
| SORT bucket
| CHANGE_POINT error_count ON bucket AS type, pvalue
```

## Full Reference

For complete ES|QL syntax including all commands, functions, and operators, read:

- [ES|QL Complete Reference](references/esql-reference.md)
- [ES|QL Search Reference](references/esql-search.md) - Full-text search: MATCH, QSTR, KQL, MATCH_PHRASE, scoring,
  semantic search
- [ES|QL Search Strategy](references/esql-search-strategy.md) - Relevance search strategy for content indices: retrieve
  → fuse → rerank
- [ES|QL Version History](references/esql-version-history.md) - Feature availability by Elasticsearch version
- [Query Patterns](references/query-patterns.md) - Natural language to ES|QL translation
- [Generation Tips](references/generation-tips.md) - Best practices for query generation
- [Time Series Queries](references/time-series-queries.md) - TS command, time series aggregation functions, TBUCKET
- [PROMQL Command](references/promql-command.md) - PromQL source command for TSDS indices (9.4+ preview)
- [DSL to ES|QL Migration](references/dsl-to-esql-migration.md) - Convert Query DSL to ES|QL
- [Environment Setup](references/fallback-environment-setup.md) - Connection configuration options

## Error Handling

When query execution fails, the script returns:

- The generated ES|QL query
- The error message from Elasticsearch
- Suggestions for common issues

**Common issues:**

- Field doesn't exist → Always use `GET /{index}/_mapping` and `GET /_cat/indices` before writing a query. Never guess
  field or index names — they vary across deployments.
- Type mismatch → Use type conversion functions (TO_STRING, TO_INTEGER, etc.)
- Syntax error → Review ES|QL reference for correct syntax. Always use **double quotes** for strings, never single
  quotes.
- No results → Check time range and filter conditions
- Wrong function name → ES|QL uses underscored names: `STD_DEV()` not `STDDEV()`, `MEDIAN_ABSOLUTE_DEVIATION()` not
  `MAD()`. Use `CONCAT()` for strings, not `+`. Use `CASE(cond, val, ...)` not `CASE WHEN...THEN...END`.
- Wrong date part → `DATE_EXTRACT` uses ES|QL part names: `"hour_of_day"` not `"hour"`, `"day_of_month"` not `"day"`,
  `"month_of_year"` not `"month"`. Use `DATE_DIFF("day", start, end)` for date arithmetic, not subtraction.

## Operations

The body of this skill references Elasticsearch operations in HTTP-shorthand form. The following table maps each
shorthand to its `elastic` CLI command. Always use the CLI rather than calling the HTTP API directly — see
[Environment Configuration](#environment-configuration).

For operations not listed below, run `elastic --help` (or `elastic es --help`, `elastic es <subcommand> --help`) to
discover the matching command and its flags.

| HTTP API (shorthand)                | `elastic` CLI command                                                 |
| ----------------------------------- | --------------------------------------------------------------------- |
| `GET /`                             | `elastic es info`                                                     |
| `GET /_cat/indices`                 | `elastic es cat indices`                                              |
| `GET /_cat/indices/{pattern}`       | `elastic es cat indices --index '{pattern}'`                          |
| `GET /{pattern}`                    | `elastic es indices get --index '{pattern}'`                          |
| `GET /{index}/_mapping`             | `elastic es indices get-mapping --index '{index}'`                    |
| `GET /{index}/_settings/index.mode` | `elastic es indices get-settings --name index.mode --index '{index}'` |
| `POST /_query`                      | `elastic es esql query --query "{esql}"`                              |
| `POST /_query?format=tsv`           | `elastic es esql query --format tsv --query "{esql}"`                 |
