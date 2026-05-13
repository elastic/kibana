# ES|QL Time Series Queries

Query metrics data in Elasticsearch using the `TS` source command and time series aggregation functions.

## TS Source Command

`TS` replaces `FROM` when querying time series data streams and indices.
It groups samples by time series before aggregating, which enables functions like `RATE`, `AVG_OVER_TIME`, and `LAST_OVER_TIME`.

```esql
TS index_pattern [METADATA fields]
```

**Key differences from `FROM`:**

- `FROM` treats every document as an independent row. That is right for events, but metric aggregations often need the time series that each row belongs to.
- `TS` adds that time series context: it groups and aggregates data points by time series before any other aggregation runs, and enables functions like `RATE`, `AVG_OVER_TIME`, and LAST_OVER_TIME.
- A `TS | STATS` query normally has two aggregation phases - The inner phase reduces samples inside each time series; the outer phase groups and combines those per-series results.
- The default inner aggregation is `LAST_OVER_TIME`, which is why `TS metrics | STATS AVG(cpu_usage)` and `FROM metrics | STATS AVG(cpu_usage)` can return different numbers.
- Use `TS` to query a time series data stream. Use `FROM` for events and raw document inspection.

## Inner/Outer aggregation phases

The first `STATS` after a `TS` command uses a two-level aggregation model:

1. **Inner function** (time series aggregation) -- evaluated per individual time series (e.g. `RATE`, `AVG_OVER_TIME`)
2. **Outer function** (standard aggregation) -- aggregates inner results across groups (e.g. `SUM`, `AVG`, `MAX`)

In `SUM(RATE(request_count)) BY datacenter, TBUCKET(5m)`:

- `RATE(request_count)` is the **inner** aggregation - It runs per time series.
- `SUM(...)` is the **outer** aggregation - It combines time series within the same `datacenter` and bucket.
- `TBUCKET(5m)` defines the bucket boundaries (equivalent to `BUCKET(@timestamp, 5m)`).

Notes:
- The default inner aggregation is `LAST_OVER_TIME` (which is why `TS metrics | STATS AVG(cpu_usage)` and `FROM metrics | STATS AVG(cpu_usage)` can return different numbers)
- The outer aggregation is optional.

## Time Series Aggregation Functions

All functions below are available under `TS ... | STATS`. Each accepts a required field argument and an optional sliding
window (`time_duration`). The window must be a multiple of the `TBUCKET` interval. If omitted, the bucket interval is used as the window.

### Counter Functions

For fields with `time_series_metric: counter`.

| Function   | Description                                                            |
| ---------- | ---------------------------------------------------------------------- |
| `RATE`     | Per-second average rate of increase; handles counter resets            |
| `IRATE`    | Per-second rate between the last two data points; responsive to spikes |
| `INCREASE` | Absolute increase of the counter in the time window; handles resets    |

```esql
// Average rate per host per hour
// host is a dimension of the TSDS index metrics
TS metrics
| WHERE TRANGE(1 hour)
| STATS SUM(RATE(search_requests)) BY TBUCKET(1 hour), host

// Instant rate (last two points only) per cluster and 10 minutes
// k8s is an example of a TSDS index, to showcase that time series indexes do not have to be called metrics
// cluster is a dimension of the TSDS index k8s
TS k8s
| STATS SUM(IRATE(network.total_bytes_in)) BY cluster, TBUCKET(10 minute)

// Total counter increase
TS k8s
| STATS SUM(INCREASE(network.total_bytes_in)) BY cluster, TBUCKET(10 minute)
```

### Gauge / Numeric Functions

For gauge metrics and general numeric fields (`double`, `integer`, `long`, `aggregate_metric_double`).

| Function                   | Description                                        |
| -------------------------- | -------------------------------------------------- |
| `AVG_OVER_TIME`            | Average value over the time window                 |
| `SUM_OVER_TIME`            | Sum of values over the time window                 |
| `MIN_OVER_TIME`            | Minimum value over the time window                 |
| `MAX_OVER_TIME`            | Maximum value over the time window                 |
| `FIRST_OVER_TIME`          | Earliest value by `@timestamp`                     |
| `LAST_OVER_TIME`           | Latest value by `@timestamp` (implicit default)    |
| `COUNT_OVER_TIME`          | Count of values over the time window               |
| `COUNT_DISTINCT_OVER_TIME` | Count of distinct values over the time window      |
| `PERCENTILE_OVER_TIME`     | Percentile of values; takes `(field, percentile)`  |
| `STDDEV_OVER_TIME`         | Population standard deviation over the time window |
| `VARIANCE_OVER_TIME`       | Population variance over the time window           |
| `DELTA`                    | Absolute change of a gauge in the time window      |
| `IDELTA`                   | Change between the last two data points only       |
| `DERIV`                    | Derivative over time using linear regression       |

