# @kbn/es-snapshot-loader

Load Elasticsearch snapshots for testing environments. Provides two operations:

- **restore** - Basic snapshot restore directly to Elasticsearch
- **replay** - Restore with timestamp transformation for data streams, making historical data appear fresh

## Repository Types

`@kbn/es-snapshot-loader` supports two repository strategies:

- `url` (default): read-only URL repositories backed by `file://` paths
- `gcs`: Google Cloud Storage repositories

### URL Repository (`file://`)

For URL repositories, Elasticsearch must be started with `path.repo` configured to allow URL-based repository registration.

When starting Elasticsearch for development, configure snapshot repository path:

```bash
yarn es snapshot --E path.repo="/tmp/es-snapshots"
```

### GCS Repository

For GCS repositories, Elasticsearch must be configured with GCS credentials in the keystore using a credentials file setting such as `gcs.client.default.credentials_file`.

With the Scout `evals_tracing` server config, this is handled automatically when `GCS_CREDENTIALS` is set. The config writes the env var value to a temp file and passes `gcs.client.default.credentials_file=<temp-file>` so `kbn-es` routes it through keystore `add-file`.

## Creating Snapshots

Before using restore or replay, you need a snapshot. This section covers how to create snapshots compatible with `@kbn/es-snapshot-loader`.

### 1. Register a Snapshot Repository

First, register a file system repository. The `location` must be within the `path.repo` directory configured when starting Elasticsearch:

```bash
curl -X PUT "http://elastic:changeme@localhost:9200/_snapshot/my-repository" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "fs",
    "settings": {
      "location": "/tmp/es-backups"
    }
  }'
```

### 2. Create the Snapshot

Create a snapshot with only the indices you need. Avoid snapshotting global state or all indices unless your dataset requires it:

```bash
curl -X PUT "http://elastic:changeme@localhost:9200/_snapshot/my-repository/snapshot_1?wait_for_completion=true" \
  -H "Content-Type: application/json" \
  -d '{
    "indices": "logs-*,metrics-*,traces-*",
    "include_global_state": false
  }'
```

### How This Fits with Restore/Replay

Once you have a snapshot:

- **For restore**: Use `--snapshot-url file:///tmp/es-snapshots/my-repository` pointing to your repository directory. The loader will register this as a read-only URL repository and restore indices directly.

- **For replay**: Same as restore, but replay is designed for data streams (`logs-*`, `metrics-*`, `traces-*`). It transforms timestamps so your historical data appears fresh/useful for testing timestamp-aware features.

The snapshot repository path you used when creating the snapshot becomes the `--snapshot-url` (as a `file://` URL) when restoring or replaying.

## CLI Usage

### Restore

Restore a snapshot directly to Elasticsearch:

```bash
node scripts/es_snapshot_loader restore \
  --snapshot-url file:///path/to/snapshot \
  --es-url http://elastic:changeme@localhost:9200

# Restore from GCS repository
node scripts/es_snapshot_loader restore \
  --repo-type gcs \
  --gcs-bucket obs-ai-datasets \
  --gcs-base-path otel-demo/payment-service-failures \
  --es-url http://elastic:changeme@localhost:9200

# Restore a specific snapshot by name
node scripts/es_snapshot_loader restore \
  --snapshot-url file:///path/to/snapshot \
  --snapshot-name my-snapshot-2025-12-01 \
  --es-url http://elastic:changeme@localhost:9200

# With index filtering
node scripts/es_snapshot_loader restore \
  --snapshot-url file:///path/to/snapshot \
  --es-url http://elastic:changeme@localhost:9200 \
  --indices "my-index-*,other-index-*"
```

### Replay

Restore data streams with timestamp transformation. The most recent record in the snapshot will appear as "now", with all other timestamps adjusted relative to it:

```bash
node scripts/es_snapshot_loader replay \
  --snapshot-url file:///path/to/snapshot \
  --es-url http://elastic:changeme@localhost:9200 \
  --patterns "logs-*,metrics-*,traces-*"

# Replay from GCS repository
node scripts/es_snapshot_loader replay \
  --repo-type gcs \
  --gcs-bucket obs-ai-datasets \
  --gcs-base-path otel-demo/payment-service-failures \
  --es-url http://elastic:changeme@localhost:9200 \
  --patterns "logs-*,metrics-*,traces-*"

# Replay a specific snapshot by name
node scripts/es_snapshot_loader replay \
  --snapshot-url file:///path/to/snapshot \
  --snapshot-name my-snapshot-2025-12-01 \
  --es-url http://elastic:changeme@localhost:9200 \
  --patterns "logs-*,metrics-*,traces-*"

# With custom data stream patterns
node scripts/es_snapshot_loader replay \
  --snapshot-url file:///path/to/snapshot \
  --kibana-url http://localhost:5601 \
  --patterns "logs-*,metrics-*,traces-*"
```

### Common Options

