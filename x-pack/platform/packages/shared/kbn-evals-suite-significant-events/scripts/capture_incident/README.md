# capture-incident

Capture a single incident's curated logs into a GCS snapshot.

`capture-incident` is a standalone dev script (run via
`node scripts/capture_incident_snapshot.js`) built on top of the
`@kbn/es-snapshot-loader` GCS repository. It copies a scoped slice of a source
cluster's logs (e.g. "Overview") into a local Elasticsearch via a **remote
`_reindex`**, then snapshots it to the `nightshift-incident-snapshots` GCS bucket.
Each snapshot carries native, immutable metadata (queryable via the ES snapshot
API) plus a bucket-local `manifest.json`, so any snapshot is self-describing
without an external catalog.

One config file == one incident. Run the command once per incident.

## Why a reindex is needed

- **CCS (Cross-Cluster Search)** never copies data — it is a live, query-time
  federation. Nothing is stored locally as a side effect of a CCS query.
- **Snapshot & Restore** only works on physically local indices. You cannot
  snapshot data reachable only via CCS, which is why the `_reindex` is unavoidable.
- `_reindex`'s `source.remote` connects over plain HTTP(S) directly to the host
  you specify; it does not reuse any registered "remote cluster" alias.

## Prerequisites

### 1. A scoped, read-only API key on the source (Overview)

The remote reindex needs an API key with **both** `cluster: ["monitor"]` (for the
reindex compatibility check — omitting it fails with `action [cluster:monitor/main]
is unauthorized`) and `read` on the target index pattern:

```
POST /_security/api_key
{
  "name": "incident-reindex-readonly",
  "expiration": "7d",
  "role_descriptors": {
    "reader": {
      "cluster": ["monitor"],
      "indices": [{ "names": ["logs-*"], "privileges": ["read"] }]
    }
  }
}
```

Export it before running (preferred over putting it in the config file):

```bash
export OVERVIEW_API_KEY='<the-api-key>'
```

### 2. A local Elasticsearch with remote reindex + GCS enabled

`reindex.remote.whitelist` is a **static** setting (config-file or `-E` only;
requires a restart — it cannot be set via `PUT _cluster/settings`). The
`--secure-files` path must be **absolute** (it is resolved relative to the ES
install dir, not your cwd).

```bash
node scripts/es snapshot --license trial \
  -E reindex.remote.whitelist=1abe339b8ee8411bacfda74fc62f1fca.us-east-1.aws.found.io:443 \
  --secure-files gcs.client.default.credentials_file=<absolute-path-to-gcs-credentials.json>
```

If the whitelist doesn't cover your source host, the command fails fast and prints
the exact command to re-run.

## Usage

```bash
# Dry run: validate config + prerequisites, print request bodies, no mutations.
node scripts/capture_incident_snapshot.js \
  --config x-pack/platform/packages/shared/kbn-evals-suite-significant-events/scripts/capture_incident/example.incident.yml \
  --es-url http://elastic:changeme@localhost:9200 \
  --dry-run

# Real run.
node scripts/capture_incident_snapshot.js \
  --config ./my-incident.yml \
  --es-url http://elastic:changeme@localhost:9200
```

`--config` is required. The connection flags (`--es-url`, `--es-api-key`,
`--kibana-url`) mirror the `es_snapshot_loader` commands used to restore/replay the
result. The source API key comes from `OVERVIEW_API_KEY` (preferred) or
`source.apiKey` in the config.

### Flags

| Flag           | Required | Description                                                      |
| -------------- | -------- | ---------------------------------------------------------------- |
| `--config`     | yes      | Path to the incident config file (`.yml`/`.yaml`/`.json`)        |
| `--dry-run`    | no       | Validate + print request bodies without mutating anything        |
| `--es-url`     | no\*     | Local Elasticsearch URL with credentials                         |
| `--es-api-key` | no       | Local Elasticsearch API key (base64; overrides `--es-url` creds) |
| `--kibana-url` | no\*     | Kibana URL (ES requests proxied through Kibana)                  |

\* Provide `--es-url` (or `--kibana-url`) to point at your local ES. See
`node scripts/capture_incident_snapshot.js --help`.

## Config file

See [`example.incident.yml`](./example.incident.yml). Both JSON and YAML are
accepted.

### Two queries, all log datasets

Every config carries two queries — **both plain Query DSL query objects** (write
whatever DSL fits: `query_string`, `term`/`terms`, `bool`, …), because the remote
`_reindex` accepts Query DSL only, not ES|QL:

- **`query.symptom`** — a narrow query that locates and confirms the incident. It
  is stored only, **not snapshotted**; replay it against the restored index to
  isolate the error lines.
- **`query.snapshot`** — the broad query that IS reindexed and snapshotted (noise
  included). Scope it by an **entity key that appears in every dataset** (e.g.
  `serverless.project.id`, or a k8s node/pod `host.name`) rather than by dataset,
  so the capture spans ALL `logs-*` datasets that entity emitted, not just the one
  where the symptom string matched. Omit it (or `{}`) to capture the whole
  `source.index` within `timeRange`.

Both are combined with `query.timeRange` automatically (the tool wraps them in a
`bool.filter` with the `@timestamp` range), so don't repeat the time range inside
them.

### Original index names (no `dest` config)

There is no `dest` block. A painless reindex script routes each doc to its
**original source data-stream name**: a data-stream backing index
(`.ds-logs-elasticsearch.server-default-2026.05.06-000001`, possibly `partial-`
prefixed on the frozen tier) becomes `logs-elasticsearch.server-default`; any
non-data-stream index keeps its own name. The tool diffs the local index set
before vs after the reindex to find exactly the indices this run created, and
snapshots that set. So a broad `source.index` of `<remote>:logs-*` scoped by
`query.snapshot` produces one local index per source data stream, each under its
original name, and restore later brings them back under those same names.

Caveats: these are plain indices, not real data streams; backing-index
generations are merged into one index; and mappings are the capture-time dynamic
mappings (source index templates are not carried over). Use `source.exclude` to
drop datasets a broad `logs-*` would otherwise pull in but that the source key
can't read or that are too large (e.g. `logs-elasticsearch.gc-*`).

### Schema