```esql
// Average memory per cluster per 5 minutes
// cluster is a dimension of the TSDS index metrics
TS metrics
| WHERE TRANGE(1 day)
| STATS AVG(AVG_OVER_TIME(memory_usage)) BY cluster, TBUCKET(5 minute)

// P95 network cost per cluster per minute
// k8s is an example of a TSDS index, to showcase that time series indexes do not have to be called metrics
// cluster is a dimension of the TSDS index k8s
TS k8s
| STATS MAX(PERCENTILE_OVER_TIME(network.cost, 95)) BY cluster, TBUCKET(1 minute)

// Gauge delta (absolute change in bytes)
TS k8s
| STATS SUM(DELTA(network.bytes_in)) BY cluster, TBUCKET(10 minute)

// Derivative of cost per pod over time
// pod is a dimension of the TSDS index k8s
TS k8s
| STATS MAX(DERIV(network.cost)) BY pod, TBUCKET(5 minute)
```

### Presence / Absence Functions

Detect whether a field has data in a given time window. Return `boolean`.

| Function            | Description                                     |
| ------------------- | ----------------------------------------------- |
| `PRESENT_OVER_TIME` | `true` if field has values in the window        |
| `ABSENT_OVER_TIME`  | `true` if field has **no** values in the window |

```esql
// Detect pods with missing data
TS k8s
| STATS missing = MAX(ABSENT_OVER_TIME(events_received)) BY pod, TBUCKET(2 minute)
```

### Sliding Window

Pass a `time_duration` as the second argument to any time series function to use a sliding window larger than the bucket
interval. The window must be a multiple of the `TBUCKET` interval.

```esql
// Average rate per host over a 10-minute sliding window, bucketed by 1 minute
// host is a dimension of the TSDS index metrics
TS metrics
| WHERE TRANGE(1 hour)
| STATS AVG(RATE(requests, 10m)) BY TBUCKET(1m), host
```

## TBUCKET Grouping Function

Creates time buckets from `@timestamp`. Use in the `BY` clause of `STATS` for time-based grouping.

```esql
STATS ... BY bucket = TBUCKET(interval)
STATS ... BY TBUCKET(interval)
```

The interval is a time duration (`1 hour`, `5 minute`, `30s`) or date period (`1 month`). A string representation
(`"1 hour"`) also works.

`TBUCKET` is the preferred bucketing function for `TS` queries. It has a simpler signature than
`DATE_TRUNC(interval, @timestamp)` and is aware of time series semantics.

```esql
// 1-hour buckets
TS metrics
| STATS SUM(RATE(requests)) BY TBUCKET(1 hour), host

// 5-minute buckets
// service is a dimension of the TSDS index metrics in this example
TS metrics
| STATS AVG(AVG_OVER_TIME(cpu_percent)) BY TBUCKET(5 minute), service
```

## CLAMP Functions

Bound metric values to a range. Useful for capping outliers or enforcing value limits in time series analysis.

| Function    | Description                                         | Syntax                   |
| ----------- | --------------------------------------------------- | ------------------------ |
| `CLAMP`     | Clamp values to `[min, max]` range                  | `CLAMP(field, min, max)` |
| `CLAMP_MIN` | Set a lower bound; values below `min` become `min`  | `CLAMP_MIN(field, min)`  |
| `CLAMP_MAX` | Set an upper bound; values above `max` become `max` | `CLAMP_MAX(field, max)`  |

```esql
// Clamp network cost between 1 and 10
TS k8s
| EVAL clamped_cost = CLAMP(network.cost, 1, 10)
| STATS SUM(clamped_cost) BY TBUCKET(1 minute)

// Aggregate with clamped values
TS k8s
| STATS total = SUM(CLAMP_MAX(network.cost, 1)) BY TBUCKET(1 minute)
```