| Flag              | Description                                                                          |
| ----------------- | ------------------------------------------------------------------------------------ |
| `--repo-type`     | Repository type (`url` or `gcs`, default: `url`)                                    |
| `--snapshot-url`  | URL snapshot directory for `url` repositories (`file://...`)                        |
| `--gcs-bucket`    | GCS bucket name (required when using `gcs`)                                          |
| `--gcs-base-path` | Optional base path in the GCS bucket                                                 |
| `--gcs-client`    | Optional Elasticsearch GCS client name                                               |
| `--snapshot-name` | Snapshot name to restore/replay (default: latest SUCCESS snapshot in the repository) |
| `--es-url`        | Elasticsearch URL with credentials (e.g., `http://elastic:changeme@localhost:9200`) |
| `--kibana-url`    | Kibana URL for ES requests proxied through Kibana (e.g., `http://localhost:5601`)   |

Notes:
- `--snapshot-url` and any `--gcs-*` flags are mutually exclusive.
- `--snapshot-url` is required unless `--repo-type gcs` is used.

### Restore-specific Options

| Flag        | Description                               |
| ----------- | ----------------------------------------- |
| `--indices` | Comma-separated index patterns to restore |

### Replay-specific Options

| Flag            | Description                                                                           |
| --------------- | ------------------------------------------------------------------------------------- |
| `--patterns`    | Comma-separated data stream patterns to replay (required)                              |
| `--concurrency` | Number of indices to reindex in parallel (default: all at once)                       |

## Programmatic API

### Basic Restore

```typescript
import { createUrlRepository, restoreSnapshot } from '@kbn/es-snapshot-loader';

const result = await restoreSnapshot({
  esClient,
  log,
  repository: createUrlRepository('file:///path/to/snapshot'),
  snapshotName: 'my-snapshot-2025-12-01',
  indices: ['my-index-*'],
});

if (result.success) {
  console.log(`Restored ${result.restoredIndices.length} indices`);
}
```

### Replay with Timestamp Transformation

```typescript
import { createUrlRepository, replaySnapshot } from '@kbn/es-snapshot-loader';

const result = await replaySnapshot({
  esClient,
  log,
  repository: createUrlRepository('file:///path/to/snapshot'),
  snapshotName: 'my-snapshot-2025-12-01',
  patterns: ['logs-*', 'metrics-*', 'traces-*'],
  concurrency: 5, // optional: limit parallel reindex operations
});

if (result.success) {
  console.log(`Reindexed ${result.reindexedIndices?.length} indices`);
  console.log(`Max timestamp: ${result.maxTimestamp}`);
}
```

### Replay from GCS Programmatically

```typescript
import { createGcsRepository, replaySnapshot } from '@kbn/es-snapshot-loader';

const result = await replaySnapshot({
  esClient,
  log,
  repository: createGcsRepository({
    bucket: 'obs-ai-datasets',
    basePath: 'otel-demo/payment-service-failures',
  }),
  snapshotName: 'my-snapshot-2025-12-01',
  patterns: ['logs-*', 'metrics-*', 'traces-*'],
});
```

### Using in Test Hooks

```typescript
import { Client } from '@elastic/elasticsearch';
import { createUrlRepository, replaySnapshot } from '@kbn/es-snapshot-loader';

describe('my test suite', () => {
  beforeAll(async () => {
    const esClient = new Client({
      node: 'http://localhost:9200',
      auth: { username: 'elastic', password: 'changeme' },
    });

    await replaySnapshot({
      esClient,
      log: console, // or your test logger
      repository: createUrlRepository('file:///fixtures/otel-demo-snapshot'),
      snapshotName: 'otel-demo-snapshot-2025-12-01',
      patterns: ['logs-*', 'metrics-*', 'traces-*'],
    });
  });

  // ... tests that use the replayed data
});
```

## Prerequisites

### For Restore

- URL repositories:
  - Elasticsearch must have `path.repo` configured to allow URL-based repository registration
  - The snapshot must be accessible at the specified `file://` URL
- GCS repositories:
  - Elasticsearch must be configured with GCS credentials in keystore (for example `gcs.client.default.credentials_file`)
  - The configured GCS client must be able to access the snapshot bucket/base path

### For Replay

- All prerequisites for restore, plus:
- Index templates for the target data streams must exist (pre-create, install Fleet or required integrations in Kibana)
- Without these templates, replay may create regular indices instead of data streams
- To check templates:
  - `GET _index_template/*?filter_path=index_templates.name,index_templates.index_template.index_patterns,index_templates.index_template.data_stream`

## How Replay Works

1. Register the configured snapshot repository (URL or GCS)
2. Retrieve snapshot metadata (uses `--snapshot-name` if provided; otherwise picks the latest SUCCESS snapshot)
3. Restore indices to temporary locations (prefixed with `snapshot-loader-temp-`)
4. Query restored indices to find the latest `@timestamp` in the data
5. Create an ingest pipeline that transforms `@timestamp` fields:
   - The latest timestamp from the data becomes "now"
   - All other timestamps are adjusted by the same offset, preserving relative timing
6. Reindex through the pipeline to the target data streams
7. Clean up temporary indices, pipeline, and repository
