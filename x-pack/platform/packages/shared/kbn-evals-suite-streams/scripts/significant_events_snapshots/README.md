# Significant Events snapshots

This folder contains a small CLI + helper modules for producing **repeatable Elasticsearch snapshots** that can be used as datasets for **Streams Significant Events** evaluation and experimentation.

The snapshots are written to **GCS** (bucket: `obs-ai-datasets`) under a run-specific base path, and each scenario snapshot contains:
- `logs*` — OTel demo log data generated during the run
- `.kibana_streams_features` — extracted features produced by Streams feature extraction

## What this does

For each selected scenario, the [capture_otel_demo_snapshots](capture_otel_demo_snapshots.ts) script:

1. Deploys the OTel Demo on minikube (runs `node scripts/otel_demo.js` in the background)
2. Waits for pods to become ready
3. Accumulates baseline traffic for a fixed window
4. Optionally patches a failure scenario and accumulates failure traffic
5. Enables Significant Events + runs feature extraction for the `logs` stream
6. Creates an Elasticsearch snapshot to GCS
7. Cleans up logs + extracted features, disables streams, and tears down the OTel demo

The per-scenario deploy/teardown + data cleanup is intentional as each snapshot should be isolated and not contaminated by previous scenarios.

### Prerequisites

- **minikube** + **kubectl**
- Local **Elasticsearch** running with access to GCS credentials: `yarn es snapshot --license trial --secure-files gcs.client.default.credentials_file=/path/to/creds.json`
- Local **Kibana** running
- GCS repository access configured in Elasticsearch (so ES can write snapshots to the bucket)
- An LLM connector configured in `kibana.dev.yml` for feature extraction

### Flags

| Flag | Description | Default |
| --- | --- | --- |
| `--connector-id` | **Required.** LLM connector ID used for feature extraction. | none |
| `--run-id` | Run identifier used for the snapshot repo name and GCS base path. | Today’s date `YYYY-MM-DD` (local time) |
| `--scenario` | Limit to specific scenario(s). Can be repeated. Omit to run all scenarios in `lib/constants.ts`. | All scenarios |
| `--dry-run` | Print what would happen without deploying, extracting, or snapshotting. | `false` |
| `--es-url` | Elasticsearch URL | from `config/kibana.dev.yml` |
| `--es-username` | Elasticsearch username | from `config/kibana.dev.yml` |
| `--es-password` | Elasticsearch password | from `config/kibana.dev.yml` |
| `--kibana-url` | Kibana base URL (If omitted, the script builds it from Kibana config and resolves dev basePath redirects) | from `config/kibana.dev.yml` (with basePath resolution) |

## How to run

### Create snapshots for all [available scenarios](./lib/constants.ts)

```
node scripts/capture_sigevents_otel_demo_snapshots.ts --connector-id <connectorId>
```

### Create snapshots for specific scenarios

```
node scripts/capture_sigevents_otel_demo_snapshots.ts \
  --connector-id <connectorId> \
  --scenario healthy-baseline \
  --scenario payment-unreachable
```

### Create snapshots with a specific run ID

**What `--run-id` does:** It namespaces where snapshots are stored in GCS and what the ES snapshot repository is called.
- GCS base path: `gs://obs-ai-datasets/sigevents/otel-demo/<run-id>/`
- Snapshot repository name: `sigevents-<run-id>`

**Default:** If omitted, `--run-id` defaults to today’s date in `YYYY-MM-DD` format (local time).

Note: Use a unique run ID (e.g.: `test-run-...`) to keep multiple runs side-by-side without colliding with previous snapshots.

```
node scripts/capture_sigevents_otel_demo_snapshots.ts \
  --connector-id <connectorId> \
  --run-id test-run-2026-02-23
```

## Output

At the end of a run you should see:
- Snapshot Run ID
- GCS base path for the run
- Snapshot names (one per scenario)

Those snapshot names are what you will replay later in the eval setup.

## Best Practices

This script is designed for **disposable dev data** and assumes it owns the `logs*` space.

- **Run against a dedicated dev ES/Kibana**: The cleanup step deletes data in `logs*` and `.kibana_streams_features`, and it disables Streams. Do not point this at a shared cluster with important logs.
- **Keep the cluster quiet**: Feature extraction is scheduled over the **last 24 hours** (`from = now - 24h`), so any unrelated `logs*` data in that time range can affect extracted features and snapshots.
- **Use a unique `--run-id`**: It determines the snapshot repository name (`sigevents-<run-id>`) and the GCS base path. Reusing a run ID can collide with existing snapshots (same scenario snapshot names).
- **Start small**: When iterating, run a single `--scenario` first; use `--dry-run` to verify what will be created.
- **If you abort mid-run**: You may need to manually teardown the demo (`node scripts/otel_demo.js --teardown`) and/or clean up remaining `logs*` / streams state before retrying.
