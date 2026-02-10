# Alerting v2 scripts

## populate_historical_alert_events

Populates the `.alerts-events` data stream with historical alert events for testing or demos. Documents are generated with **realistic combo lifecycles**: each (rule_id, group_hash, episode_id) combo has multiple events (same alert across rule runs), with timestamps spaced by the rule run interval (e.g. every 5 minutes). The number of documents per combo varies (many short-lived alerts, fewer long-lived) so ES|QL grouping reflects real-world patterns.

**Prerequisites**

- Elasticsearch and Kibana running (the `.alerts-events` data stream is created by the alerting plugin when it runs; ensure the alerting plugin has been loaded at least once).
- Network access to Elasticsearch (default: `http://localhost:9200`).

**Run from the alerting_v2 plugin directory (recommended)**

Use the JS launcher so Babel and Kibana module resolution are applied:

```bash
cd x-pack/platform/plugins/shared/alerting_v2
node scripts/run_populate_historical_alert_events.js --count 200 --days-back 7
```

**Run from Kibana repo root**

Using the launcher:

```bash
node x-pack/platform/plugins/shared/alerting_v2/scripts/run_populate_historical_alert_events.js --count 200 --days-back 7
```

Or with Node’s Babel register and the TS script directly:

```bash
node -r @kbn/babel-register/install \
  x-pack/platform/plugins/shared/alerting_v2/scripts/populate_historical_alert_events.ts \
  --count 200 --days-back 7
```

With explicit Elasticsearch URL and credentials:

```bash
ELASTICSEARCH_URL="http://elastic:changeme@localhost:9200" \
node scripts/run_populate_historical_alert_events.js \
  --count 100 --rule-id my-rule-1
```

**Options**

| Flag           | Description                                              | Default                |
|----------------|----------------------------------------------------------|------------------------|
| `--count`      | Total number of alert event documents to generate         | `100`                  |
| `--num-combos` | If set, use exactly this many unique combos; docs distributed with variation | (optional) |
| `--run-interval-min` | Rule run interval (minutes); events for same combo spaced by this | `5` |
| `--max-docs-per-combo` | Max docs per combo when `--num-combos` is not set; e.g. 288 ≈ 1 day at 5 min | `288` |
| `--bulk-size`  | Documents per bulk request (1–50000)                      | `10000`                |
| `--concurrency`| Parallel bulk requests in flight (1–64)                  | `8`                    |
| `--skip-refresh` | Use `refresh=false` during bulk for maximum speed      | `false`                |
| `--rule-id`    | Rule ID to assign to events                              | `historical-rule-1`     |
| `--rule-version` | Rule version                                             | `1`                    |
| `--days-back`  | Spread event `@timestamp` over this many days in the past | `7`                    |
| `--es-url`     | Elasticsearch URL                                        | `ELASTICSEARCH_URL` or `http://localhost:9200` |
| `--username`   | Elasticsearch username                                   | `ELASTIC_USERNAME`     |
| `--password`   | Elasticsearch password                                   | `ELASTIC_PASSWORD`     |
| `--status`     | Event status: `breached`, `recovered`, `no_data`          | `breached`             |
| `--type`       | Event type: `signal`, `alert`                             | `alert`                |
| `--source`     | Event source string                                      | `internal`             |

**Fixed number of combos (e.g. 53M docs, 300k unique combos)**

Use `--num-combos` to get exactly that many unique (rule_id, group_hash, episode_id) combos; the total document count is distributed across them with variation (some combos get more docs, some fewer):

```bash
node scripts/run_populate_historical_alert_events.js \
  --count 53000000 \
  --num-combos 300000 \
  --bulk-size 10000 \
  --concurrency 8 \
  --skip-refresh
```

**High-throughput (e.g. tens of millions of documents)**

Use large `--bulk-size`, `--concurrency`, and `--skip-refresh` for maximum throughput:

```bash
node scripts/run_populate_historical_alert_events.js \
  --count 57000000 \
  --bulk-size 10000 \
  --concurrency 8 \
  --skip-refresh
```

Progress is logged every 1M documents. When using `--skip-refresh`, the index will refresh on its normal interval (or trigger a refresh manually) before new data is visible in search.

**Examples**

```bash
# 500 events over the last 14 days
node -r @kbn/babel-register/install \
  x-pack/platform/plugins/shared/alerting_v2/scripts/populate_historical_alert_events.ts \
  --count 500 --days-back 14

# Recovered events for a specific rule
node -r @kbn/babel-register/install \
  x-pack/platform/plugins/shared/alerting_v2/scripts/populate_historical_alert_events.ts \
  --count 50 --rule-id my-rule-id --status recovered
```
