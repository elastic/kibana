# capture-incident

Capture a single incident's curated logs into a GCS snapshot.

`capture-incident` is a standalone dev script (run via
`node scripts/capture_incident_snapshot.js`) built on top of the
`@kbn/es-snapshot-loader` GCS repository. It copies a scoped slice of a source
cluster's logs into a local Elasticsearch via a **remote `_reindex`**, then
snapshots it to the `nightshift-incident-snapshots` GCS bucket. Each snapshot
carries native, immutable metadata (queryable via the ES snapshot API) plus a
bucket-local `manifest.json`, so any snapshot is self-describing.

One incident == one snapshot. Run the command once per incident.

## Two ways to run

- **Auto (`--incident-id`)** — give just an incident id. The script reads the
  incident's facts from the incident cluster's `rootly_incidents` (cross-referencing
  `pagerduty_incidents`) via a plain `_search`, then asks the logs cluster's **Agent
  Builder** to derive the portable symptom against the real logs (the time window,
  the symptom query, the affected entity field, and the region). It confirms that
  entity against the Overview source cluster, computes the expected doc counts,
  **writes `<id>.incident.yml`**, and runs the capture from it.
- **Manual (`--config`)** — hand-write (or edit an auto-generated) config file and
  pass it via `--config`. See [`example.incident.yml`](./example.incident.yml).

Both modes ultimately run from a config file on disk — auto mode just generates
that file first, so `<id>.incident.yml` is the single source of truth for the run.

## Steps

The auto pipeline is:

1. **Incident facts** — a direct `_search` on `rootly_incidents` /
   `pagerduty_incidents` for the title, date, region, services, and error
   narratives. Deterministic (no LLM); the date anchors the whole capture window.
2. **Symptom derivation** — a single Agent Builder round on the logs cluster
   derives + verifies, against the real logs: the CCS remote alias, the symptom
   Query DSL, the entity field, and a wide search window. One retry absorbs an
   occasional empty round.
3. **Probe** — against the Overview source ES: anchors `timeRange` on the real
   symptom timestamps (±1h), discovers the entity values from the symptom hits,
   builds the broad `terms` snapshot query, and drops a fixed set of noisy /
   low-signal datasets (GC, proxy, bootstrap) that do not carry the symptom.

The capture (both modes) then:

4. Validates the config, resolves the source key, and verifies `source.host` is in
   `reindex.remote.whitelist` (fails fast otherwise).
5. Installs a high-priority, plain, `dynamic: false` index template with a fixed
   set of core ECS field mappings, and removes any leftover capture indices from a
   previous run.
6. Remote-reindexes the broad slice, routing each doc to its **original data-stream
   name** via a painless script (with provenance fields when `preserveProvenance`).
7. Diffs the local index set before vs after to find exactly the indices this run
   created, refreshes + counts them (verified against `expectedDocCount` if set).
8. Registers the GCS repository, creates the snapshot `incident-<id>` with native
   metadata, and uploads a `manifest.json` (full index list, per-index counts, and
   the `query.symptom` Query DSL) into the snapshot's GCS folder.

The local capture indices are left in place after the run; the next run cleans them
up in step 5, so re-runs are safe.

## Clusters

Cluster endpoints are pinned in [`constants.ts`](./constants.ts) (not overridable
by env vars or flags); only the API keys come from the environment.

| Role     | Cluster                            | Used for                                        |
| -------- | ---------------------------------- | ----------------------------------------------- |
| Incident | platform-logging (GCP us-central1) | `rootly_incidents` / `pagerduty_incidents` read |
| Overview | Overview                           | Agent Builder + remote `_reindex` + the probe   |
| Local    | localhost:9200                     | reindex destination + snapshot source           |

## Auto-mode usage

Copy [`secrets.env.example`](./secrets.env.example) to `secrets.env`, fill it in,
and source it in a subshell so the exports don't linger:

```bash
( source x-pack/platform/packages/shared/kbn-evals-suite-significant-events/scripts/capture_incident/secrets.env && \
  node scripts/capture_incident_snapshot.js --incident-id 1234 --dry-run )
```

### API keys

| Env var                   | Cluster  | Purpose                                                                         |
| ------------------------- | -------- | ------------------------------------------------------------------------------- |
| `INCIDENT_KIBANA_API_KEY` | Incident | ES `read` on rootly/pagerduty + Console (Dev Tools) access                      |
| `OVERVIEW_KIBANA_API_KEY` | Overview | Agent Builder converse (Kibana `base: ["all"]` + ES `monitor` + `read`)         |
| `OVERVIEW_API_KEY`        | Overview | probe + remote reindex source key (`cluster: ["monitor"]` + `read` on `logs-*`) |

Create each in the relevant cluster's Kibana **Dev Tools** with the internal route
(`POST kbn:/internal/security/api_key`, NOT `/api/...`). The incident key needs ES
`read` + `view_index_metadata` on `rootly_incidents*` / `pagerduty_incidents*` plus
`dev_tools: ["all"]`. The overview key(s) need Kibana `base: ["all"]` (Agent Builder
converse also gets + executes the LLM connector) plus ES `monitor` + `read`. A plain
ES API key has no Kibana privilege and will 401 on `converse`, so create the overview
Kibana key through Kibana.

Prerequisites:

- The Overview cluster has **Agent Builder enabled** with the `elastic-ai-agent`
  agent + an `.inference` connector (Enterprise/trial license).
- The Overview `source.host` is in the local ES `reindex.remote.whitelist`.

## Prerequisites (both modes)

### 1. A scoped, read-only API key on the source (Overview)

The remote reindex needs `cluster: ["monitor"]` (for the reindex compatibility
check) + `read` on the target index pattern:

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

Set it as `OVERVIEW_API_KEY` in `secrets.env`.

