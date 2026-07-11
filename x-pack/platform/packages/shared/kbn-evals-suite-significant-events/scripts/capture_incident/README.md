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

One incident == one snapshot. Run the command once per incident.

## Two ways to run

- **Auto (`--incident-id`)** — give just an incident id. The script asks the
  platform-logging cluster's **Agent Builder** to investigate the incident (look
  it up in `rootly_incidents`, cross-reference PagerDuty, surface the Slack/Drive
  links) and return the portable derivation: the time window, a symptom
  `query_string`, the affected entity, and the region. It then **confirms** that
  entity against the Overview source cluster and computes the expected doc counts,
  **writes `<id>.incident.yml`**, and runs the capture by reading that file back.
- **Manual (`--config`)** — hand-write (or edit an auto-generated) config file and
  pass it via `--config`. See [`example.incident.yml`](./example.incident.yml).

Both modes ultimately run from a config file on disk — auto mode just generates
that file first, so the derived `<id>.incident.yml` is the single source of truth
for the run (inspect or tweak it, then re-run with `--config` if needed).

Two clusters are involved and they are different:

| Role          | Cluster                            | Used for                                              |
| ------------- | ---------------------------------- | ----------------------------------------------------- |
| Investigation | platform-logging (GCP us-central1) | Agent Builder + `rootly_incidents` lookup             |
| Source        | Overview                           | the remote `_reindex` source + the confirmation probe |

The agent runs on a different cluster than the reindex pulls from, so `source.host`
and the doc counts are resolved against Overview, never taken from the agent.

How the config is derived (generic, incident-agnostic):

- The agent returns the incident's **portable symptom** (a specific `query_string`
  of documented error phrases), the **region**, and which **entity field** to scope
  by (`host.name` / `serverless.project.id` / `kubernetes.pod.name`) — never
  concrete entity values, since those are cluster-specific.
- The Overview probe then, against the real source: finds the symptom's first/last
  timestamps and sets `query.timeRange = [first - 1h, last + 1h]`; discovers the
  affected entity values from the symptom hits and builds the broad
  `query.snapshot` (`terms` on the entity field); and drops **oversized /
  low-signal datasets** that do not carry the symptom (GC logs, proxy/access noise,
  bootstrap logs, or a runaway dominant dataset) into `source.exclude`, so the
  snapshot keeps meaningful noise without ballooning. `expectedDocCount` reflects
  the post-exclude total.

### Auto-mode usage

Copy [`secrets.env.example`](./secrets.env.example) to `secrets.env` and fill it
in. To load it only for this one command (without leaving the variables in your
shell), run it in a subshell — the `( … )` exports vanish when the command exits:

```bash
( source x-pack/platform/packages/shared/kbn-evals-suite-significant-events/scripts/capture_incident/secrets.env && \
  node scripts/capture_incident_snapshot.js --incident-id 1234 --dry-run )
```

### Auto-mode configuration

The cluster endpoints (the Agent Builder cluster, the Overview source cluster,
and the local ES) are **pinned in [`constants.ts`](./constants.ts)** and cannot be
overridden by env vars or flags. Only the API keys come from the environment (copy
[`secrets.env.example`](./secrets.env.example) to `secrets.env`, fill it in, and
`source` it). There are no auto-mode flags — each Agent Builder cluster picks its
own default connector.

Auto mode uses TWO Agent Builder clusters: the **incident** cluster
(`rootly_incidents`) supplies the incident metadata, and the **logs** (Overview)
cluster derives + verifies the symptom against the real logs.

| Env var                | Purpose                                                                        |
| ---------------------- | ------------------------------------------------------------------------------ |
| `AGENT_KIBANA_API_KEY` | INCIDENT cluster Agent Builder key (`agentBuilder:read`) — rootly metadata     |
| `LOGS_KIBANA_API_KEY`  | LOGS cluster Agent Builder key (`agentBuilder:read`) — log-grounded symptom    |
| `OVERVIEW_ES_API_KEY`  | Overview/logs ES probe key (falls back to `OVERVIEW_API_KEY`)                  |
| `OVERVIEW_API_KEY`     | Source key for the remote reindex (`cluster:["monitor"]` + `read` on `logs-*`) |

To point at different clusters, edit the `AGENT_KIBANA_URL`, `LOGS_KIBANA_URL`,
`OVERVIEW_ES_URL`, and `LOCAL_ES_URL` constants in [`constants.ts`](./constants.ts).

