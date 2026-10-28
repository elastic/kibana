# Streams Development Guide

This document explains how to develop the current ("new experience") of Streams — unit-scoped map, YAML unit model, and the Kibana unit APIs.

Legacy wired / classic / query streams are documented in [`LEGACY_DEVELOPMENT.md`](./LEGACY_DEVELOPMENT.md).

Also consult the [streams-spec](https://github.com/elastic/streams-spec/tree/main/docs) repo for up to date ADRs, the official schema etc.

## Feature flags

Two layers of flags exist. **Kibana config** (`kibana.dev.yml`) is evaluated at server start. **Advanced Settings** (`uiSettings`) are per-space and some of them are UI-readonly, so they must be set via `uiSettings.overrides` rather than the Advanced Settings page.

### Kibana config (`kibana.dev.yml`)

```yaml
# Registers the Map saved object types. Required for unit GET/PUT.
# Restart Kibana after changing it.
xpack.streams.canvas.enabled: true

xpack.streams.distributor.url: "https://localhost:18443"
xpack.streams.distributor.ssl.certificate: /tmp/certs/kibana.crt
xpack.streams.distributor.ssl.key: /tmp/certs/kibana.key
xpack.streams.distributor.ssl.certificateAuthorities: /tmp/certs/server-ca.crt
# Needed only to publish units with secrets. See "Credentials".
xpack.streams.encryptionKey.path: /tmp/streams-encryption-key

uiSettings.overrides:
  observability:streamsEnableCanvas: true
```

`xpack.streams.canvas.enabled` and `observability:streamsEnableCanvas` are **not** interchangeable:

| Flag | What it actually gates |
| --- | --- |
| `xpack.streams.canvas.enabled` | Saved object **registration** for `streams-configuration` and `streams-ui-metadata` ([Scenario B WIP](https://www.elastic.co/docs/extend/kibana/key-concepts/saved-objects/validate#saved-objects-wip-types-scenario-b)). |
| `observability:streamsEnableCanvas` | Unit HTTP APIs (`GET`/`PUT`/`POST …/_reset` on `/internal/streams/unit/{id}`) and the Map UI. |

You need both on for a working local Map. If only the uiSetting is on, the APIs return 404-style "not enabled" or fail when writing because the types were never registered.

### Advanced Settings (`uiSettings`)

Registered in `server/feature_flags.ts`. All `requiresPageReload: true`.

| Setting | Default | UI-editable | Purpose |
| --- | --- | --- | --- |
| `observability:streamsEnableCanvas` | `false` | No (`readonlyMode: ui`) | New Streams Map + unit APIs |

Settings marked UI-readonly can only be turned on through `uiSettings.overrides` in `kibana.yml` / `kibana.dev.yml`.

## Access via URL

With the feature flags enabled you can then access the "new experience" via `/app/streams/new-experience/map`.

## Map saved objects (WIP)

`streams-configuration` and `streams-ui-metadata` are work-in-progress types registered **conditionally** ([Scenario B](https://www.elastic.co/docs/extend/kibana/key-concepts/saved-objects/validate#saved-objects-wip-types-scenario-b)): only when `xpack.streams.canvas.enabled` is `true`. They are absent from Serverless / CI / production while the flag stays off, so model version 1 can still change.

Important consequences:

- Types are `hidden: true`. They do **not** appear in Stack Management → Saved Objects.
- Both types are `namespaceType: 'multiple'` and are written with `initialNamespaces: ['*']`, so every space sees the same unit. That matches config-distributor `PUT /v1/units/default` (one unit per cluster). `multiple-isolated` would hide the object from other spaces while still using a globally unique id, so a second space would 404 then collide.
- Only `unit_id` is mapped (`keyword`). The configuration saved object id is the unit id (`default` in v1). Do not add mappings unless you actually need to filter/sort on that field; mappings cannot be removed later.
- `streams-configuration` is an Encrypted Saved Object. `secrets` is encrypted at rest. `unit_id` and `sealed_credentials` are in AAD, so the cache stays readable but is authenticated: editing or swapping a cached blob makes `secrets` fail to decrypt, and the next save fails before anything is sent. `unit` is **not** in AAD (canvas edits would re-encrypt on every save). Always overwrite the full document, and do not `soClient.update` encrypted or AAD attributes.
- v1 uses a single unit id: `default` (`STREAMS_DEFAULT_UNIT_ID`).
- Unit PUT order: seal credentials → distributor validate → configuration SO → distributor publish → UI metadata. A validation failure writes nothing. A publish failure rolls back the configuration SO (including decrypted `secrets` and `sealed_credentials`).
- `streams:republish-units` re-sends every stored unit every 30 minutes and re-seals after a key rotation. See "Republish and key rotation".
- Without `xpack.streams.distributor.url`, validate and publish are no-ops.
- PUT requires `xpack.encryptedSavedObjects.encryptionKey` (`canEncrypt`). Dev mode configures a static key automatically.

### Credentials

Plaintext secrets live in the configuration SO `secrets` map (`{ "<name>": "<value>" }`), never inside `unit`. The unit references a credential by name with a config value of exactly `{ "credential": "<name>" }`, as the streams-spec credential contract defines. A plain string value is never a reference.

Names follow the unit identifier grammar (`^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`, at most 256 characters). The same name is the reference, the key in `secrets`, and the `credentials[].name` sent to the distributor. The UI convention is `<nodeId>-<field>` with `_` turned into `-`, for example `s3-archive-secret-access-key`. That convention can collide (`a-b` + `c` and `a` + `b_c` both give `a-b-c`), so the UI must check before saving. Two nodes that reference the same name share one secret.

A JSON envelope that stores a secret references it from the node and sends the value next to the unit:

```json
{
  "unit": {
    "destinations": [
      {
        "id": "es-remote-1",
        "type": "elasticsearch",
        "supported_telemetry": ["logs"],
        "config": [{ "name": "api_key", "value": { "credential": "es-remote-1-api-key" } }]
      }
    ]
  },
  "secrets": { "es-remote-1-api-key": "<plaintext>" }
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

These types are `hidden: true`, so they do not appear in Stack Management and Cloud Console cannot search `.kibana`. Reset through the unit API:

```
POST kbn:/internal/streams/unit/default/_reset
```

That deletes the configuration and UI metadata saved objects in the current space. `GET kbn:/internal/streams/unit/default` then 404s until the next PUT, which creates a fresh pair. Idempotent if nothing is stored. Does not notify config-distributor.

## Unit APIs

`PUT /internal/streams/unit/{id}` accepts two content types:

| `Content-Type` | Body |
| --- | --- |
| `application/json` | `{ unit, ui_metadata, secrets? }` envelope (Map / Dev Tools). |
| `application/yaml` (also `text/yaml`, `application/x-yaml`) | The authored unit document itself (`sources` / `destinations` / `pipelines`). Do **not** wrap it in `{ unit: … }` and do **not** jsonify it first. YAML cannot set `ui_metadata` or `secrets`; stored map layout and secrets are kept (stale node metadata is still pruned). |

A successful PUT returns `{ acknowledged: true }`. When config-distributor validate succeeds and includes compiled OpenTelemetry collector YAML, the response also has `compiled_config`. Without `xpack.streams.distributor.url`, validate is skipped and `compiled_config` is omitted. If the unit published but the canvas layout write failed, the response includes `ui_metadata_not_persisted: true`.

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

Unit writes require a running config-distributor. Validation calls `POST /v1/units/validate` ([ingest-dev#9430](https://github.com/elastic/ingest-dev/issues/9430)) and falls back to the pre-rename `POST /v1/validate` when the distributor answers 405. Invalid units return 400 with `{ valid: false, diagnostics }` and are not written. When `xpack.streams.distributor.url` is unset, Kibana logs an error, does not call the distributor, and does not store the unit (HTTP 503).

The distributor (via `transpiler.Compile()`) is the authority on whether a unit is valid. The unit HTTP routes do not schema-check the document. 

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