### 2. A local Elasticsearch with remote reindex + GCS enabled

`reindex.remote.whitelist` is a **static** setting (config-file or `-E` only;
requires a restart). The `--secure-files` path must be **absolute**.

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
  --dry-run

# Real run (manual config).
node scripts/capture_incident_snapshot.js --config ./my-incident.yml

# Real run (auto).
node scripts/capture_incident_snapshot.js --incident-id 1234
```

### Flags

| Flag            | Required | Description                                                          |
| --------------- | -------- | -------------------------------------------------------------------- |
| `--incident-id` | \*\*     | Investigate, write `<id>.incident.yml`, and capture from it          |
| `--config`      | \*\*     | Path to a hand-written incident config file (`.yml`/`.yaml`/`.json`) |
| `--dry-run`     | no       | Validate + print request bodies without mutating anything            |

\*\* Provide exactly one of `--incident-id` (auto) or `--config` (manual).

## Config file

See [`example.incident.yml`](./example.incident.yml). Both JSON and YAML are
accepted. Every config carries two queries, **both plain Query DSL** (the remote
`_reindex` accepts Query DSL only, not ES|QL):

- **`query.symptom`** — a narrow query that locates the incident. Stored only, NOT
  snapshotted; replay it against the restored index to isolate the error lines.
- **`query.snapshot`** — the broad query that IS reindexed and snapshotted (noise
  included). Scope it by an **entity key present in every dataset** (e.g.
  `serverless.project.id`, a k8s namespace, or a node/pod name) so the capture spans
  all `logs-*` datasets that entity emitted. Omit it (or `{}`) to capture the whole
  `source.index` within `timeRange`.

Both are combined with `query.timeRange` automatically (wrapped in a `bool.filter`
with the `@timestamp` range), so don't repeat the time range inside them.

There is no `dest` block: each doc is reindexed into a local index named after its
**original source data stream** (`.ds-logs-elasticsearch.server-default-…` ->
`logs-elasticsearch.server-default`); non-data-stream sources keep their own name.
These are plain indices (not real data streams); backing generations are merged and
source templates are not carried over.

### Schema

| Field                              | Required | Description                                                                          |
| ---------------------------------- | -------- | ------------------------------------------------------------------------------------ |
| `incident.id`                      | yes      | Incident id (snapshot name + default GCS base path)                                  |
| `incident.title`                   | yes      | Human-readable title (stored in metadata)                                            |
| `incident.date`                    | yes      | Incident date (stored in metadata)                                                   |
| `incident.slackChannel`            | no       | Slack channel (stored in metadata)                                                   |
| `source.host`                      | yes      | Source Elasticsearch endpoint (must be in `reindex.remote.whitelist`)                |
| `source.index`                     | yes      | One index pattern or a list; broad `clusterAlias:logs-*` recommended                 |
| `source.exclude`                   | no       | Patterns to drop from `source.index` (compiled to `-pattern`)                        |
| `source.cluster`                   | no       | Source cluster alias (provenance metadata)                                           |
| `query.timeRange.gte` / `lt`       | yes      | Time window                                                                          |
| `query.symptom`                    | no       | Query DSL for the narrow probe (stored/replay only)                                  |
| `query.snapshot`                   | no       | Query DSL for the reindexed slice; scope by entity; `{}`/omit = whole `source.index` |
| `snapshot.expectedSymptomDocCount` | no       | Symptom hit count from the probe (informational)                                     |
| `snapshot.expectedDocCount`        | no       | If set, the run fails on a reindexed-count mismatch (TOTAL across captured indices)  |
| `snapshot.gcsBasePath`             | no       | GCS base path (default: `incidents/incident-<id>`)                                   |
| `snapshot.preserveProvenance`      | no       | Keep original `_index`/cluster on each doc (default `true`)                          |

## Why a reindex is needed

- **CCS** never copies data — it is a live, query-time federation.
- **Snapshot & Restore** only works on physically local indices, so the `_reindex`
  into local ES is unavoidable.
- `_reindex`'s `source.remote` connects over plain HTTP(S) directly to the host you
  specify; it does not reuse a registered "remote cluster" alias.

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

To isolate the error lines after restore, run the manifest's `symptom_query`
against the restored indices.

## Files

| File                                                           | Purpose                                                                 |
| -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [`constants.ts`](./constants.ts)                               | GCS bucket / ES repo name, cluster endpoints                            |
| [`incident_config.ts`](./incident_config.ts)                   | Config schema (zod), JSON/YAML loader, query + YAML builders            |
| [`incident_agent_client.ts`](./incident_agent_client.ts)       | Thin client for `POST /api/agent_builder/converse/async` (logs cluster) |
| [`incident_metadata_client.ts`](./incident_metadata_client.ts) | Thin `_search` client for reading rootly/pagerduty (incident cluster)   |
| [`incident_investigate.ts`](./incident_investigate.ts)         | Step 1 rootly/pagerduty read + step 2 log-grounded symptom derivation   |
| [`incident_probe.ts`](./incident_probe.ts)                     | Overview source probe (confirm entity + count) via Query DSL aggs       |
| [`incident_autoconfig.ts`](./incident_autoconfig.ts)           | `--incident-id` orchestrator (investigate → probe → build config)       |
| [`incident_gcs.ts`](./incident_gcs.ts)                         | GCS repo registration, snapshot-with-metadata, manifest upload          |
| [`incident_snapshot.ts`](./incident_snapshot.ts)               | Orchestration (prereq → reindex → verify → snapshot → manifest)         |
| [`index.ts`](./index.ts)                                       | CLI entry (flags + ES client)                                           |
| [`example.incident.yml`](./example.incident.yml)               | Copy-paste config template                                              |

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
