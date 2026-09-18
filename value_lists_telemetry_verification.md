# Verifying the value list telemetry cited in the proposal

This document lets a reader reproduce every telemetry figure cited in `value_lists_lookup_indices_proposal.md`. Each section gives the metric, the query, and the value it returned when the numbers were pulled.

## Where to run these

Run these in the **BigQuery console** (Google Cloud), against the Security Solution list telemetry table:

```
elastic-security-prod.bronze_raw_docs.lists
```

One row per cluster per 24 hours. The payload is a JSON column named `doc`, and the ingestion time is a `TIMESTAMP` column named `timestamp`.

Access needs BigQuery IAM on the `elastic-security-prod` project (request through `#sit-operations`), or the `telemetry-buddy:sda` connector, whose service account usually has it. Personal Google accounts are often denied.

The figures below were last verified on **2026-09-14**, over a **30 day window**, using the **latest snapshot per cluster**. Telemetry moves over time, so treat these as the values at that pull, and expect small drift on a re-run.

## Conventions used in every query

Three things matter for these queries, and every query below assumes them:

1. **Isolate value list documents.** The same `security-lists-v2` channel also carries trusted apps, endpoint exceptions, and event filters. A value list document is the one that has `total_list_count`, so filter on it: `JSON_QUERY(doc, '$."original-body".total_list_count') IS NOT NULL`.
2. **JSON path syntax.** `JSON_VALUE` and `JSON_QUERY` escape special-character keys with double quotes, for example `'$."original-body".cluster_uuid'`. The `$['key']` bracket form is legacy `JSON_EXTRACT` only and errors here.
3. **Field shape varies by cluster version.** `total_list_count` and the other `*_count` fields, and `types[].count`, are a scalar in new documents but `{ value: N }` in old (8.4.3) documents. So read them with a `COALESCE` over both shapes.

All queries start from this common base, which keeps one latest document per cluster:

```sql
WITH latest AS (
  SELECT doc
  FROM (
    SELECT
      doc,
      ROW_NUMBER() OVER (
        PARTITION BY JSON_VALUE(doc, '$."cluster-uuid"')
        ORDER BY timestamp DESC
      ) AS rn
    FROM `elastic-security-prod.bronze_raw_docs.lists`
    WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
      AND JSON_QUERY(doc, '$."original-body".total_list_count') IS NOT NULL
  )
  WHERE rn = 1
)
```

A short helper for reading a count field in either shape, used inline below:

```
COALESCE(JSON_VALUE(x, '$....count.value'), JSON_VALUE(x, '$....count'))
```

## Metric 1: reporting clusters, clusters with lists, and total lists

**Cited in the proposal:** "Across 803 clusters that report value list telemetry, 788 hold at least one list, about 4,000 lists in all ...". This query shows why two cluster numbers exist: 803 clusters report value list telemetry, and 788 of them actually hold at least one list.

```sql
-- (prepend the `latest` CTE above)
SELECT
  COUNT(*) AS reporting_clusters,
  COUNTIF(list_count > 0) AS clusters_with_lists,
  SUM(list_count) AS total_lists
FROM (
  SELECT CAST(
    COALESCE(
      JSON_VALUE(doc, '$."original-body".total_list_count.value'),
      JSON_VALUE(doc, '$."original-body".total_list_count')
    ) AS INT64
  ) AS list_count
  FROM latest
);
```

**Expected:** `reporting_clusters` about 803, `clusters_with_lists` about 788, `total_lists` about 4,000.

## Metric 2: item count distribution per list

**Cited in the proposal:** "half of all lists hold 17 items or fewer, 90% hold 761 or fewer, and 99% hold about 50,000 or fewer. Only 22 lists (about 0.6%) hold more than 100,000 items, and only four hold more than one million." and "The largest list observed is a customer ip list of about 154.2 million items."

Per-list item counts come from the `lists[]` array (`{ id, count }`). Note this array is **capped at 100 lists per cluster** in the telemetry, so lists beyond the first 100 on the few clusters that hold more than 100 are not sampled. This is immaterial to the distribution.

```sql
-- (prepend the `latest` CTE above)
SELECT
  COUNT(*) AS list_samples,
  APPROX_QUANTILES(item_count, 100)[OFFSET(50)] AS p50,
  APPROX_QUANTILES(item_count, 100)[OFFSET(90)] AS p90,
  APPROX_QUANTILES(item_count, 100)[OFFSET(99)] AS p99,
  MAX(item_count) AS max_items,
  COUNTIF(item_count > 100000) AS over_100k,
  COUNTIF(item_count > 1000000) AS over_1m
FROM (
  SELECT CAST(
    COALESCE(JSON_VALUE(lst, '$.count.value'), JSON_VALUE(lst, '$.count')) AS INT64
  ) AS item_count
  FROM latest, UNNEST(JSON_QUERY_ARRAY(doc, '$."original-body".lists')) AS lst
);
```

