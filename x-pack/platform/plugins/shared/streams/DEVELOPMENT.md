# Streams Development Guide

This document explains how to develop the current ("new experience") of Streams — unit-scoped canvas, YAML unit model, and the Kibana unit APIs.

Legacy wired / classic / query streams are documented in [`LEGACY_DEVELOPMENT.md`](./LEGACY_DEVELOPMENT.md).

Also consult the [streams-spec](https://github.com/elastic/streams-spec/tree/main/docs) repo for up to date ADRs, the official schema etc.

## Feature flags

Two layers of flags exist. **Kibana config** (`kibana.dev.yml`) is evaluated at server start. **Advanced Settings** (`uiSettings`) are per-space and some of them are UI-readonly, so they must be set via `uiSettings.overrides` rather than the Advanced Settings page.

### Kibana config (`kibana.dev.yml`)

```yaml
# Registers the canvas saved object types. Required for unit GET/PUT.
# Restart Kibana after changing it.
xpack.streams.canvas.enabled: true

xpack.streams.distributor.url: "https://localhost:18443"
xpack.streams.distributor.ssl.certificate: /tmp/certs/kibana.crt
xpack.streams.distributor.ssl.key: /tmp/certs/kibana.key
xpack.streams.distributor.ssl.certificateAuthorities: /tmp/certs/server-ca.crt

uiSettings.overrides:
  observability:streamsEnableCanvas: true
```

`xpack.streams.canvas.enabled` and `observability:streamsEnableCanvas` are **not** interchangeable:

| Flag | What it actually gates |
| --- | --- |
| `xpack.streams.canvas.enabled` | Saved object **registration** for `streams-configuration` and `streams-ui-metadata` ([Scenario B WIP](https://www.elastic.co/docs/extend/kibana/key-concepts/saved-objects/validate#saved-objects-wip-types-scenario-b)). |
| `observability:streamsEnableCanvas` | Unit HTTP APIs (`GET`/`PUT`/`POST …/_reset` on `/internal/streams/unit/{id}`) and the Canvas UI. |

You need both on for a working local canvas. If only the uiSetting is on, the APIs return 404-style "not enabled" or fail when writing because the types were never registered.

### Advanced Settings (`uiSettings`)

Registered in `server/feature_flags.ts`. All `requiresPageReload: true`.

| Setting | Default | UI-editable | Purpose |
| --- | --- | --- | --- |
| `observability:streamsEnableCanvas` | `false` | No (`readonlyMode: ui`) | New Streams Canvas + unit APIs |

Settings marked UI-readonly can only be turned on through `uiSettings.overrides` in `kibana.yml` / `kibana.dev.yml`.

## Access via URL

With the feature flags enabled you can then access the "new experience" via `/app/streams/new-experience/`.

## Canvas saved objects (WIP)

`streams-configuration` and `streams-ui-metadata` are work-in-progress types registered **conditionally** ([Scenario B](https://www.elastic.co/docs/extend/kibana/key-concepts/saved-objects/validate#saved-objects-wip-types-scenario-b)): only when `xpack.streams.canvas.enabled` is `true`. They are absent from Serverless / CI / production while the flag stays off, so model version 1 can still change.

Important consequences:

- Types are `hidden: true`. They do **not** appear in Stack Management → Saved Objects.
- Both types are `namespaceType: 'multiple'` and are written with `initialNamespaces: ['*']`, so every space sees the same unit. That matches config-distributor `PUT /v1/units/default` (one unit per cluster). `multiple-isolated` would hide the object from other spaces while still using a globally unique id, so a second space would 404 then collide.
- Only `unit_id` is mapped (`keyword`). The configuration saved object id is the unit id (`default` in v1). Do not add mappings unless you actually need to filter/sort on that field; mappings cannot be removed later.
- `streams-configuration` is an Encrypted Saved Object. `secrets` is encrypted at rest; `unit_id` is in AAD. `unit` is **not** in AAD (canvas edits would re-encrypt on every save). Always overwrite the full document — do not `soClient.update` encrypted or AAD attributes.
- v1 uses a single unit id: `default` (`STREAMS_DEFAULT_UNIT_ID`).
- Unit PUT write order: configuration SO → config distributor → UI metadata. Distributor failure rolls back the configuration SO (including decrypted `secrets`).
- Without `xpack.streams.distributor.url`, validate and publish are no-ops.
- PUT requires `xpack.encryptedSavedObjects.encryptionKey` (`canEncrypt`). Dev mode configures a static key automatically.

### Credentials

Plaintext secrets live in the configuration SO `secrets` map (`{ "<name>": "<value>" }`), never inside `unit`. Authored YAML keeps a **name** that keys into that map (for example a destination config value of `es_api_key`).

| Layer | What is stored |
| --- | --- |
| Unit YAML / `unit` attribute | Credential **name** only |
| SO `secrets` (ESO) | Plaintext, encrypted at rest with Kibana's ESO key |
| Distributor `PUT /v1/units/{id}` | Authored `unit_yaml` + `credentials: [{ name, ciphertext }]` under the **project public key** |

`GET /internal/streams/unit/{id}` omits `secrets`. Canvas saves that omit `secrets` keep the stored bag. A PUT that includes `secrets` **merges** those keys onto what is stored — it does not replace the secrets — because the UI only sends newly entered values. A later runtime fetch can reveal values when an editor actually needs them.

Project-key encryption (`encryptCredentials`) is not wired yet. Publishing a **non-empty** secrets bag without it logs a warning and omits the `credentials` sidecar rather than sending plaintext or failing the unit write. Secrets stay in the configuration saved object. Empty secrets still publish `unit_yaml` + `config_hash` only.

`config_hash` is SHA-256 of the authored YAML bytes, plus a credential ciphertext fingerprint when `credentials[]` is present. The distributor stores that hash without recomputing it; including ciphertext means a secret-only change still rolls out instead of matching the previous YAML-only hash and no-op'ing. Validate (`POST /v1/validate`) does not send credentials.

### Reset canvas saved objects

These types are `hidden: true`, so they do not appear in Stack Management and Cloud Console cannot search `.kibana`. Reset through the unit API:

```
POST kbn:/internal/streams/unit/default/_reset
```

That deletes the configuration and UI metadata saved objects in the current space. `GET kbn:/internal/streams/unit/default` then 404s until the next PUT, which creates a fresh pair. Idempotent if nothing is stored. Does not notify config-distributor.

## Unit APIs

`PUT /internal/streams/unit/{id}` accepts two content types:

| `Content-Type` | Body |
| --- | --- |
| `application/json` | `{ unit, ui_metadata, secrets? }` envelope (Canvas / Dev Tools). |
| `application/yaml` (also `text/yaml`, `application/x-yaml`) | The authored unit document itself (`sources` / `destinations` / `pipelines`). Do **not** wrap it in `{ unit: … }` and do **not** jsonify it first. YAML cannot set `ui_metadata` or `secrets`; stored canvas layout and secrets are kept (stale node metadata is still pruned). |

A successful PUT returns `{ acknowledged: true }`. When config-distributor validate succeeds and includes compiled OpenTelemetry collector YAML, the response also has `compiled_config`. Without `xpack.streams.distributor.url`, validate is skipped and `compiled_config` is omitted.

### JSON envelope (Canvas)

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
  },
  "secrets": {
    "es_api_key": "<plaintext; Encrypted Saved Objects at rest>"
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

Unit writes require a running config-distributor. Validation calls `POST /v1/validate` ([ingest-dev#9430](https://github.com/elastic/ingest-dev/issues/9430)). Invalid units return 400 with `{ valid: false, diagnostics }` and are not written. When `xpack.streams.distributor.url` is unset, Kibana logs an error, does not call the distributor, and does not store the unit (HTTP 503).

The distributor (via `transpiler.Compile()`) is the authority on whether a unit is valid. The unit HTTP routes do not schema-check the document. 

## End-to-end testing


[These instructions](https://github.com/elastic/ingest-dev/issues/9168#issuecomment-5427844503) can be used for testing source ingestion by running the `hosted-otel-collector` locally.

[These instructions](https://github.com/elastic/streams-config-distributor/tree/main/testing/kibana) can be used for running the `streams-config-distributor` locally. You can then place the following in your `kibana.dev.yml` using the values you get from the instructions:


```
xpack.streams.distributor.url: <DISTRIBUTOR_URL>
xpack.streams.distributor.ssl.certificate: <CERT_PATH>
xpack.streams.distributor.ssl.key: <KEY_PATH>
xpack.streams.distributor.ssl.certificateAuthorities: <CA_PATH>
```