| Field                              | Required | Description                                                                                   |
| ---------------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `incident.id`                      | yes      | Incident id (used for snapshot name and default GCS base path)                                |
| `incident.title`                   | yes      | Human-readable title (stored in metadata)                                                     |
| `incident.date`                    | yes      | Incident date (stored in metadata)                                                            |
| `incident.slackChannel`            | no       | Slack channel (stored in metadata)                                                            |
| `source.host`                      | yes      | Source Elasticsearch endpoint (must be in `reindex.remote.whitelist`)                         |
| `source.apiKey`                    | no       | Inline API key (prefer `OVERVIEW_API_KEY` env var)                                            |
| `source.index`                     | yes      | One index pattern or a list; broad `clusterAlias:logs-*` recommended (all datasets)           |
| `source.exclude`                   | no       | Patterns to drop from `source.index` (compiled to `-pattern`); e.g. `logs-elasticsearch.gc-*` |
| `source.cluster`                   | no       | Source cluster alias (provenance metadata; optional, may be a wildcard)                       |
| `query.timeRange.gte` / `lt`       | yes      | Time window (from the incident doc's range)                                                   |
| `query.symptom`                    | no       | Query DSL query for the narrow probe (stored/replay only)                                     |
| `query.snapshot`                   | no       | Query DSL query for the reindexed slice; scope by entity; `{}`/omit = whole `source.index`    |
| `snapshot.expectedSymptomDocCount` | no       | Symptom hit count from the probe (informational)                                              |
| `snapshot.expectedDocCount`        | no       | If set, the run fails on a reindexed-count mismatch (TOTAL across captured indices)           |
| `snapshot.gcsBasePath`             | no       | GCS base path (default: `customer0-incidents/incident-<id>`)                                  |
| `snapshot.preserveProvenance`      | no       | Keep original `_index`/cluster on each doc (default `true`)                                   |

`query.snapshot` is optional; omit it to snapshot the whole `source.index` within
`timeRange`. There is no `dest` field — captured indices keep their original
data-stream names (see above).

## What it does

1. Validates the config and resolves the source API key.
2. Verifies the source host is in `reindex.remote.whitelist` (fails fast otherwise).
3. Installs a high-priority, plain index template for the capture patterns. It maps
   the core ECS fields symptom replay / triage use (`@timestamp`, `message`,
   `log.level`, `log.logger`, `host.name`, `data_stream.*`, `service.name`,
   `error.message`, `serverless.project.id`, `kubernetes.pod.name`, and the
   provenance fields) so the restored indices are searchable on them, while
   `dynamic: false` keeps every other field intact in `_source` without letting an
   inconsistently-shaped field (e.g. `volume` object-vs-scalar) break the reindex.
   It then removes any leftover capture indices (and templates) from a previous
   incident — captures share original data-stream names, so leftovers would
   otherwise mix into the new index or be silently dropped by the diff.
4. Remote-reindexes the broad `query.snapshot` slice, routing each doc to its
   original source data-stream name (via a painless script). With
   `preserveProvenance`, each doc first keeps `kibana_incident_source_index` (the
   exact source backing-index name) and `kibana_incident_source_cluster`.
   (`query.symptom` is not executed — it is built to Query DSL and stored for replay.)
5. Diffs the local index set before vs after the reindex to identify exactly the
   indices this run created, then refreshes and counts them per index (verified
   against `expectedDocCount` — the TOTAL — if provided).
6. Registers the `nightshift-incident-snapshots` GCS repository (`verify: true`
   surfaces bad credentials early).
7. Creates the snapshot `incident-<id>` over exactly the captured (original-named)
   indices, with native metadata (`incident_id`, `incident_title`, `incident_date`,
   `source_cluster`, `time_range`, `doc_count`, `slack_channel`, `gcs_path`,
   `index_count`). Native snapshot metadata is capped at 1024 bytes, so the full
   index list lives in the manifest instead.
8. Uploads a `manifest.json` with the same fields plus `captured_indices`,
   per-index `doc_counts`, and the `query.symptom` Query DSL into the snapshot's GCS
   folder.

Note: the local capture indices are left in place after the run (not deleted). The
next `capture-incident` run cleans them up in step 3, so re-runs are safe; delete
them manually only if you want to reclaim local disk sooner.

## Recovering the incident ↔ snapshot mapping

Directly from the bucket's own repository — no external catalog needed:

```
GET _snapshot/nightshift-incident-snapshots/_all
```

Each snapshot returns its metadata block. Browsers can also read
`<gcs-base-path>/manifest.json` from the GCS console.

## Restoring / replaying a snapshot

The snapshot stores each index under its original data-stream name, so restore
brings them back under those names. Use the sibling `restore` / `replay`
subcommands (the `gcs-base-path` comes from the manifest's `gcs_path`):

```bash
# Restore the original-named indices as-is (timestamps unchanged).
node scripts/es_snapshot_loader restore \
  --repo-type gcs \
  --gcs-bucket nightshift-incident-snapshots \
  --gcs-base-path <base-path> \
  --snapshot-name incident-<id> \
  --es-url http://elastic:changeme@localhost:9200

# Or replay: restore + shift `@timestamp` so the historical slice looks recent,
# reingesting into data streams (needs matching index templates present).
node scripts/es_snapshot_loader replay \
  --repo-type gcs --gcs-bucket nightshift-incident-snapshots \
  --gcs-base-path <base-path> --snapshot-name incident-<id> \
  --patterns 'logs-*' --es-url http://elastic:changeme@localhost:9200
```

To isolate just the error lines after restore, run the manifest's `symptom_query`
against the restored indices.

## Files

| File                                             | Purpose                                                          |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| [`constants.ts`](./constants.ts)                 | GCS bucket / ES repository name, `OVERVIEW_API_KEY` env var name |
| [`incident_config.ts`](./incident_config.ts)     | Config schema (zod), JSON/YAML loader, `buildIncidentQuery`      |
| [`incident_gcs.ts`](./incident_gcs.ts)           | GCS repo registration, snapshot-with-metadata, manifest upload   |
| [`incident_snapshot.ts`](./incident_snapshot.ts) | Orchestration (prereq → reindex → verify → snapshot → manifest)  |
| [`index.ts`](./index.ts)                         | CLI entry (flags + ES client) for the command                    |
| [`example.incident.yml`](./example.incident.yml) | Copy-paste config template                                       |

The command runs through the root launcher
[`scripts/capture_incident_snapshot.js`](../../../../../../../scripts/capture_incident_snapshot.js),
which loads [`index.ts`](./index.ts).

## Troubleshooting

- **`action [cluster:monitor/main] is unauthorized`** — the source API key is
  missing `cluster: ["monitor"]`. Recreate it (see prerequisites).
- **`... is not in reindex.remote.whitelist`** — restart local ES with the printed
  `-E reindex.remote.whitelist=<host:port>` flag.
- **GCS `401` on repository register/verify** — usually the `--secure-files`
  credentials path was relative; it must be **absolute**.
- **Snapshot already exists** — snapshot metadata is immutable; delete and
  recreate: `DELETE _snapshot/nightshift-incident-snapshots/incident-<id>`.