**Expected:** `list_samples` about 3,604, `p50` about 17, `p90` about 761, `p99` about 50,000, `max_items` about 154,200,000, `over_100k` about 22 (about 0.6% of the samples), `over_1m` = 4.

## Metric 3: lists per cluster distribution

**Cited in the proposal:** "the count of value lists per cluster is small: median 2, 90th percentile 10, 99th percentile 59, and a single largest of 239" and "only one cluster reaches a few hundred while still staying within the limit." This uses the uncapped `total_list_count`, not the capped `lists[]` array.

```sql
-- (prepend the `latest` CTE above)
SELECT
  COUNT(*) AS clusters_with_lists,
  APPROX_QUANTILES(list_count, 100)[OFFSET(50)] AS p50,
  APPROX_QUANTILES(list_count, 100)[OFFSET(90)] AS p90,
  APPROX_QUANTILES(list_count, 100)[OFFSET(99)] AS p99,
  MAX(list_count) AS max_lists,
  COUNTIF(list_count > 500) AS over_500
FROM (
  SELECT CAST(
    COALESCE(
      JSON_VALUE(doc, '$."original-body".total_list_count.value'),
      JSON_VALUE(doc, '$."original-body".total_list_count')
    ) AS INT64
  ) AS list_count
  FROM latest
)
WHERE list_count > 0;
```

**Expected:** `clusters_with_lists` about 788, `p50` = 2, `p90` = 10, `p99` = 59, `max_lists` = 239, `over_500` = 0.

## Metric 4: type mix across all lists

**Cited in the proposal:** "keyword, ip, and ip_range together are about 97 percent of lists. Range lists (ip_range) are about 12 percent" and "no geo lists," "text ~3%." Per-type counts come from the `types[]` array (`{ type, count }`).

```sql
-- (prepend the `latest` CTE above)
SELECT
  list_type,
  SUM(count) AS lists_of_type,
  ROUND(100 * SUM(count) / SUM(SUM(count)) OVER (), 2) AS pct_of_lists
FROM (
  SELECT
    JSON_VALUE(t, '$.type') AS list_type,
    CAST(COALESCE(JSON_VALUE(t, '$.count.value'), JSON_VALUE(t, '$.count')) AS INT64) AS count
  FROM latest, UNNEST(JSON_QUERY_ARRAY(doc, '$."original-body".types')) AS t
)
GROUP BY list_type
ORDER BY lists_of_type DESC;
```

**Expected:** `keyword` about 56 percent, `ip` about 29 percent, `ip_range` about 12 percent (the three sum to about 97 percent), `text` about 3 percent, a single `long` list (about 0.02 percent), and no `geo_point` or `geo_shape` row at all.

For the "ip_range is present in roughly a third of clusters with lists" claim:

```sql
-- (prepend the `latest` CTE above)
SELECT
  ROUND(100 * COUNTIF(has_ip_range) / COUNT(*), 1) AS pct_clusters_with_ip_range
FROM (
  SELECT EXISTS(
    SELECT 1
    FROM UNNEST(JSON_QUERY_ARRAY(doc, '$."original-body".types')) AS t
    WHERE JSON_VALUE(t, '$.type') = 'ip_range'
  ) AS has_ip_range
  FROM latest
);
```

**Expected:** roughly a third.

## Metric 5: indicator match rules using a value list as a threat index

**Cited in the proposal:** "telemetry shows 143 clusters and 467 rules use a value list as a threat index today." This comes from `used_in_indicator_match_rule_count`.

```sql
-- (prepend the `latest` CTE above)
SELECT
  COUNTIF(im_count > 0) AS clusters_using_value_list_as_threat_index,
  SUM(im_count) AS indicator_match_rules
FROM (
  SELECT CAST(
    COALESCE(
      JSON_VALUE(doc, '$."original-body".used_in_indicator_match_rule_count.value'),
      JSON_VALUE(doc, '$."original-body".used_in_indicator_match_rule_count')
    ) AS INT64
  ) AS im_count
  FROM latest
);
```

**Expected:** `clusters_using_value_list_as_threat_index` = 143, `indicator_match_rules` = 467.

## Notes on reading the results

- 803 clusters report value list telemetry; 788 of them hold at least one list. Metric 3's per-cluster distribution is over those 788.
- Metric 2's item-count distribution is sampled from at most 100 lists per cluster (a telemetry cap on the `lists[]` array), so its sample (about 3,604 lists) is slightly below the total list count (about 4,000). Metric 3 uses the uncapped `total_list_count` and is not affected. The 100 sampled lists are the largest by item count (the underlying `terms` aggregation orders by count descending), so on the few clusters over 100 lists the smallest lists are the ones omitted, and the distribution skews slightly high. The true medians are, if anything, a touch lower.