## Post-process TS results with ES|QL

The first `STATS` command is the boundary between time series processing and regular ES|QL processing.
Before that first `STATS`, `TS` needs to keep the data grouped by `_tsid`, so commands that change row order or shape are not allowed.
After that first `STATS`, the output is a regular ES|QL table.
You can sort it, limit it, join lookup data, enrich it, or compute derived columns.

For example, this query calculates average CPU per host and bucket, finds the maximum bucketed average for each host, and returns the ratio:

```esql
TS metrics-*
| WHERE TRANGE(1h)
| STATS avg_cpu = AVG(AVG_OVER_TIME(cpu_usage)) BY host.name, time_bucket = TBUCKET(5m)
| INLINE STATS max_avg_cpu = MAX(avg_cpu) BY host.name
| EVAL cpu_ratio = avg_cpu / max_avg_cpu
| KEEP host.name, time_bucket, cpu_ratio
| SORT host.name, time_bucket DESC
```

## Common Query Patterns

### Rate of a Counter per Host per Hour

```esql
TS metrics
| WHERE TRANGE(1 hour)
| STATS SUM(RATE(search_requests)) BY TBUCKET(1 hour), host
```

### Total Rate per Host (No Time Bucketing)

```esql
TS metrics
| WHERE TRANGE(1 hour)
| STATS SUM(RATE(search_requests)) BY host
```

### Average Gauge per Cluster Over Time

```esql
TS metrics
| WHERE TRANGE(1 day)
| STATS AVG(AVG_OVER_TIME(memory_usage)) BY TBUCKET(5 minute), cluster
```

### Per-Time-Series Averages vs Global Average

```esql
// Average of per-time-series averages (accounts for different series lengths)
TS metrics | STATS AVG(AVG_OVER_TIME(memory_usage))

// Average of last values per time series (default behavior)
TS metrics | STATS AVG(memory_usage)
```

### Detect Missing Data

```esql
// k8s is an example of a TSDS index, to showcase that time series indexes do not have to be called metrics
// pod is a dimension of the TSDS index k8s
TS k8s
| WHERE TRANGE(1 hour)
| STATS missing = MAX(ABSENT_OVER_TIME(events_received)) BY pod, TBUCKET(2 minute)
```

### Counter Increase Totals

```esql
TS k8s
| WHERE TRANGE(1 hour)
| STATS SUM(INCREASE(network.total_bytes_in)) BY cluster, TBUCKET(10 minute)
```

### Instant Rate (Last Two Points)

```esql
TS k8s
| WHERE TRANGE(1 hour)
| STATS SUM(IRATE(network.total_bytes_in)) BY cluster, TBUCKET(10 minute)
```

### Sliding Window Rate

```esql
TS metrics
| WHERE TRANGE(1 hour)
| STATS AVG(RATE(requests, 10m)) BY TBUCKET(1m), host
```

### COUNT(*) equivalent

```esql
TS logs
| WHERE TRANGE(?_tstart, ?_tend)
| STATS `Log Volume` = sum(count_over_time(@timestamp)) BY `Month` = TBUCKET(1 month)
| SORT `Month` ASC
```

## Guidelines

- **Use `TS` for all aggregations on TSDS indices.** `FROM` is still available for listing raw documents, but use `TS` for metrics aggregations.
- **Use `SUM` as the outer function for counters.** Rates and increases are additive across time series that share a
  dimension (e.g. host). Use `AVG` or `MAX` for gauges.
- **Always add a time range filter** with `TRANGE` (or `WHERE @timestamp`) to limit scan volume, except in Kibana where
  the date picker handles this automatically. Don't add a range filter if the user explicitly asks not to add it.
- **Do not nest time series functions.** `AVG_OVER_TIME(RATE(field))` is invalid. Use a standard aggregation as the
  outer function.
- **Avoid mixing metrics with different dimensions** in one query. If `foo` and `bar` have different dimension values,
  `SUM(RATE(foo)) + SUM(RATE(bar))` may produce nulls for mismatched dimensions.
- `COUNT()` and `COUNT(*)` is not supported with TS
- Cannot combine with `FORK` before `STATS` is applied
- For `TS`, prefer `TRANGE` over manual `WHERE @timestamp > NOW() - ...` filters.