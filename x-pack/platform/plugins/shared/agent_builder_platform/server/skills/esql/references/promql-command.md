# ES|QL PROMQL Command

Query time series indices using **Prometheus Query Language (PromQL)** as a source command in ES|QL. The `PROMQL`
command is the bridge for users who already know PromQL or are migrating Prometheus dashboards and alerts onto an
Elasticsearch backend, while still letting them post-process results with regular ES|QL pipes.

> **Version:** `PROMQL` is a **preview** feature available since Elastic Stack **9.4** and on Elastic Cloud Serverless.
> Treat it as preview — syntax, options, and supported PromQL functions may change in future releases. See
> [esql-version-history.md](esql-version-history.md) for version availability.

## Table of Contents

- [When to Use PROMQL](#when-to-use-promql)
- [Syntax](#syntax)
- [Options](#options)
- [Output Columns](#output-columns)
- [Implicit Range Selectors](#implicit-range-selectors)
- [Examples](#examples)
- [Post-Processing with ES|QL](#post-processing-with-esql)
- [PROMQL vs TS](#promql-vs-ts)
- [Limitations](#limitations)
- [Kibana Time Filtering](#kibana-time-filtering)
- [Guidelines](#guidelines)
- [References](#references)

---

## When to Use PROMQL

Prefer `PROMQL` when **any** of the following apply:

- The user explicitly asks for a PromQL query, references Prometheus syntax (`sum by (instance) (...)`, label matchers
  like `{cluster="prod"}`, etc), or is migrating a Prometheus dashboard or alert. If the user explicitly requests for
  PromQL but the query is not supported yet (check [Limitations](#limitations) below), state the issue.
- Compatibility with Prometheus tooling is required (Grafana panels, alerting rules, scripts that already speak PromQL).

Prefer the [`TS` command](time-series-queries.md) when:

- The user wrote ES|QL (or is asking in natural language without PromQL terms) and the query is naturally expressed in
  the inner/outer aggregation paradigm (`SUM(RATE(...))`, `AVG(AVG_OVER_TIME(...))`).
- The query mixes time series with non-time-series data sources or uses ES|QL features like `LOOKUP JOIN`,
  `CHANGE_POINT`, or `INLINE STATS` _before_ the metrics aggregation.

`PROMQL` and `TS` target the same TSDS indices — choose based on the syntax that best matches the user's intent.

---

## Syntax

```esql
PROMQL [ <option> ... ] [ <result_name> = ] ( <PromQL expression> )
```

- Zero or more space-separated `key=value` options.
- A PromQL expression, optionally wrapped in parentheses and assigned a `<result_name>`.
- The expression follows standard
  [Prometheus query language](https://prometheus.io/docs/prometheus/latest/querying/basics/) syntax (label matchers,
  range selectors, aggregations, binary operations) within the [Limitations](#limitations) below.

### Minimal example

```esql
PROMQL sum by (instance) (rate(http_requests_total))
```

### Named result

```esql
PROMQL http_rate = (sum by (instance) (rate(http_requests_total)))
```

When a `<result_name>` is provided, the metric column is named `<result_name>` instead of the raw PromQL expression. In
the example above, the column would be named `http_rate`.

---

## Options

The options mirror the Prometheus [HTTP API](https://prometheus.io/docs/prometheus/latest/querying/api/#range-queries)
with ES|QL-specific additions.

| Option            | Default     | Description                                                                                                           |
| ----------------- | ----------- | --------------------------------------------------------------------------------------------------------------------- |
| `index`           | `metrics-*` | Indices, data streams, or aliases. Supports wildcards and date math.                                                  |
| `step`            | inferred    | Query resolution step width. Auto-derived from `buckets` and the time range when omitted.                             |
| `buckets`         | `100`       | Target bucket count for auto-step derivation. Mutually exclusive with `step`. Requires a known time range.            |
| `start`           | inferred    | Inclusive start of the time range. Falls back to Kibana's date picker, or unrestricted if missing.                    |
| `end`             | inferred    | Inclusive end of the time range. Falls back to Kibana's date picker, or unrestricted if missing.                      |
| `scrape_interval` | `1m`        | Expected metric collection interval. Used as the implicit range selector window: `max(step, scrape_interval)`.        |
| `<result_name>=`  | _none_      | Optional name for the metric output column. Defaults to the PromQL expression text. Wrap the expression in `( ... )`. |

**Time format for `start` / `end`:** ISO-8601 strings (e.g., `"2026-04-01T00:00:00Z"`). The same formats accepted by
`TRANGE` work here.

**`step` vs `buckets`:** Pass exactly one. `step` fixes the resolution (`step=5m`); `buckets` lets the engine pick a
step that produces around N buckets across the time range (`buckets=50`).

---

## Output Columns

The result table has these columns:

| Column                                                  | Type      | Description                                                     |
| ------------------------------------------------------- | --------- | --------------------------------------------------------------- |
| The PromQL expression (or `<result_name>` if specified) | `double`  | The computed metric value                                       |
| `step`                                                  | `date`    | Timestamp for each evaluation step                              |
| Grouping labels (when `by (...)` or `without (...)`)    | `keyword` | One column per grouping label                                   |
| `_timeseries`                                           | `keyword` | JSON-encoded labels when there is no `by`/`without` aggregation |

When the PromQL expression includes a cross-series aggregation like `sum by (instance) (...)`, each grouping label
becomes its own column (`instance:keyword`). Without a cross-series aggregation, all labels collapse into a single
`_timeseries` column as a JSON string.

---

## Implicit Range Selectors

Standard PromQL requires range vector functions to specify a range selector: `rate(http_requests_total[5m])`. The
`PROMQL` command **allows omitting the range selector** entirely:

```esql
PROMQL scrape_interval=15s sum(rate(http_requests_total))
```

When the range selector is absent, the window is computed automatically as `max(step, scrape_interval)`. This is
particularly useful for Kibana dashboards where `step` is determined by the date picker and you want the range vector to
scale with it.

You can still pass an explicit range selector when you need a fixed window: `rate(http_requests_total[5m])`.

---

## Examples

### Fully adaptive query (recommended for Kibana)

Let Kibana's date picker drive the time range, and let `step` and the range selector be inferred:

```esql
PROMQL index=metrics-* sum by (instance) (rate(http_requests_total))
```

The query responds to the date picker, adjusts the step size to the selected range, and sizes the implicit range
selector window accordingly. This is the recommended pattern for dashboard panels.

### Range query with explicit parameters

```esql
PROMQL index=k8s step=5m start="2024-05-10T00:20:00.000Z" end="2024-05-10T00:25:00.000Z" (
  sum(avg_over_time(network.cost[5m]))
)
```

| sum(avg_over_time(network.cost[5m])):double | step:date                |
| ------------------------------------------- | ------------------------ |
| 50.25                                       | 2024-05-10T00:20:00.000Z |

### Cross-series aggregation by label

```esql
PROMQL index=k8s step=1h result=(sum by (cluster) (network.cost))
| SORT result
```

| result:double | step:datetime            | cluster:keyword |
| ------------- | ------------------------ | --------------- |
| 15.875        | 2024-05-10T00:00:00.000Z | staging         |
| 18.625        | 2024-05-10T00:00:00.000Z | prod            |
| 26.5          | 2024-05-10T00:00:00.000Z | qa              |

### Label filtering with named result

```esql
PROMQL index=k8s step=1h cost=(max by (cluster) (network.total_bytes_in{cluster!="prod"}))
| SORT cluster
```

| cost:double | step:datetime            | cluster:keyword |
| ----------- | ------------------------ | --------------- |
| 10797.0     | 2024-05-10T00:00:00.000Z | qa              |
| 7403.0      | 2024-05-10T00:00:00.000Z | staging         |

### Ad-hoc query with inferred step

For queries outside Kibana, set `start` and `end` explicitly. The step and range selector window are still inferred from
the time range and the default `buckets` value:

```esql
PROMQL index=metrics-*
  start="2026-04-01T00:00:00Z"
  end="2026-04-01T01:00:00Z"
  sum by (instance) (rate(http_requests_total))
```

### Bucket count instead of fixed step

```esql
PROMQL index=metrics-*
  buckets=50
  start="2026-04-01T00:00:00Z"
  end="2026-04-01T01:00:00Z"
  sum(rate(http_requests_total))
```

---

## Post-Processing with ES|QL

Because `PROMQL` is a source command, its output flows into the rest of the pipeline. Use ES|QL commands after the
PROMQL stage for further aggregation, filtering, ordering, and enrichment:

```esql
PROMQL index=k8s step=1h bytes=(max by (cluster) (network.bytes_in))
| STATS max_bytes = MAX(bytes) BY cluster
| SORT cluster
```

| max_bytes:double | cluster:keyword |
| ---------------- | --------------- |
| 931.0            | prod            |
| 972.0            | qa              |
| 238.0            | staging         |

### Enrich with LOOKUP JOIN

Join PromQL results with a lookup index using a grouping label as the join key:

```esql
PROMQL index=metrics-*
  http_rate=(sum by (instance) (rate(http_requests_total)))
| LOOKUP JOIN instance_metadata ON instance
```

This pattern combines PromQL's expressiveness for time series math with ES|QL's strengths for joining external metadata,
filtering, and shaping output.

---

## PROMQL vs TS

| Aspect              | `PROMQL`                                    | `TS`                                               |
| ------------------- | ------------------------------------------- | -------------------------------------------------- |
| Syntax              | Prometheus Query Language                   | ES\|QL inner/outer aggregation                     |
| Default index       | `metrics-*`                                 | None — caller must specify                         |
| Time filtering      | `start`/`end` options or Kibana date picker | `WHERE TRANGE(...)` or `WHERE @timestamp ...`      |
| Bucketing           | `step` / `buckets` options                  | `BY TBUCKET(interval)`                             |
| Range vector window | Implicit (`max(step, scrape_interval)`)     | Bucket interval, or sliding window arg (9.3+)      |
| Counter aggregation | `sum(rate(metric))`                         | `STATS SUM(RATE(metric)) BY TBUCKET(...)`          |
| Gauge aggregation   | `avg_over_time(metric[5m])`                 | `STATS AVG(AVG_OVER_TIME(metric)) BY TBUCKET(...)` |
| Label filtering     | `metric{cluster="prod"}`                    | `WHERE cluster == "prod"`                          |
| Available since     | 9.4 (preview)                               | 9.2 (preview)                                      |

Both commands target TSDS indices and can be followed by the same set of ES|QL processing commands (`WHERE`, `EVAL`,
`STATS`, `SORT`, `LIMIT`, `LOOKUP JOIN`, etc.).

---

## Limitations

In 9.4 preview, `PROMQL` has the following limitations:

- **Group modifiers are not supported.** Constructs like `on(chip) group_left(chip_name)` will fail. Use `LOOKUP JOIN`
  in ES|QL after the PROMQL stage to attach extra labels.
- **Set operators are not supported.** `or`, `and`, and `unless` between PromQL expressions are unavailable. Express set
  logic in ES|QL after the PROMQL stage instead.
- **Some PromQL functions are unavailable.** Notably `histogram_quantile`, `predict_linear`, and `label_join` are not
  supported. Use `TS` with `PERCENTILE_OVER_TIME` for percentile-style metrics, or compute equivalents in ES|QL.
- **Time bucket alignment differs.** Buckets align to fixed calendar boundaries rather than the query start time. This
  can cause slight differences from native Prometheus, especially for short ranges or large step sizes.
- **Index defaults to `metrics-*`.** If your TSDS data lives elsewhere, always set `index` explicitly to avoid scanning
  unrelated indices.
- **Preview status.** Behavior, supported PromQL surface, and option names may evolve before GA.

When a question requires a feature in this list, fall back to the [`TS` command](time-series-queries.md) and express the
equivalent computation in ES|QL.

---

## Kibana Time Filtering

When writing `PROMQL` queries for Kibana (Discover, dashboards, alerts), **do not set `start` and `end` manually**.
Kibana injects the date picker's range automatically and the engine derives `step` from it. Setting `start`/`end`
explicitly overrides the date picker.

```esql
// Kibana — let the date picker drive start/end and step
PROMQL index=metrics-* sum by (instance) (rate(http_requests_total))
```

For ad-hoc queries outside Kibana (HTTP API, `elastic es esql query --query "..."`), set `start` and `end` explicitly.

---

## Guidelines

- **Prefer `PROMQL` only when the user explicitly thinks in PromQL** or is porting a Prometheus query/dashboard.
  Otherwise, prefer `TS` — it integrates more naturally with the rest of ES|QL and is GA in 9.4.
- **Always set `index`** in production queries instead of relying on the `metrics-*` default — narrower patterns reduce
  scan volume and prevent accidental matches against unrelated indices.
- **Use named results** (`http_rate=(...)`) when chaining further ES|QL commands. Named columns are easier to reference
  than the raw PromQL expression text.
- **Omit range selectors for adaptive dashboards.** Implicit range selectors (`rate(http_requests_total)` without
  `[5m]`) make the query scale with the date picker.
- **Pick `step` or `buckets`, not both.** Use `buckets` when you want a target panel resolution; use `step` when you
  need a fixed grain (e.g., to align with downstream aggregation).
- **Fall back to `TS` for unsupported features.** Histograms (`histogram_quantile`), set logic (`or`/`and`/`unless`),
  group modifiers, and `label_join` are not available — express the computation with ES|QL primitives instead.
- **Do not mix `WHERE @timestamp` filters with `start`/`end`.** Time filtering belongs in the PROMQL options or via
  Kibana's date picker; standard ES|QL `WHERE` clauses run _after_ the PromQL stage and don't bound the metric scan.

---

## References

- [ES|QL PROMQL command](https://www.elastic.co/docs/reference/query-languages/esql/commands/promql) — official
  documentation
- [Prometheus Query Language](https://prometheus.io/docs/prometheus/latest/querying/basics/) — PromQL fundamentals
- [Prometheus HTTP API](https://prometheus.io/docs/prometheus/latest/querying/api/#range-queries) — origin of the option
  semantics
- [Time series data streams (TSDS)](https://www.elastic.co/docs/manage-data/data-store/data-streams/time-series-data-stream-tsds)
- [time-series-queries.md](time-series-queries.md) — `TS` command and ES|QL native time series functions
- [esql-version-history.md](esql-version-history.md) — feature availability by Elasticsearch version
