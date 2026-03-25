# Restore Environment Snapshot

Restores a Streams/SigEvents environment from a GCS snapshot. Automates the full three-step restore workflow: replaying data indices with timestamp transformation, restoring system indices with rename, and recreating `.kibana` system aliases.

## Prerequisites

- Local Elasticsearch running.
- Access to the GCS bucket containing the snapshot (credentials available in your environment or keystore).
- A user with `manage` privilege on the `.kibana_*` system indices (see [Creating a user with the required privileges](#creating-a-user-with-the-required-privileges)).

> **Dirty environment?** If you have existing `logs.otel`, `.internal.alerts-streams.*`, or `.kibana_streams*` indices, the script will detect them and prompt you to delete them before proceeding. Pass `--clean` to skip the prompt and delete automatically.

## Why

Restoring a SigEvents snapshot involves three distinct steps that previously had to be run manually in sequence:

1. **Replay** data indices (e.g. `logs.otel`) — restores with timestamp transformation so alerts fire on current data.
2. **Restore** system indices (e.g. `.kibana_streams_features-*`) — renames them back from `snapshot-*` to `.*`.
3. **Recreate** `.kibana_*` aliases — system index aliases cannot be baked into the snapshot; they must be recreated after restore.

This script automates all three steps in a single invocation.

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
| `--system-indices` | `.kibana` system index pattern to restore. Can be repeated. | `.kibana_streams_features-*` `.kibana_streams_assets-*` |
| `--clean` | Delete conflicting indices before restoring without prompting | `false` |
| `--es-url` | Elasticsearch URL | from `config/kibana.dev.yml` |
| `--es-username` | Elasticsearch username | from `config/kibana.dev.yml` |
| `--es-password` | Elasticsearch password | from `config/kibana.dev.yml` |

## How it works

1. **Step 1/3 — Replay data indices**: calls `replaySnapshot` from `@kbn/es-snapshot-loader` with a GCS repository and the resolved `--patterns`. This restores data streams (e.g. `logs.otel`) with timestamp transformation so timestamps are shifted to the current time window.

2. **Step 2/3 — Restore system indices**: calls `restoreSnapshot` with rename pattern `snapshot-(.*)` → `.$1`. System indices were captured as `snapshot-kibana_streams_features-000001` and are restored back to `.kibana_streams_features-000001`. Missing indices are a hard error (no `allowNoMatches`).

3. **Step 3/3 — Recreate aliases**: calls `createMissingAliases` with the list of restored index names. Derives alias names by stripping the trailing `-NNNNNN` counter (e.g. `.kibana_streams_features-000001` → `.kibana_streams_features`). Creates each alias with `is_write_index: true` and `is_hidden: true`. Idempotent — skips aliases that already exist.

## Relationship to capture

The capture script (`capture_sigevents_env_snapshot.js`) prints the exact restore command with the correct `--gcs-bucket`, `--gcs-base-path`, and `--snapshot-name` flags after a successful capture. Copy that command to restore the environment later.

See [`capture_env_snapshot/README.md`](../capture_env_snapshot/README.md) for the capture workflow.

## Creating a user with the required privileges

Both capture and restore scripts need `manage` privilege on `.kibana_*` system indices with `allow_restricted_indices`. The simplest approach is to create a user with the built-in `system_indices_superuser` role:

```bash
# Create a user "test" with the system_indices_superuser role
curl -u elastic:changeme -X POST "http://localhost:9200/_security/user/<username>" \
  -H 'Content-Type: application/json' -d '{
  "password": "<password>",
  "roles": ["system_indices_superuser"]
}'
```

Then pass the credentials to the script:

```bash
node scripts/restore_sigevents_env_snapshot.js \
  --snapshot-name my-snapshot \
  --gcs-base-path <run-id>/<base-path> \
  --es-username <username> \
  --es-password <password>
```
