# Streams Development Guide

This document explains how to develop Streams V2 — unit-scoped map, YAML unit model, and the Kibana unit APIs.

Legacy wired / classic / query streams are documented in [`LEGACY_DEVELOPMENT.md`](./LEGACY_DEVELOPMENT.md).

Also consult the [streams-spec](https://github.com/elastic/streams-spec/tree/main/docs) repo for up to date ADRs, the official schema etc.

## Feature flags

Two layers of flags exist. **Kibana config** (`kibana.dev.yml`) is evaluated at server start. **Advanced Settings** (`uiSettings`) are per-space and some of them are UI-readonly, so they must be set via `uiSettings.overrides` rather than the Advanced Settings page.

### Kibana config (`kibana.dev.yml`)

```yaml
# Registers the Map saved object types. Required for unit GET/PUT.
# Restart Kibana after changing it.
xpack.streams.canvas.enabled: true

# Required: unit PUT returns 503 without a distributor. The distributor Tilt
# writes these to streams-config-distributor/.tilt/kibana/kibana.dev.yml.snippet.
xpack.streams.distributor.url: "https://localhost:18443"
xpack.streams.distributor.ssl.certificate: /path/to/streams-config-distributor/.tilt/kibana/client.crt
xpack.streams.distributor.ssl.key: /path/to/streams-config-distributor/.tilt/kibana/client.key
xpack.streams.distributor.ssl.certificateAuthorities: /path/to/streams-config-distributor/.tilt/kibana/ca.crt
# Needed only to publish units with secrets. See "Credentials".
xpack.streams.encryptionKey.path: /tmp/streams-encryption-key

uiSettings.overrides:
  observability:streamsEnableCanvas: true
```

To run the distributor and the rest of the backend locally, follow [dev/full_dev_flow/README.md](./dev/full_dev_flow/README.md).

`xpack.streams.canvas.enabled` and `observability:streamsEnableCanvas` are **not** interchangeable:

| Flag | What it actually gates |
| --- | --- |
| `xpack.streams.canvas.enabled` | Saved object **registration** for `streams-configuration` and `streams-ui-metadata` ([Scenario B WIP](https://www.elastic.co/docs/extend/kibana/key-concepts/saved-objects/validate#saved-objects-wip-types-scenario-b)). |
| `observability:streamsEnableCanvas` | Unit HTTP APIs (`GET`/`PUT`/`POST …/_reset` on `/internal/streams/unit/{id}`), the component catalogue APIs (`GET /internal/streams/components`, `POST /internal/streams/components/_validate`) and the Map UI. |

You need both on for a working local Map. If only the uiSetting is on, the APIs return 404-style "not enabled" or fail when writing because the types were never registered.

### Advanced Settings (`uiSettings`)

Registered in `server/feature_flags.ts`. All `requiresPageReload: true`.

| Setting | Default | UI-editable | Purpose |
| --- | --- | --- | --- |
| `observability:streamsEnableCanvas` | `false` | No (`readonlyMode: ui`) | New Streams Map + unit APIs |

Settings marked UI-readonly can only be turned on through `uiSettings.overrides` in `kibana.yml` / `kibana.dev.yml`.

## Access via URL

With the feature flags enabled you can then access V2 via `/app/streams/new-experience/map`. `/app/streams` redirects there for a user with V2 access (see "Privileges").

## Privileges

1. **Kibana feature privileges** (Streams V2 `read` / `all`) gate every V2 route and the V2 UI.
2. **The user's Elasticsearch privileges** apply where Kibana calls Elasticsearch as the user: destination indices and stats, and minting API keys.
3. **Kibana's own credentials** cover the unit saved objects, the config distributor and key revocation, so the user needs nothing for those.

### Kibana features

| Feature (`kibana.jsonc` id) | Privilege | API privileges | UI capabilities | In base privileges |
| --- | --- | --- | --- | --- |
| Streams (`streams`) | `all` | `read_stream`, `manage_stream` | `show`, `manage` | Yes |
| Streams (`streams`) | `read` | `read_stream` | `show` | Yes |
| Streams V2 (`streamsV2`) | `all` | `read_streams_v2`, `manage_streams_v2` | `show`, `manage` | Yes |
| Streams V2 (`streamsV2`) | `read` | `read_streams_v2` | `show` | Yes |

- `streamsV2` exists only when `xpack.streams.canvas.enabled` is `true`.
- Base `all` / `read` include V2 `all` / `read`, so `editor` gets V2 `all`. That's the Kibana side only (see "Known gap: minting keys").
- Granted per space, but the unit is shared, so V2 `all` in any space can edit it.
- In Elasticsearch it is the application privilege `{ "application": "kibana-.kibana", "privileges": ["feature_streamsV2.all"], "resources": ["*"] }`. Use `space:<id>` for one space and `feature_streamsV2.read` for read.
- The data stream stats routes (`/internal/streams/doc_counts/*`, `/internal/streams/storage_stats`) accept `read_stream` or `read_streams_v2`. Other legacy routes need `read_stream` / `manage_stream`.
- V2 access means `streamsV2.show` plus `observability:streamsEnableCanvas` on in the space. It decides the nav entry and whether `/` redirects to `/new-experience/{tab}`.
- Without `streamsV2.manage`, the Map and the Sources and Destinations tables are read-only.

### What each V2 request needs

"As Kibana" calls need nothing from the user. Index privileges are on the destination targets (see "Destination targets").

| Request | Kibana API privilege | Kibana calls | The user's Elasticsearch privileges |
| --- | --- | --- | --- |
| `GET /internal/streams/unit/{id}` | `read_streams_v2` | The unit saved object, through an internal client | None |
| `PUT /internal/streams/unit/{id}` | `manage_streams_v2` | The unit saved object, the distributor (Kibana's mTLS client certificate), and `DELETE /_security/api_key` as Kibana for removed components | None |
| `GET /internal/streams/components` | `read_streams_v2` | The distributor | None |
| `POST /internal/streams/components/_validate` | `manage_streams_v2` | The distributor | None |
| `GET /internal/streams/unit/{id}/_resolve_indices` | `read_streams_v2` | `GET /_resolve/index/<destination targets>`, `GET /_data_stream/<names>`, `POST /_security/user/_has_privileges` | `view_index_metadata` on the destination targets (see "Destination targets"). Indices the user can't see are left out. |
| `GET /internal/streams/indices/{name}` | `read_streams_v2` | `GET /_data_stream/<name>`, `GET /<name>`, `POST /_security/user/_has_privileges` | `view_index_metadata`. The response reports `monitor` and `read_failure_store`, which the UI uses to show or hide panels. |
| `POST /internal/streams/unit/{id}/_stats` | `read_streams_v2` | `POST /_query` (ES\|QL) on `metrics-streams.otel-default` | `read` on `metrics-streams.otel-default`. Without it, the stats fail as `forbidden`. |
| `/internal/streams/doc_counts/{total,degraded,failed,ingestion}`, `/internal/streams/storage_stats` | `read_stream` or `read_streams_v2` | `GET /_data_stream`, `_search`, ES\|QL on `<name>::failures`, and `_metering/stats` on Serverless | `view_index_metadata` and `read`, plus `read_failure_store` for failed-document counts |
| `GET /internal/dataset_quality/data_streams/stats` (index page storage and ingestion cards) | None (the route checks Elasticsearch only) | Data stream stats as the user | `monitor`. Data streams without it are left out. |
| ES\|QL through the data plugin (ingest rate charts, index page quality) | None | `POST /_query` as the user | `read`, plus `read_failure_store` for `::failures` |
| `GET /internal/streams/sources/api_keys` | `manage_streams_v2` | The key registry on the unit saved object | None |
| `GET /internal/streams/sources/api_key/privileges`, `POST /internal/streams/destinations/api_key/privileges` | `manage_streams_v2` | `POST /_security/user/_has_privileges` | None: the route reports what is missing |
| `POST /internal/streams/sources/api_key`, `POST /internal/streams/destinations/api_key` | `manage_streams_v2` | `_has_privileges`, then `POST /_security/api_key` as the user | See "API keys" |
| `DELETE /internal/streams/sources/api_key`, `DELETE /internal/streams/destinations/api_key` | `manage_streams_v2` | `DELETE /_security/api_key` as Kibana | None |

Unit saved objects use an internal client that skips the security and spaces extensions, so the route privilege is the only check.

### API keys

Kibana mints keys as the user. Elasticsearch caps a key at its creator's privileges, and a key beyond them is created but never authenticates. So Kibana first runs `_has_privileges` as the user, and the create route answers 403 if that fails. Privileges are snapshotted at mint, so re-create keys after changing a role.

| Key | Kibana passes as `role_descriptors` | The minting user needs | `failure` when missing |
| --- | --- | --- | --- |
| Managed source (`otlp`, `async-bulk`, `prometheus-remote-write`) | `streams` / `write` on `source:<id>` | `manage_own_api_key`, and `streams` / `write` on `source:<id>` | `cluster`, then `source` |
| Direct source (`es-otlp`, `bulk`, `es-prometheus-remote-write`), not in technical preview | `write` and `auto_configure` on `*` | `manage_own_api_key`, and `write` and `auto_configure` on `*` | `cluster`, then `index` |
| Local Elasticsearch destination | `create_doc` and `auto_configure` on the destination's targets (see "Destination targets") | `manage_own_api_key`, and `create_doc` and `auto_configure` on each target | `cluster`, then `index` with `missingPatterns` |

For a managed source `my-otlp`:

```json
POST /_security/user/_has_privileges
{
  "cluster": ["manage_own_api_key"],
  "application": [{ "application": "streams", "privileges": ["write"], "resources": ["source:my-otlp"] }]
}

POST /_security/api_key
{
  "name": "stream-source-my-otlp",
  "role_descriptors": {
    "streams_source_writer": {
      "applications": [{ "application": "streams", "privileges": ["write"], "resources": ["source:my-otlp"] }]
    }
  },
  "metadata": {
    "managed_by": "streams-sources",
    "source_id": "my-otlp",
    "source_type": "otlp",
    "source_resource": "source:my-otlp",
    "streams_unit_id": "default"
  }
}
```

For an Auto destination `es-out` sending every signal (other destinations send their own targets):

```json
POST /_security/user/_has_privileges
{
  "cluster": ["manage_own_api_key"],
  "index": [{ "names": ["logs-*-*", "metrics-*-*", "traces-*-*"], "privileges": ["create_doc", "auto_configure"] }]
}

POST /_security/api_key
{
  "name": "streams-destination-es-out",
  "role_descriptors": {
    "streams_destination": {
      "indices": [{ "names": ["logs-*-*", "metrics-*-*", "traces-*-*"], "privileges": ["create_doc", "auto_configure"] }]
    }
  },
  "metadata": { "managed_by": "streams", "streams_destination_id": "es-out", "streams_unit_id": "default" }
}
```

- **Managed source key:** no Elasticsearch access. Managed Inputs checks it with `_has_privileges` for `streams` / `write` on its own source.
- **Direct source key:** not in technical preview. Broad on purpose until Sources can configure target indices.
- **Destination key:** writes only to its targets. Remote Elasticsearch and S3 use credentials the user enters, so there is no key.
- **On failure:** the source flyout disables "Generate API key" and names the missing privilege. Creating a destination fails and names the missing patterns.
- **Registry:** keys are recorded in the server-only `api_keys` attribute of `streams-configuration`, updated with version-checked partial updates (a `PUT` that sets it gets a 400). A key recorded before the first save creates a `key_only: true` stub, which `GET` treats as 404 and republish skips. A failed first publish also rolls back to a stub.
- **Revocation:** Kibana revokes as itself (`invalidateAsInternalUser`) on the key `DELETE` routes, and on a unit `PUT` that removes the component or changes a destination away from local `elasticsearch`. Creating a destination mints its key and then saves the unit, back to back in the modal, so a `PUT` revokes a key whose component was never saved only once the key is 10 minutes old. Keys that aren't confirmed revoked stay in the registry, and the `PUT` answers `api_keys_may_remain: true`. Every V2 `all` user can list and revoke every key.

### Destination targets

Index privileges are on the targets of a local Elasticsearch destination, which depend on its configuration. The key, `_resolve_indices` and the indices table all use the same targets (`getSignalTargetsWritePatterns` in `@kbn/streams-schema`). For each signal the destination sends, the first of these that is set wins:

1. `index`: that index.
2. `write_patterns`: those patterns.
3. Neither: the Auto pattern `<signal>-*-*`.

| Destination mode in the create form | Unit config per signal | Targets, for example |
| --- | --- | --- |
| Auto, all signals | No `index` and no `write_patterns` | `logs-*-*`, `metrics-*-*`, `traces-*-*` |
| Auto with custom write patterns | `write_patterns`, shaped `<signal>-<dataset>-<namespace>`, where either part may contain `*` | `logs-billing-*` for logs only |
| Static index | `index`, shaped `<signal>-<dataset>-<namespace>` with no wildcards. "All" applies one `<dataset>-<namespace>` to every signal. | `logs-app-default`, `metrics-app-default` |

The create form enforces those shapes. A unit written with the API can contain anything.

- A wildcard target needs a role covering every name it could match. `logs-*` covers `logs-*-*`; `logs-billing-*` doesn't, so that user can't create an Auto destination.
- Grant write (`create_doc`, `auto_configure`) and read (`view_index_metadata`, `read`, `monitor`, `read_failure_store`) on the same names, covering the union of the targets the user manages. Otherwise they can create destinations whose indices they can't see.
- The key covers the targets at the time the destination is created.

### Non-admin V2 managers

`admin` already has everything. No other predefined role can mint keys (see "Known gap: minting keys"), so grant:

| Privilege | What it enables | Without it |
| --- | --- | --- |
| Kibana Streams V2 `all` | Editing the map, and every V2 route | The map is read-only |
| Cluster `manage_own_api_key` | Minting any key | No source or destination key (`failure: 'cluster'`) |
| `streams` / `write` on `source:*` | Managed source keys. Use `source:<id>` to limit the user to specific sources. | No managed source key (`failure: 'source'`) |
| `create_doc`, `auto_configure` on the destination targets | Destination keys | Creating a local Elasticsearch destination fails (`failure: 'index'`) |
| `view_index_metadata` on the destination targets | The destination indices table and the index page | The indices the user can't see are missing |
| `read` on the destination targets | Document counts and ingest rate charts | Empty counts and charts |
| `read` on `metrics-streams.otel-default` | Unit `_stats` on the map | `_stats` fails as `forbidden` |
| `monitor` on the destination targets | Storage size and ingestion cards on the index page | The cards report missing privileges |
| `read_failure_store` on the destination targets | Failed-document counts and data quality | Failed documents and quality show as unknown |

Direct source keys (not in technical preview) would also need `write` and `auto_configure` on `*`.

`logs-*`, `metrics-*` and `traces-*` cover every target the create form can produce, plus `metrics-streams.otel-default`. To narrow a user, use their destinations' targets instead (see "Destination targets") and keep `read` on `metrics-streams.otel-default`.

The `streams` application privilege can only be set with the Elasticsearch role API, because the Kibana role API only writes `kibana-.kibana`. Serverless accepts it since [elasticsearch-serverless#7570](https://github.com/elastic/elasticsearch-serverless/pull/7570). One role, as used by the Scout specs:

```json
PUT /_security/role/streams_v2_manager
{
  "cluster": ["manage_own_api_key"],
  "indices": [
    {
      "names": ["logs-*", "metrics-*", "traces-*"],
      "privileges": ["read", "view_index_metadata", "monitor", "read_failure_store", "create_doc", "auto_configure"]
    }
  ],
  "applications": [
    { "application": "kibana-.kibana", "privileges": ["feature_streamsV2.all"], "resources": ["*"] },
    { "application": "streams", "privileges": ["write"], "resources": ["source:*"] }
  ]
}
```

Alternatively, split it: a Kibana role with `"feature": { "streamsV2": ["all"] }`, plus an Elasticsearch role with the rest. Editing a role in Kibana keeps the `streams` privilege.

To check a user, call these as that user. Both answer `{ "canCreate": true, "failure": "none" }` when the user can mint:

- `GET /internal/streams/sources/api_key/privileges?sourceId=<id>&sourceTypeSlug=otlp`
- `POST /internal/streams/destinations/api_key/privileges` with `{ "patterns": [<destination targets>] }`

### Known gap: minting keys

`editor` gets V2 `all`, so it can edit and save the map, but it can't mint keys. The Serverless role (in `elasticsearch-controller`, mirrored in `kbn-es/src/serverless_resources/project_roles/<type>/roles.yml`) has:

- no `manage_own_api_key` (Observability cluster privileges are `read_project_routing` and `monitor_inference`);
- no `streams` application privilege;
- index `read` only.

#### Managed source keys

These need the same grant in every project (`manage_own_api_key`, `streams` / `write` on `source:*`), so a predefined fix is possible after technical preview:

1. **Add them to `editor`** in `elasticsearch-controller`, and mirror the change in `kbn-es`. Cluster privileges can't be scoped, so every editor could create API keys of any kind through Elasticsearch. Those keys are capped at the editor's privileges, but they can outlive the editor's access. This needs security and controller sign-off.
2. **Mint as `kibana_system`**, as revocation already does. V2 `all` becomes the only gate. `kibana_system` needs `streams` / `write` on `source:*`, an Elasticsearch change like [elasticsearch#155890](https://github.com/elastic/elasticsearch/pull/155890), and Kibana must record the requesting user. This is the "provisioning service mints" option in [ingest-dev#9168](https://github.com/elastic/ingest-dev/issues/9168).

#### Destination and direct source keys

These need write on the specific indices they target. Those are open-ended (any pattern once `_bulk` support lands, and `*` today for direct sources) and differ per customer, so a predefined grant can't name them in advance. It would have to be write on `*`:

- **On `editor`:** every editor could write to every index.
- **On `kibana_system`, minting as Kibana:** keys are no longer capped at the user's privileges. Any V2 `all` user, which includes every editor, could write anywhere. Checking as the user first still leaves Kibana as the only safeguard.

So these keys stay capped at the user's own index privileges. Non-admin managers need a custom role granting write on their specific indices (see "Non-admin V2 managers").

## Map saved objects (WIP)

`streams-configuration` and `streams-ui-metadata` are work-in-progress types registered **conditionally** ([Scenario B](https://www.elastic.co/docs/extend/kibana/key-concepts/saved-objects/validate#saved-objects-wip-types-scenario-b)): only when `xpack.streams.canvas.enabled` is `true`. They are absent from Serverless / CI / production while the flag stays off, so model version 1 can still change.

Important consequences:

- Types are `hidden: true`. They do **not** appear in Stack Management → Saved Objects.
- Both types are `namespaceType: 'multiple'` and are written with `initialNamespaces: ['*']`, so every space sees the same unit. That matches config-distributor `PUT /v1/units/default` (one unit per cluster). `multiple-isolated` would hide the object from other spaces while still using a globally unique id, so a second space would 404 then collide.
- Only `unit_id` is mapped (`keyword`). The configuration saved object id is the unit id (`default` in v1). Do not add mappings unless you actually need to filter/sort on that field; mappings cannot be removed later.
- `streams-configuration` is an Encrypted Saved Object. `secrets` is encrypted at rest. `unit_id` and `sealed_credentials` are in AAD, so the cache stays readable but is authenticated: editing or swapping a cached blob makes `secrets` fail to decrypt, and the next save fails before anything is sent. `unit` is **not** in AAD (canvas edits would re-encrypt on every save). Always overwrite the full document, and do not `soClient.update` encrypted or AAD attributes. The one exception is `api_keys` (neither encrypted nor in AAD), which is updated on its own (see "API keys").
- v1 uses a single unit id: `default` (`STREAMS_DEFAULT_UNIT_ID`).
- Unit PUT order: seal credentials → distributor validate → configuration SO → distributor publish → UI metadata. A validation failure writes nothing. A publish failure rolls back the configuration SO (including decrypted `secrets` and `sealed_credentials`).
- `streams:republish-units` re-sends every stored unit every 30 minutes and re-seals after a key rotation. See "Republish and key rotation".
- Without `xpack.streams.distributor.url`, unit PUT fails with a 503 ("streams-config-distributor URL is not configured"). There is no offline mode.
- PUT requires `xpack.encryptedSavedObjects.encryptionKey` (`canEncrypt`). Dev mode configures a static key automatically.

### Credentials

Plaintext secrets live in the configuration SO `secrets` map (`{ "<name>": "<value>" }`), never inside `unit`. The unit references a credential by name with a config value of exactly `{ "credential": "<name>" }`, as the streams-spec credential contract defines. A plain string value is never a reference.

Names follow the unit identifier grammar (`^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`, at most 256 characters). The same name is the reference, the key in `secrets`, and the `credentials[].name` sent to the distributor. The UI convention is `<nodeId>-<field>` with `_` turned into `-`, for example `s3-archive-secret-access-key`. That convention can collide (`a-b` + `c` and `a` + `b_c` both give `a-b-c`), so the UI must check before saving. Two nodes that reference the same name share one secret. The S3 destination modal is the first client sender: it writes `{ credential: <id>-access-key-id }` and `{ credential: <id>-secret-access-key }` into the node and sends both plaintext values in `secrets` on the same PUT.

The remote Elasticsearch destination modal does the same with one key: it writes `{ credential: <id>-api-key }` into the node and sends the user's key in `secrets`. Kibana never mints or revokes that key.

A JSON envelope that stores a secret references it from the node and sends the value next to the unit:

```json
{
  "unit": {
    "destinations": [
      {
        "id": "es-1",
        "type": "elasticsearch",
        "supported_telemetry": ["logs"],
        "config": [{ "name": "api_key", "value": { "credential": "es-1-api-key" } }]
      }
    ]
  },
  "secrets": { "es-1-api-key": "<plaintext>" }
}
```

| Layer | What is stored |
| --- | --- |
| Unit YAML / `unit` attribute | `{ credential: <name> }` reference only |
| SO `secrets` (ESO) | Plaintext, encrypted at rest with Kibana's ESO key |
| SO `sealed_credentials` (plain, in ESO AAD) | `{ name, target, ciphertext }` from the last save, reused while nothing changed |
| Distributor `PUT /v1/units/{id}` and `POST /v1/units/validate` | Authored `unit_yaml` + `credentials: [{ name, ciphertext }]` |

`GET /internal/streams/unit/{id}` omits `secrets` and `sealed_credentials`. Canvas saves that omit `secrets` keep the stored bag. A PUT that includes `secrets` **merges** those keys onto what is stored instead of replacing them, because the UI only sends newly entered values.

Only top-level config entries of sources, processors, and destinations are scanned for references. A PUT fails with 400 when its `secrets` contains a name nothing references, or when a reference has neither a request nor a stored secret. Stored secrets and their blobs that are no longer referenced are dropped on every PUT.

Each `ciphertext` is `v1.<kid>.<iv>.<ct>`. `kid` names the key from `current-kid` in `xpack.streams.encryptionKey.path` (the mount of the project-controller `streams-encryption-key` Secret). `iv` is 12 random bytes and `ct` is the AES-256-GCM ciphertext with its 16-byte tag, both base64url without padding. The AAD is the UTF-8 `target_id`, which Kibana reads from the DNS SAN of `xpack.streams.distributor.ssl.certificate` exactly as the distributor does, so a blob only opens for the target it was sealed for.

Kibana seals once per save and sends the same `credentials` to validate and publish. It reuses a stored blob while its kid, target and plaintext are unchanged (re-sending the same value counts as unchanged), so a no-op save keeps `config_hash` and does not roll the collector. `config_hash` follows the distributor docs: SHA-256 of the YAML bytes, plus a newline and the JSON array of `[name, ciphertext]` pairs sorted by name when there are credentials.

A save with secrets fails with 503, and nothing is written, when:

- `xpack.streams.encryptionKey.path` is not set,
- `current-kid` is unreadable or not in the kid grammar (`^[A-Za-z0-9_-]{1,64}$`),
- something has to be sealed (new or changed value, new kid or target) and its key file is missing or not 32 bytes,
- no `target_id` resolves: the client certificate has no supported SAN, or no certificate is configured and `xpack.cloud.serverless.project_id` is not set.

To get a local key directory:

```bash
KID="$(date -u +%Y%m%d_%H%M%S)_$(openssl rand -hex 4)"
mkdir -p /tmp/streams-encryption-key
printf '%s' "$KID" > /tmp/streams-encryption-key/current-kid
openssl rand 32 > "/tmp/streams-encryption-key/streams-encryption-key.$KID"
```

Without a client certificate (a local fake distributor), set `xpack.cloud.serverless.project_id` explicitly in `kibana.dev.yml` (identifier grammar, at most 32 bytes). The UIAM dev path in `src/cli/serve/serve.js` defaults it to `abcdef12345678901234567890123456`, but not every local start goes through that path.

The distributor's main branch ignores `credentials` on validate and cannot compile `{ credential }` references yet, so a local tilt run with a reference fails validation until the backend catches up (ingest-dev#9480).

#### Republish and key rotation

The task type `streams:republish-units` is always registered. When `xpack.streams.canvas.enabled` and `xpack.streams.distributor.url` are both set, it runs every 30 minutes and once after Kibana starts. Otherwise Kibana removes the scheduled task on start, and a run that still starts does nothing. For each stored unit it runs the same credential preparation as a save, with the stored secrets as input.

- Same kid and target: the stored blobs are reused and the task only sends `PUT /v1/units/{id}` again, without validate or an SO write. The distributor answers `unchanged`. This is the periodic re-issue the distributor expects, and it recreates a missing `StreamUnit`.
- New kid, or new target (read from the client certificate at startup): the task re-seals, validates, writes the SO with the version it read, and publishes. If the PUT fails, times out or Kibana stops, the re-seal stays and the next run only sends the PUT. A rollback would roll the collector twice when a timed-out PUT was in fact applied.
- Right before the PUT the task reads the version again. If a user save landed in between, it skips the unit.
- Errors are logged per unit, and the next run is the retry. A missing or unreadable key, an unset `xpack.streams.encryptionKey.path` or a missing target id (all 503) is logged at error, because only an operator can fix it. So is a document from an earlier build whose cached blobs are not in the AAD, which keeps failing until `POST /internal/streams/unit/<id>/_reset`. Distributor and network errors are logged at warn, and a request cut off by a stop or timeout at debug.

A save can still race a task PUT in either direction. The distributor briefly holds the older unit, or the save gets a 409 from the distributor and rolls back. Every run sends the stored document again, so the distributor converges on the next sweep. An ordering token on the PUT is a spec follow-up.

The task uses `getUnsafeInternalClient`, which keeps the encrypted saved objects extension, so a re-seal stores `secrets` encrypted.

To check a rotation locally, write a new key file, then point `current-kid` at it:

```bash
KID2="$(date -u +%Y%m%d_%H%M%S)_$(openssl rand -hex 4)"
openssl rand 32 > "/tmp/streams-encryption-key/streams-encryption-key.$KID2"
printf '%s' "$KID2" > /tmp/streams-encryption-key/current-kid
```

Restart Kibana or wait for the next run. The log shows `Re-sealed credentials of Streams unit [default] and republished it`.

### Reset map saved objects

Dev only. These types are `hidden: true`, so they do not appear in Stack Management and Cloud Console cannot search `.kibana`. Reset through the unit API:

```
POST kbn:/internal/streams/unit/default/_reset
```

That revokes every API key in the unit's registry, then deletes the configuration and UI metadata saved objects (shared by every space). `GET kbn:/internal/streams/unit/default` then 404s until the next PUT, which creates a fresh pair. Idempotent if nothing is stored. Does not notify config-distributor. Requires V2 manage.

## Unit APIs

`PUT /internal/streams/unit/{id}` accepts two content types:

| `Content-Type` | Body |
| --- | --- |
| `application/json` | `{ unit, ui_metadata, secrets? }` envelope (Map / Dev Tools). |
| `application/yaml` (also `text/yaml`, `application/x-yaml`) | The authored unit document itself (`sources` / `destinations` / `pipelines`). Do **not** wrap it in `{ unit: … }` and do **not** jsonify it first. YAML cannot set `ui_metadata` or `secrets`; stored map layout and secrets are kept (stale node metadata is still pruned). |

A successful PUT returns `{ acknowledged: true }`. When config-distributor validate succeeds and includes compiled OpenTelemetry collector YAML, the response also has `compiled_config`. Without `xpack.streams.distributor.url`, the PUT fails with 503 and nothing is stored. If the unit published but the canvas layout write failed, the response includes `ui_metadata_not_persisted: true`.

### JSON envelope (Map)

```
PUT kbn:/internal/streams/unit/default
Content-Type: application/json
{
  "unit": {
    "sources": [
      { "id": "otlp-input", "type": "otlp", "supported_telemetry": ["logs", "traces"] }
    ],
    "processors": [
      {
        "id": "add-environment-tag",
        "type": "add_fields",
        "supported_telemetry": ["logs", "traces"],
        "config": [
          {
            "name": "fields",
            "value": [
              {
                "action": "upsert",
                "location": "resource",
                "path": "attributes[\"env\"]",
                "value": "prod"
              }
            ]
          }
        ]
      }
    ],
    "destinations": [
      { "id": "debug-out", "type": "debug", "supported_telemetry": ["logs", "traces"] }
    ],
    "pipelines": [
      {
        "id": "main",
        "supported_telemetry": ["logs", "traces"],
        "config": [
          { "name": "sources", "value": ["otlp-input"] },
          { "name": "processors", "value": ["add-environment-tag"] },
          { "name": "destinations", "value": ["debug-out"] }
        ]
      }
    ]
  },
  "ui_metadata": {
    "nodes": {
      "otlp-input": { "x": 0, "y": 0 },
      "add-environment-tag": { "x": 240, "y": 0 },
      "debug-out": { "x": 480, "y": 0 },
      "stale-node": { "x": 999, "y": 999 }
    }
  }
}

GET kbn:/internal/streams/unit/default

POST kbn:/internal/streams/unit/default/_reset
```

### YAML unit document (`curl`)

Internal routes need `kbn-xsrf` and `x-elastic-internal-origin`. Set `Content-Type: application/yaml` and send the file with `--data-binary` (not `-d`, which urlencodes).

Kibana does not insert a default unit yet. Seed a local environment with a source, destination, and pipeline by putting `good-unit.yaml`. Otherwise you'll get an error about the unit not containing the three of these things:

```yaml
sources:
  - id: nop-input
    type: nop
    supported_telemetry: [logs]
destinations:
  - id: debug-out
    type: debug
    supported_telemetry: [logs]
pipelines:
  - id: main
    supported_telemetry: [logs]
    config:
      - name: sources
        value: [nop-input]
      - name: destinations
        value: [debug-out]
```

`broken-unit.yaml` (unknown destination type — distributor 400 when URL is set):

```yaml
sources:
  - id: nop-input
    type: nop
    supported_telemetry: [logs]
destinations:
  - id: es-prod
    type: elasticsearch
    supported_telemetry: [logs]
pipelines:
  - id: main
    supported_telemetry: [logs]
    config:
      - name: sources
        value: [nop-input]
      - name: destinations
        value: [es-prod]
```

```bash
# Expect 400 + distributor diagnostics
curl -sS -X PUT "$KIBANA_URL/internal/streams/unit/default" \
  -u elastic_serverless:changeme \
  -H 'kbn-xsrf: true' \
  -H 'x-elastic-internal-origin: kibana' \
  -H 'Content-Type: application/yaml' \
  --data-binary @broken-unit.yaml

# Expect 200 `{ "acknowledged": true, "compiled_config": "..." }` when distributor is configured
curl -sS -X PUT "$KIBANA_URL/internal/streams/unit/default" \
  -u elastic_serverless:changeme \
  -H 'kbn-xsrf: true' \
  -H 'x-elastic-internal-origin: kibana' \
  -H 'Content-Type: application/yaml' \
  --data-binary @good-unit.yaml
```

Unit writes require a running config-distributor. Validation calls `POST /v1/units/validate` ([ingest-dev#9430](https://github.com/elastic/ingest-dev/issues/9430)) and falls back to the pre-rename `POST /v1/validate` when the distributor answers 405. Invalid units return 400 with `{ valid: false, diagnostics }` and are not written. When `xpack.streams.distributor.url` is unset, Kibana warns once at startup, does not call the distributor, and does not store the unit (HTTP 503).

The distributor (via `transpiler.Compile()`) is the authority on whether a unit is valid. The unit HTTP routes do not schema-check the document.

Each `diagnostics[].path` is an RFC 6901 JSON Pointer into the document that was validated, for example `/pipelines/0` or `/processors/0/config/0` for a unit and `/config/0` for a single component. The transpiler currently reports no deeper than the config entry.

## Component catalogue APIs

The processing flyout builds its processor forms from the distributor's component catalogue. Both routes need `observability:streamsEnableCanvas` and a running distributor. `GET` needs Streams V2 `read` and `_validate` needs V2 `all`. Without `xpack.streams.distributor.url` they answer 503 and the flyout shows an error instead of a processor list.

```
GET  kbn:/internal/streams/components
POST kbn:/internal/streams/components/_validate
```

- `GET /internal/streams/components` proxies `GET /v1/components`. The server keeps one in-memory copy per Kibana process, serves it for 60 s without asking, then revalidates it with the distributor's `ETag` (`If-None-Match`, 304); concurrent callers share one upstream request. The response carries the same ETag and `cache-control: private, max-age=60, stale-while-revalidate=86400`, so the browser reuses it for a minute and revalidates with Kibana after that (Hapi answers the 304). A distributor failure answers the cached copy with `x-streams-catalogue-stale: true`, `no-cache` and no ETag (a 304 on it after recovery would leave the stale marker in the browser's copy), and the distributor is retried once per 60 s window rather than on every request, so an unresponsive one does not cost a request timeout per flyout open; the flyout shows a warning with a retry, which bypasses the browser cache. Staleness after a distributor deploy is at most about two minutes. The browser refetches on every flyout open and keeps the last catalogue of the app session visible while that runs. A catalogue whose `schema_version` is not in `SUPPORTED_COMPONENT_CATALOGUE_SCHEMA_VERSIONS` (`@kbn/streams-schema`) puts the flyout into read-only mode with a warning; a processor type that is listed but has no usable definition is shown locked.
- `POST /internal/streams/components/_validate` takes `{ kind: 'processor', component }` (JSON, bounded) and proxies `POST /v1/components/validate` as YAML. It answers `{ valid, diagnostics }`; the flyout calls it before committing a processor, highlights the fields the diagnostic pointers name, blocks the commit on errors, shows warnings from a valid check and commits only when the user continues, and commits with a notice when the distributor is unreachable (502/503/504).

The local snapshot `streams_app/public/services/component_catalogue/catalogue_snapshot/components_v1.json` is a test, Storybook and Scout fixture only. Scout UI specs mock both routes through `streams_app/test/scout/common/ui/fixtures/component_catalogue_mocks.ts`.

Scout specs for V2 live in `test/scout_streams_v2/` (`streams` for API, `streams_app` for UI). That directory name selects the `streams_v2` config set, which boots Kibana with `xpack.streams.canvas.enabled=true`. V2 ships only on Serverless, so the set and the specs target Serverless Observability (complete) only. `v2_privileges.spec.ts` in each holds the privilege tests. Scout gives each test user one role, so both log in as a non-admin V2 manager with the one-role form from "Non-admin V2 managers".

## End-to-end testing

The full UI-engineer runbook (kind, two Tilts, serverless ES, Kibana, then one script) is [dev/full_dev_flow/README.md](./dev/full_dev_flow/README.md). Short version once the four long-lived processes are up:

```sh
./x-pack/platform/plugins/shared/streams/dev/full_dev_flow/streams_full_dev.sh status
./x-pack/platform/plugins/shared/streams/dev/full_dev_flow/streams_full_dev.sh setup
./x-pack/platform/plugins/shared/streams/dev/full_dev_flow/streams_full_dev.sh seed
```

Login is `elastic_serverless` / `changeme`.

[These instructions](https://github.com/elastic/ingest-dev/issues/9168#issuecomment-5427844503) can be used for testing source ingestion by running the `hosted-otel-collector` locally.

[These instructions](https://github.com/elastic/streams-config-distributor/tree/main/testing/kibana) can be used for running the `streams-config-distributor` locally. You can then place the following in your `kibana.dev.yml` using the values you get from the instructions:


```
xpack.streams.distributor.url: <DISTRIBUTOR_URL>
xpack.streams.distributor.ssl.certificate: <CERT_PATH>
xpack.streams.distributor.ssl.key: <KEY_PATH>
xpack.streams.distributor.ssl.certificateAuthorities: <CA_PATH>
```
