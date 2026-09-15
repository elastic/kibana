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

# Optional. When unset, unit PUT still writes saved objects but skips
# streams-config-distributor validate and publish (local canvas saves still work).
# xpack.streams.configDistributor.url: "https://localhost:8443"
# xpack.streams.configDistributor.ssl.certificatePath: /tmp/certs/kibana.crt
# xpack.streams.configDistributor.ssl.keyPath: /tmp/certs/kibana.key
# xpack.streams.configDistributor.ssl.certificateAuthoritiesPath: /tmp/certs/server-ca.crt

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
- Only `unit_id` is mapped (`keyword`). The configuration saved object id is the unit id (`default` in v1). Do not add mappings unless you actually need to filter/sort on that field; mappings cannot be removed later.
- `streams-configuration` is an Encrypted Saved Object. `secrets` is encrypted at rest; `unit_id` is in AAD. `unit` is **not** in AAD (canvas edits would re-encrypt on every save). Always overwrite the full document — do not `soClient.update` encrypted or AAD attributes.
- v1 uses a single unit id: `default` (`STREAMS_DEFAULT_UNIT_ID`).
- Unit PUT write order: configuration SO → config distributor → UI metadata. Distributor failure rolls back the configuration SO (including decrypted `secrets`).
- Without `xpack.streams.configDistributor.url`, validate and publish are no-ops.
- PUT requires `xpack.encryptedSavedObjects.encryptionKey` (`canEncrypt`). Dev mode configures a static key automatically.

### Credentials

Plaintext secrets live in the configuration SO `secrets` map (`{ "<name>": "<value>" }`), never inside `unit`. Authored YAML keeps a **name** that keys into that map (for example a destination config value of `es_api_key`).

| Layer | What is stored |
| --- | --- |
| Unit YAML / `unit` attribute | Credential **name** only |
| SO `secrets` (ESO) | Plaintext, encrypted at rest with Kibana's ESO key |
| Distributor `PUT /v1/units/{id}` | Authored `unit_yaml` + `credentials: [{ name, ciphertext }]` under the **project public key** |

`GET /internal/streams/unit/{id}` omits `secrets`. Canvas saves that omit `secrets` keep the stored bag. A PUT that includes `secrets` **merges** those keys onto what is stored — it does not replace the secrets — because the UI only sends newly entered values. A later runtime fetch can reveal values when an editor actually needs them.

Project-key encryption (`encryptCredentials`) is not wired yet. Publishing a **non-empty** secrets bag without it fails closed (503) rather than sending plaintext. Empty secrets still publish `unit_yaml` + `config_hash` only.

`config_hash` is SHA-256 of the authored YAML bytes, plus a credential ciphertext fingerprint when `credentials[]` is present. The distributor stores that hash without recomputing it; including ciphertext means a secret-only change still rolls out instead of matching the previous YAML-only hash and no-op'ing. Validate (`POST /v1/validate`) does not send credentials.

### Reset canvas saved objects

These types are `hidden: true`, so they do not appear in Stack Management and Cloud Console cannot search `.kibana`. Reset through the unit API:

```
POST kbn:/internal/streams/unit/default/_reset
```

That deletes the configuration and UI metadata saved objects in the current space. `GET kbn:/internal/streams/unit/default` then 404s until the next PUT, which creates a fresh pair. Idempotent if nothing is stored. Does not notify config-distributor.

## Unit APIs

```
PUT kbn:/internal/streams/unit/default
{
  "unit": {
    "sources": [
      { "id": "otlp-input", "type": "nop", "supported_telemetry": ["logs"] }
    ]
  },
  "ui_metadata": {
    "nodes": {
      "otlp-input": { "x": 0, "y": 0 }
    }
  },
  "secrets": {
    "es_api_key": "<plaintext; Encrypted Saved Objects at rest>"
  }
}

GET kbn:/internal/streams/unit/default

POST kbn:/internal/streams/unit/default/_reset
```

Component `id`s must be unique across sources, processors, and destinations. Semantic / compile validation calls config-distributor `POST /v1/validate` ([ingest-dev#9430](https://github.com/elastic/ingest-dev/issues/9430)) when `xpack.streams.configDistributor.url` is set. Invalid units return 400 with `{ valid: false, diagnostics }` and are not written. Without a distributor URL, only Kibana structural checks run.

The distributor (via `transpiler.Compile()`) is the authority on whether a unit is valid. Kibana schema and Zod types are structural DX only. 

## End-to-end testing

There isn't an easy way to truly test all of this end to end yet, with a working backend.

[These instructions](https://github.com/elastic/ingest-dev/issues/9168#issuecomment-5427844503) can be used for testing source ingestion by running the `hosted-otel-collector` locally.

[These instructions](https://github.com/elastic/ingest-dev/issues/9443) can be used for running the `streams-config-distributor` locally. You can then place the following in your `kibana.dev.yml` using the values you get from the instructions:


```
xpack.streams.configDistributor.url: <DISTRIBUTOR_URL>
xpack.streams.configDistributor.ssl.certificatePath: <CERT_PATH>
xpack.streams.configDistributor.ssl.keyPath: <KEY_PATH>
xpack.streams.configDistributor.ssl.certificateAuthoritiesPath: <CA_PATH>
```