Auto-mode prerequisites (in addition to the manual-mode ones below):

- Both the incident cluster and the logs (Overview) cluster have **Agent Builder
  enabled** with the `elastic-ai-agent` agent + an inference connector, on an
  Enterprise/trial license.
- The Overview `source.host` is in the local ES `reindex.remote.whitelist`.

### Creating the API keys

There are three API-key variables to fill in, across two deployments:

- `AGENT_KIBANA_API_KEY` — the **incident** cluster (its own deployment).
- `LOGS_KIBANA_API_KEY`, `OVERVIEW_ES_API_KEY`, `OVERVIEW_API_KEY` — the **logs /
  Overview** cluster. Its Kibana (`overview.elastic-cloud.com`) is the Agent Builder
  endpoint and its Elasticsearch (`...found.io`) is the reindex source + probe —
  **the same deployment**.

Even on that one deployment you need **two different privilege types**, so you
cannot reuse a plain Elasticsearch key for everything:

| Use                                                                    | Called on     | Privilege needed                                 |
| ---------------------------------------------------------------------- | ------------- | ------------------------------------------------ |
| Agent Builder `converse` (`LOGS_KIBANA_API_KEY`)                       | Kibana        | **Agent Builder: Read** Kibana feature privilege |
| Probe + remote `_reindex` (`OVERVIEW_ES_API_KEY` / `OVERVIEW_API_KEY`) | Elasticsearch | `cluster: ["monitor"]` + `read` on `logs-*`      |

A plain ES API key (like the `OVERVIEW_*` key you may already have) has NO Kibana
feature privilege, so it 401s on `converse`. You have two options:

Option 1 — recommended (keep your ES key, add one Kibana key). Keep the existing
`OVERVIEW_ES_API_KEY` / `OVERVIEW_API_KEY` (the ES key), and create a separate
Kibana key for `LOGS_KIBANA_API_KEY`.

Option 2 — one combined key for all three logs-cluster vars. Create a single key
through Kibana's API that carries BOTH privilege types (only a Kibana-created key
can), then set all three logs-cluster vars to it.

#### Create a Kibana Agent-Builder key (incident cluster, and logs cluster for Option 1)

`converse` needs more than the `agentBuilder` privilege:

- It persists the conversation (Agent Builder **write**) and must **get + execute
  the LLM connector** (the _Actions and Connectors_ feature). A read-only key 403s
  with `Unauthorized to get actions`.
- The only LLM connectors on these clusters are `.inference` type, so routing the
  model does `cluster:monitor/xpack/inference/get` — that needs ES **`monitor`**
  (else `action [cluster:monitor/xpack/inference/get] is unauthorized`).
- The agent's search/ES|QL tools read `rootly_incidents` / `pagerduty_incidents`
  AND fetch their mappings (`indices:admin/mappings/get`, to generate ES|QL), so
  the key needs ES **`read` + `view_index_metadata`** (plain `read` alone fails
  with `action [indices:admin/mappings/get] is unauthorized`).

Feature-scoping every dependency is fiddly, so for a short-lived eval key just
grant Kibana `base: ["all"]` + ES `monitor` and `read`. The **same recipe works on
both clusters** — run it once per cluster.

UI: on that cluster's Kibana, **Stack Management → API keys → Create API key** →
enable **Control security privileges** → grant Kibana **All** and ES cluster
`monitor` + `read` on indices. Copy the **Base64 / `encoded`** value.

Or in that cluster's Kibana **Dev Tools** — the `kbn:` prefix calls Kibana's own
APIs (and sends the internal-origin header). Note this is an INTERNAL route
(`/internal/security/api_key`), NOT `/api/...` (that path 404s):

```
POST kbn:/internal/security/api_key
{
  "name": "incident-agent-reader",
  "expiration": "30d",
  "kibana_role_descriptors": {
    "incident-agent-reader": {
      "elasticsearch": {
        "cluster": ["monitor"],
        "indices": [ { "names": ["*"], "privileges": ["read", "view_index_metadata"] } ]
      },
      "kibana": [ { "base": ["all"], "feature": {}, "spaces": ["*"] } ]
    }
  }
}
```

Set the incident cluster's key as `AGENT_KIBANA_API_KEY`, and (Option 1) the logs
cluster's key as `LOGS_KIBANA_API_KEY`.

#### Create one combined key for the logs cluster (Option 2)

