# Capture Environment Snapshot

Captures the current Streams/SigEvents environment into a GCS snapshot. `.kibana` system indices are reindexed to snapshot-safe names with mappings preserved, then everything is snapshotted together.

## Prerequisites

- The environment must already contain all the data you want to capture (logs, alerts, Streams features/assets, etc.). This script only snapshots existing indices — it does not generate or ingest any data. Run the appropriate data generation scripts (e.g. OTel demo, Significant Events scenarios) before capturing.
- Local Elasticsearch with GCS credentials in the keystore.

## Why

Elasticsearch system indices (`.kibana_*`) cannot be directly included in snapshots, and `_reindex` does not carry mappings. This script handles it: it fetches the live mapping, creates a regular index copy (`snapshot-*`), reindexes the data, then snapshots everything together with non-system indices.

## Usage

```bash
node scripts/capture_sigevents_env_snapshot.js --snapshot-name my-snapshot
```

### With custom options

```bash
node scripts/capture_sigevents_env_snapshot.js \
  --snapshot-name my-snapshot \
  --run-id test-run-2026-03-18 \
  --indices logs.otel \
  --indices .internal.alerts-streams.alerts-default-* \
  --system-indices .kibana_streams_features-* \
  --system-indices .kibana_streams_assets-* \
  --system-indices .kibana_streams_insights-*
```

### Flags

| Flag | Description | Default |
| --- | --- | --- |
| `--snapshot-name` | **Required.** Name for the snapshot. | none |
| `--run-id` | Run identifier for GCS repo name and base path. | Today's date `YYYY-MM-DD` |
| `--indices` | Index to include directly in the snapshot + replay. Can be repeated. | `logs.otel` `.internal.alerts-streams.alerts-default-*` |
| `--system-indices` | `.kibana` system index to capture with mapping. Can be repeated. Must start with `.kibana`. | `.kibana_streams_features-*` `.kibana_streams_assets-*` |
| `--es-url` | Elasticsearch URL | from `config/kibana.dev.yml` |
| `--es-username` | Elasticsearch username | from `config/kibana.dev.yml` |
| `--es-password` | Elasticsearch password | from `config/kibana.dev.yml` |
| `--kibana-url` | Kibana URL | from `config/kibana.dev.yml` |

## How it works

1. Resolves wildcard patterns to concrete index names via `GET _resolve/index`.
2. For each `--system-indices` match, fetches its mapping, creates a `snapshot-*` copy, and reindexes the data. `--indices` targets are included directly in the snapshot without reindexing.
3. Fetches existing aliases from all resolved indices (both system and regular) and prints them as post-restore/replay commands.
4. Registers a GCS snapshot repository and creates the snapshot containing all captured indices.

### Naming convention

Only `.kibana` system indices are renamed. Leading `.` is replaced with `snapshot-`:

| Source index | Snapshot index |
| --- | --- |
| `.kibana_streams_features-000001` | `snapshot-kibana_streams_features-000001` |
| `.kibana_streams_assets-000001` | `snapshot-kibana_streams_assets-000001` |
| `.internal.alerts-streams.alerts-default-000001` | `.internal.alerts-streams.alerts-default-000001` (no change) |
| `logs.otel` | `logs.otel` (no change) |

## Restoring

### 1. System indices (restore with rename)

```bash
node scripts/es_snapshot_loader restore \
  --repo-type gcs \
  --gcs-bucket significant-events-datasets \
  --gcs-base-path <run-id>/<base-path> \
  --snapshot-name <snapshot-name> \
  --es-url http://elastic:changeme@localhost:9200 \
  --indices "snapshot-kibana_streams_features-000001,snapshot-kibana_streams_assets-000001" \
  --rename-pattern "snapshot-(.*)" \
  --rename-replacement ".\$1"
```

### 2. Data indices (replay with timestamp transformation)

```bash
node scripts/es_snapshot_loader replay \
  --repo-type gcs \
  --gcs-bucket significant-events-datasets \
  --gcs-base-path <run-id>/<base-path> \
  --snapshot-name <snapshot-name> \
  --es-url http://elastic:changeme@localhost:9200 \
  --patterns "logs.otel,.internal.alerts-streams.alerts-default-000001"
```

### 3. Recreate aliases

Aliases are **not** preserved during restore or replay. They must be recreated manually after the data is in place. The capture script prints the exact commands needed.

#### `.kibana` system aliases

`.kibana` aliases (e.g. `.kibana_streams_features`, `.kibana_streams_assets`) are managed by Elasticsearch's system index protection. Creating them requires either:

- **Option A (recommended):** Start Kibana — the Streams plugin will automatically recreate the aliases via `kbn-storage-adapter` on startup.
- **Option B:** Use a user with the `system_indices_superuser` role and run the alias commands manually:

```
POST _aliases
{
  "actions": [
    { "add": { "index": ".kibana_streams_features-000001", "alias": ".kibana_streams_features", "is_hidden": true } },
    { "add": { "index": ".kibana_streams_assets-000001", "alias": ".kibana_streams_assets", "is_hidden": true } }
  ]
}
```

> **Note:** The default `elastic` user with the `superuser` role is **not** sufficient.
> You must create a dedicated user with the `system_indices_superuser` role to manage
> `.kibana`-prefixed aliases. This is an Elasticsearch restriction on system index access.

#### `.internal` and other aliases

Non-system aliases can be created by any user with the `manage` index privilege:

```
POST _aliases
{
  "actions": [
    { "add": { "index": ".internal.alerts-streams.alerts-default-000001", "alias": ".alerts-streams.alerts-default", "is_hidden": true } }
  ]
}
```

## Why aliases can't be baked into the snapshot

During capture, the source system indices (e.g. `.kibana_streams_features-000001`) still exist in the cluster with their aliases. Elasticsearch enforces that an alias cannot point to both a system and a non-system index simultaneously. Since the snapshot copies are regular (non-system) indices, adding the same alias name to them is rejected. This is a fundamental Elasticsearch limitation, not a script limitation.
