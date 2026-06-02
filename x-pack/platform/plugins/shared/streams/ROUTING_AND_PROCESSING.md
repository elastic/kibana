# Wired Stream Routing and Processing

This document explains the mechanics of how wired stream routing and processing work at the Elasticsearch level — the pipeline architecture, how routing conditions are compiled and executed, and what ES objects are created when you fork a stream.

For a broader introduction to streams concepts, see [DEVELOPMENT.md](./DEVELOPMENT.md).

---

## Overview

When a document arrives at a wired stream, two things happen in sequence, both implemented as native Elasticsearch ingest pipelines:

1. **Processing** — the document is parsed, transformed, and enriched according to the stream's Streamlang configuration. The `stream.name` field is stamped.
2. **Routing** — the document is evaluated against the stream's routing rules and, if a condition matches, redirected to a child stream's data stream via ES's native `reroute` ingest processor.

Kibana's role is entirely at **write time**: it compiles Streamlang processing steps and routing conditions into ingest pipeline JSON and deploys them to ES. At ingest time, Kibana is not in the path at all — ES handles everything natively.

---

## The Two-Pipeline Pattern

Every wired stream gets exactly two ingest pipelines:

| Pipeline name | Purpose |
|---------------|---------|
| `{name}@stream.processing` | Validates provenance, stamps `stream.name`, runs processing steps, then hands off to the reroute pipeline |
| `{name}@stream.reroutes` | Contains one `reroute` processor per active routing rule |

The processing pipeline always calls the reroute pipeline as its final step:

```json
{
  "pipeline": {
    "name": "logs.otel@stream.reroutes",
    "ignore_missing_pipeline": true
  }
}
```

`ignore_missing_pipeline: true` means a stream with no routing rules doesn't need a reroute pipeline to exist — it is a no-op if absent.

---

## The Processing Pipeline in Detail

For a non-root wired stream (e.g. `logs.otel.nginx`), the processing pipeline contains:

### 1. Parent-name guard

```json
{
  "script": {
    "lang": "painless",
    "source": "if (ctx[\"stream.name\"] != params.parentName) { throw new IllegalArgumentException('stream.name is not set properly - did you send the document directly to a child stream instead of the main logs stream?'); }",
    "params": { "parentName": "logs.otel" }
  }
}
```

This rejects documents that arrive directly at `logs.otel.nginx` without passing through the parent pipeline. At the point a document reaches the child's processing pipeline, `stream.name` has already been set to the parent's name by the parent's processing pipeline. The guard verifies this invariant, preventing data from bypassing routing logic.

### 2. `stream.name` stamp

```json
{
  "script": {
    "lang": "painless",
    "source": "ctx[\"stream.name\"] = params.field",
    "params": { "field": "logs.otel.nginx" }
  }
}
```

Sets `stream.name` to this stream's name, overwriting the parent's value.

### 3. Streamlang processing steps

The stream's processing steps (grok, dissect, date extraction, etc.) are transpiled from Streamlang DSL into ingest pipeline processors by `@kbn/streamlang` and inserted here. For example, a grok step becomes:

```json
{
  "grok": {
    "field": "message",
    "patterns": ["%{COMBINEDAPACHELOG}"],
    "ignore_failure": true
  }
}
```

### 4. Hand-off to reroute pipeline

```json
{
  "pipeline": {
    "name": "logs.otel.nginx@stream.reroutes",
    "ignore_missing_pipeline": true
  }
}
```

### Root stream differences

Root streams (`logs`, `logs.otel`, `logs.ecs`) omit the parent-name guard (they have no parent) and instead prepend root-specific processors — for example, OTel normalization for `logs.otel` and ECS normalization for `logs.ecs`.

---

## The Reroute Pipeline in Detail

Each routing rule becomes one `reroute` processor. The `where` condition from Streamlang is compiled to Painless by `conditionToPainless()` in `@kbn/streamlang`:

```json
{
  "reroute": {
    "destination": "logs.otel.serviceA",
    "if": "\n  try {\n  def val_service_name = $('service.name', null); if (val_service_name instanceof List && val_service_name.size() == 1) { val_service_name = val_service_name[0]; }\n  \n  if ((val_service_name !== null && ((val_service_name instanceof Number && val_service_name.toString() == \"serviceA\") || val_service_name == \"serviceA\"))) {\n    return true;\n  }\n  return false;\n} catch (Exception e) {\n  return false;\n}\n"
  }
}
```

Key properties of the compiled Painless:

- **Single-element list unwrapping** — if a field contains a one-element list (common in OTel), the value is unwrapped before comparison.
- **Type-safe comparisons** — numeric and string comparisons are handled separately to avoid type errors.
- **Exception safety** — every condition is wrapped in `try/catch`; an error in evaluation causes the rule to silently not match (the document stays in the parent stream rather than failing indexing).
- **`neq` semantics** — a `neq` condition treats a missing field as a match (mirroring ES|QL's `COALESCE(field != value, TRUE)` behaviour); all other operators treat a missing field as a non-match.

Rules are evaluated in the order they appear in the stream's `routing` array. The first matching `reroute` processor wins and redirects the document; subsequent processors are not evaluated for that document.

Routing rules with `status: 'disabled'` are excluded from the generated pipeline entirely.

---

## Forking a Stream: ES Objects Created

The examples below use a three-level hierarchy:

```
logs.otel
├── logs.otel.serviceA          (where: service.name == "serviceA")
│   ├── logs.otel.serviceA.webserver   (where: http.url exists)
│   └── logs.otel.serviceA.nginx       (where: log.file.path contains "nginx")
└── logs.otel.serviceB          (where: service.name == "serviceB")
```

### Level 1 fork: `logs.otel` → `logs.otel.serviceA` and `logs.otel.serviceB`

`POST /api/streams/logs.otel/_fork` (twice, once per child).

**New objects created for each child** (shown for `logs.otel.serviceA`; `logs.otel.serviceB` is identical in structure):

| ES object | Name | Purpose |
|-----------|------|---------|
| Component template | `logs.otel.serviceA@stream` | Field mappings for this stream |
| Index template | `logs.otel.serviceA` | Binds the data stream to the component template chain; sets default pipeline |
| Processing pipeline | `logs.otel.serviceA@stream.processing` | Parent guard (expects `stream.name == "logs.otel"`) + `stream.name` stamp + processing steps + reroute hand-off |
| Reroute pipeline | `logs.otel.serviceA@stream.reroutes` | Empty on creation; populated in the next fork |
| Data stream | `logs.otel.serviceA` | The backing data stream where matched documents land |
| `.streams` document | — | Entry in the ES `.streams` system index |

**Updated on `logs.otel`:**

| ES object | Name | Change |
|-----------|------|--------|
| Reroute pipeline | `logs.otel@stream.reroutes` | Regenerated with `reroute` processors for both `logs.otel.serviceA` and `logs.otel.serviceB` |

No other `logs.otel` objects change.

### Level 2 fork: `logs.otel.serviceA` → `logs.otel.serviceA.webserver` and `logs.otel.serviceA.nginx`

`POST /api/streams/logs.otel.serviceA/_fork` (twice).

**New objects created for each grandchild** (shown for `logs.otel.serviceA.webserver`):

| ES object | Name | Purpose |
|-----------|------|---------|
| Component template | `logs.otel.serviceA.webserver@stream` | Field mappings |
| Index template | `logs.otel.serviceA.webserver` | Sets default pipeline to `logs.otel.serviceA.webserver@stream.processing` |
| Processing pipeline | `logs.otel.serviceA.webserver@stream.processing` | Parent guard (expects `stream.name == "logs.otel.serviceA"`) + `stream.name` stamp + processing steps + reroute hand-off |
| Reroute pipeline | `logs.otel.serviceA.webserver@stream.reroutes` | Empty on creation |
| Data stream | `logs.otel.serviceA.webserver` | Backing data stream |
| `.streams` document | — | Entry in `.streams` system index |

**Updated on `logs.otel.serviceA`:**

| ES object | Name | Change |
|-----------|------|--------|
| Reroute pipeline | `logs.otel.serviceA@stream.reroutes` | Regenerated with `reroute` processors for `logs.otel.serviceA.webserver` and `logs.otel.serviceA.nginx` |

`logs.otel.serviceB` and all `logs.otel` objects are completely untouched by this second fork — each fork only updates the immediate parent's reroute pipeline.

### Complete ES object inventory after both forks

| ES object type | Names created |
|----------------|--------------|
| Component templates | `logs.otel.serviceA@stream`, `logs.otel.serviceA.webserver@stream`, `logs.otel.serviceA.nginx@stream`, `logs.otel.serviceB@stream` |
| Index templates | `logs.otel.serviceA`, `logs.otel.serviceA.webserver`, `logs.otel.serviceA.nginx`, `logs.otel.serviceB` |
| Processing pipelines | `logs.otel.serviceA@stream.processing`, `logs.otel.serviceA.webserver@stream.processing`, `logs.otel.serviceA.nginx@stream.processing`, `logs.otel.serviceB@stream.processing` |
| Reroute pipelines | `logs.otel.serviceA@stream.reroutes` (2 rules), `logs.otel.serviceA.webserver@stream.reroutes` (empty), `logs.otel.serviceA.nginx@stream.reroutes` (empty), `logs.otel.serviceB@stream.reroutes` (empty) |
| Updated pipelines | `logs.otel@stream.reroutes` (2 rules), `logs.otel.serviceA@stream.reroutes` (2 rules) |
| Data streams | `logs.otel.serviceA`, `logs.otel.serviceA.webserver`, `logs.otel.serviceA.nginx`, `logs.otel.serviceB` |
| `.streams` documents | one per stream above |

---

## Document Flow at Ingest Time

Using the three-level hierarchy above. A document for serviceA's nginx process
(`service.name=serviceA`, `log.file.path="/var/log/nginx/access.log"`) traces through three
pipeline pairs before being indexed:

```
document → logs.otel data stream
           (default pipeline: logs.otel@stream.processing)
  │
  ├─ OTel root processors (normalisation)
  ├─ stream.name = "logs.otel"
  ├─ [processing steps for logs.otel, if any]
  └─ → logs.otel@stream.reroutes
        │
        ├─ reroute if service.name == "serviceA"   ← matches ✓
        │     │
        │     └─ → logs.otel.serviceA data stream
        │          (default pipeline: logs.otel.serviceA@stream.processing)
        │            │
        │            ├─ guard: stream.name must == "logs.otel" ✓
        │            ├─ stream.name = "logs.otel.serviceA"
        │            ├─ [processing steps for logs.otel.serviceA, if any]
        │            └─ → logs.otel.serviceA@stream.reroutes
        │                  │
        │                  ├─ reroute if http.url exists          ← no match (not a web request)
        │                  │
        │                  └─ reroute if log.file.path contains "nginx"   ← matches ✓
        │                        │
        │                        └─ → logs.otel.serviceA.nginx data stream
        │                             (default pipeline: logs.otel.serviceA.nginx@stream.processing)
        │                               │
        │                               ├─ guard: stream.name must == "logs.otel.serviceA" ✓
        │                               ├─ stream.name = "logs.otel.serviceA.nginx"
        │                               ├─ [processing steps for logs.otel.serviceA.nginx, if any]
        │                               └─ → logs.otel.serviceA.nginx@stream.reroutes (empty, no-op)
        │                                    document indexed in logs.otel.serviceA.nginx ✓
        │
        ├─ reroute if service.name == "serviceB"   ← not evaluated (serviceA already matched)
        │
        └─ no match → document stays in logs.otel ✓
```

Note that once a `reroute` processor matches at any level, the document leaves that stream entirely — the remaining processors in that level's reroute pipeline are not evaluated for that document.

A document for serviceA that matches neither grandchild condition (`http.url` absent, `log.file.path` does not contain "nginx") is indexed in `logs.otel.serviceA` — it matched the level-1 condition and was routed there, but no level-2 condition claimed it:

```
document → logs.otel
  └─ → logs.otel@stream.reroutes
        └─ reroute serviceA ← matches
              └─ → logs.otel.serviceA
                    └─ → logs.otel.serviceA@stream.reroutes
                          ├─ webserver? no
                          └─ nginx?    no
                          document indexed in logs.otel.serviceA ✓
```

Documents that do not match any routing rule remain in the stream where routing was evaluated. There is no "default" child at any level.

---

## Routing Constraints

The following constraints are enforced by Kibana's state machine during validation, before any ES objects are written:

- **Name prefix** — a child stream name must start with the parent name followed by a dot (e.g. `logs.otel.nginx` under `logs.otel`).
- **Same root** — all streams in a hierarchy must share the same root (`logs`, `logs.otel`, or `logs.ecs`). Cross-root routing is not possible.
- **No duplicate children** — a stream cannot appear as a routing destination more than once on the same parent.
- **No cross-root children** — `logs.otel.child` cannot be a child of `logs` (different roots).
- **Max nesting depth** — 5 levels (e.g. `logs.otel.a.b.c.d` is the maximum).
- **Draft streams** — a draft stream cannot have materialised (non-draft) children.

These are Kibana-level constraints. Elasticsearch has no knowledge of the stream hierarchy and would accept any pipeline targeting any data stream name.

---

## Routing vs. Processing: Ordering Guarantee

Processing always runs before routing. This is structural, not configurable: the processing pipeline calls the reroute pipeline as its last step. A document cannot be routed to a child stream before its processing steps have executed.

This means enrichment fields added by processing (e.g. a `service.name` extracted from a raw log line via grok) are available to routing conditions in the same stream.

---

## Draft Mode

Processing steps and child streams can exist in **draft** mode. Draft processing uses ES|QL views at query time rather than ingest pipelines, letting users validate changes against existing data before committing them to ingest time. Draft streams are created with `draft: true` in the routing rule and do not get a live data stream or processing pipeline — they are resolved at query time only.

A draft stream is promoted to a materialized stream by updating the routing rule's `draft` flag to `false`, which triggers the full ES object creation described above.

---

## Streamlang

Processing steps are defined in Streamlang, the streams processing DSL. Streamlang compiles to both ingest pipelines (ingest time) and ES|QL (query time / draft mode), enabling seamless promotion between draft and production. The `@kbn/streamlang` package contains the type definitions, validators, and transpilers.

See `x-pack/platform/packages/shared/kbn-streamlang/README.md` for the processor reference.
