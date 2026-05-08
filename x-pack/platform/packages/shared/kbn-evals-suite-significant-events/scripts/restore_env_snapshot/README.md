# Restore Environment Snapshot

Restores a Streams/SigEvents environment from a GCS snapshot. Automates the full six-step restore workflow: restoring system indices, recreating aliases, enabling streams, replaying data indices with timestamp transformation, recreating alert aliases, and repromoting query rules.

## Prerequisites

- Local Elasticsearch running.
- Access to the GCS bucket containing the snapshot (credentials available in your environment or keystore).
- Credentials with `manage_security` privilege (see [Required privileges](#required-privileges)).

> **Dirty environment?** If you have existing `logs.otel`, `.internal.alerts-streams.*`, or `.kibana_streams*` indices, the script will detect them and prompt you to delete them before proceeding. Pass `--clean` to skip the prompt and delete automatically.

## Why

Restoring a SigEvents snapshot involves six distinct steps that previously had to be run manually in sequence:

1. **Restore** system indices (e.g. `.kibana_streams_features-*`) — renames them back from `snapshot-*` to `.*`.
2. **Recreate** `.kibana_*` aliases — system index aliases cannot be baked into the snapshot; they must be recreated after restore.
3. **Enable streams** — calls the Kibana Streams API to ensure streams are enabled before replaying data.
4. **Replay** data indices (e.g. `logs.otel`) — restores with timestamp transformation so alerts fire on current data.
5. **Recreate** alert-index aliases.
6. **Repromote** query rules so the Streams rule engine reflects the restored state.

This script automates all six steps in a single invocation.

## Usage

```bash
node scripts/restore_sigevents_env_snapshot.js \
  --snapshot-name my-snapshot \
  --gcs-base-path 2026-03-22/otel-demo
```

### With custom options

```bash
node scripts/restore_sigevents_env_snapshot.js \
  --snapshot-name my-snapshot \
  --gcs-bucket significant-events-datasets \
  --gcs-base-path 2026-03-22/otel-demo \
  --logs-index logs.otel \
  --system-indices .kibana_streams_features-* \
  --system-indices .kibana_streams_assets-* \
  --es-username elastic \
  --es-password changeme
```

### Flags

| Flag | Description | Default |
| --- | --- | --- |
| `--snapshot-name` | **Required.** Name of the snapshot to restore. | none |
| `--gcs-base-path` | **Required.** GCS base path to the snapshot repository. | none |
| `--gcs-bucket` | GCS bucket containing the snapshot. | `significant-events-datasets` |
| `--logs-index` | Logs index to replay. | `logs.otel` |
| `--alert-indices` | Alert index to replay. Can be repeated. | `.internal.alerts-streams.alerts-default-*` |
| `--system-indices` | `.kibana` system index pattern to restore. Can be repeated. | `.kibana_streams_features-*` `.kibana_streams_assets-*` `.kibana_streams_insights-*` `.kibana_streams_tasks-*` |
| `--clean` | Delete conflicting indices before restoring without prompting | `false` |
| `--es-url` | Elasticsearch URL | from `config/kibana.dev.yml` |
| `--es-username` | Elasticsearch username | from `config/kibana.dev.yml` |
| `--es-password` | Elasticsearch password | from `config/kibana.dev.yml` |

## How it works

All steps run inside a temporary-user context: the script creates `restore_sigevents_env_snapshot_tmp` with the `system_indices_superuser` role before Step 1 and deletes it after Step 6 (or on any failure).

1. **Step 1/6 — Restore system indices**: calls `restoreSnapshot` with rename pattern `snapshot-(.*)` → `.$1`. System indices were captured as `snapshot-kibana_streams_features-000001` and are restored back to `.kibana_streams_features-000001`. Missing indices are a hard error (no `allowNoMatches`).

2. **Step 2/6 — Ensure system-index aliases**: calls `ensureKnownAliases` for the restored system indices. Uses a known alias configuration (`INDEX_ALIAS_CONFIG`) to recreate aliases with `is_write_index: true` and `is_hidden: true`. Idempotent — skips aliases that already exist.

3. **Step 3/6 — Enable streams**: calls `ensureStreamsEnabled` to enable Streams via the Kibana API (`POST /api/streams/_enable`). This must happen before replaying data so that Streams-managed data streams are properly configured.

4. **Step 4/6 — Replay data indices**: calls `replaySnapshot` from `@kbn/es-snapshot-loader` with a GCS repository and the resolved `--patterns`. This restores data streams (e.g. `logs.otel`) with timestamp transformation so timestamps are shifted to the current time window.

5. **Step 5/6 — Ensure alert-index aliases**: calls `ensureKnownAliases` for the replayed alert indices.

6. **Step 6/6 — Repromote queries**: resets and then re-promotes all query rules so the Streams rule engine reflects the restored state.

## Relationship to capture

The capture script (`capture_sigevents_env_snapshot.js`) prints the exact restore command with the correct `--gcs-bucket`, `--gcs-base-path`, and `--snapshot-name` flags after a successful capture. Copy that command to restore the environment later.

See [`capture_env_snapshot/README.md`](../capture_env_snapshot/README.md) for the capture workflow.

## Required privileges

The script automatically creates and deletes a temporary `system_indices_superuser` user. The credentials you pass (`--es-username` / `--es-password`) only need the `manage_security` cluster privilege to do so — the built-in `elastic` superuser works out of the box.
