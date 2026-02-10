# Alerting v2 scripts

## populate_historical_alert_events

Populates the `.alerts-events` data stream with historical alert events for testing or demos.

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
| `--count`      | Number of alert events to generate                       | `100`                  |
| `--rule-id`    | Rule ID to assign to events                              | `historical-rule-1`     |
| `--rule-version` | Rule version                                             | `1`                    |
| `--days-back`  | Spread event `@timestamp` over this many days in the past | `7`                    |
| `--es-url`     | Elasticsearch URL                                        | `ELASTICSEARCH_URL` or `http://localhost:9200` |
| `--username`   | Elasticsearch username                                   | `ELASTIC_USERNAME`     |
| `--password`   | Elasticsearch password                                   | `ELASTIC_PASSWORD`     |
| `--status`     | Event status: `breached`, `recovered`, `no_data`          | `breached`             |
| `--type`       | Event type: `signal`, `alert`                             | `alert`                |
| `--source`     | Event source string                                      | `internal`             |

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