Run against the **logs / Overview** cluster's Kibana; the same key gets Kibana
`base: ["all"]` (Agent Builder converse needs Agent Builder write + _Actions and
Connectors_ execute — see the note above) plus ES `monitor` + `read` on ALL
indices (local and, via `remote_indices`, the CCS remotes the reindex federates to
— so index resolution never trips on a non-`logs-*` alias/placeholder). Narrow
`"*"` to `"logs-*"` if you prefer least-privilege on the ES side:

```
POST kbn:/internal/security/api_key
{
  "name": "incident-logs-reader",
  "expiration": "30d",
  "kibana_role_descriptors": {
    "incident-logs-reader": {
      "elasticsearch": {
        "cluster": ["monitor"],
        "indices": [ { "names": ["*"], "privileges": ["read", "view_index_metadata"] } ],
        "remote_indices": [ { "clusters": ["*"], "names": ["*"], "privileges": ["read", "view_index_metadata"] } ]
      },
      "kibana": [ { "base": ["all"], "feature": {}, "spaces": ["*"] } ]
    }
  }
}
```

Copy the `encoded` value and set all three logs-cluster vars to it:

```bash
# in scripts/capture_incident/secrets.env
export LOGS_KIBANA_API_KEY="<the encoded value>"
export OVERVIEW_ES_API_KEY="<the encoded value>"
export OVERVIEW_API_KEY="<the encoded value>"
```

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

Add it to your `secrets.env` (preferred over putting it in the config file):

```bash
# in scripts/capture_incident/secrets.env
export OVERVIEW_API_KEY="<the-api-key>"
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

The local Elasticsearch the reindex + snapshot run against is pinned by the
`LOCAL_ES_URL` constant in [`constants.ts`](./constants.ts) (with credentials in
the URL). Edit that constant to target a different local ES.

```bash
# Dry run: validate config + prerequisites, print request bodies, no mutations.
node scripts/capture_incident_snapshot.js \
  --config x-pack/platform/packages/shared/kbn-evals-suite-significant-events/scripts/capture_incident/example.incident.yml \
  --dry-run

# Real run.
node scripts/capture_incident_snapshot.js --config ./my-incident.yml
```

The source API key for the remote reindex comes from `OVERVIEW_API_KEY`
(preferred) or `source.apiKey` in the config.

### Flags

| Flag            | Required | Description                                                           |
| --------------- | -------- | --------------------------------------------------------------------- |
| `--incident-id` | \*\*     | Investigate via Agent Builder, write `<id>.incident.yml`, and capture |
| `--config`      | \*\*     | Path to a hand-written incident config file (`.yml`/`.yaml`/`.json`)  |
| `--dry-run`     | no       | Validate + print request bodies without mutating anything             |

\*\* Provide exactly one of `--incident-id` (auto) or `--config` (manual). Cluster
endpoints are pinned in `constants.ts` and API keys come from environment
variables (see above). See `node scripts/capture_incident_snapshot.js --help`.

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
| `snapshot.gcsBasePath`             | no       | GCS base path (default: `incidents/incident-<id>`)                                            |
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

| File                                                     | Purpose                                                           |
| -------------------------------------------------------- | ----------------------------------------------------------------- |
| [`constants.ts`](./constants.ts)                         | GCS bucket / ES repo name, env var names, Agent Builder constants |
| [`incident_config.ts`](./incident_config.ts)             | Config schema (zod), JSON/YAML loader, query + YAML builders      |
| [`incident_agent_client.ts`](./incident_agent_client.ts) | Thin client for `POST /api/agent_builder/converse`                |
| [`incident_investigate.ts`](./incident_investigate.ts)   | Agent prompt + parse/validate of the derived capture spec         |
| [`incident_probe.ts`](./incident_probe.ts)               | Overview source probe (confirm entity + count) via Query DSL aggs |
| [`incident_autoconfig.ts`](./incident_autoconfig.ts)     | `--incident-id` orchestrator (investigate → probe → build config) |
| [`incident_gcs.ts`](./incident_gcs.ts)                   | GCS repo registration, snapshot-with-metadata, manifest upload    |
| [`incident_snapshot.ts`](./incident_snapshot.ts)         | Orchestration (prereq → reindex → verify → snapshot → manifest)   |
| [`index.ts`](./index.ts)                                 | CLI entry (flags + ES client) for the command                     |
| [`example.incident.yml`](./example.incident.yml)         | Copy-paste config template                                        |

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
