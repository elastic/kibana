# Streams Graph DSL (strawman v0.1)

A higher-level, GitOps-friendly DSL describing a stream **topology** as a graph, per `stream-topology-model.md` (a stream is the full `source → pipelines → routes → destinations` DAG) and the YAML round-trip requirement in `canvas-design.md`. This sits above Streamlang: pipelines *contain* Streamlang; the graph DSL wires nodes together.

This document is a strawman to react to — semantics marked **(OPEN)** are unresolved design forks.

---

## Top-level shape

A topology has a `name` plus four collections. The three node collections are **maps keyed by id** (unique ids, clean YAML, stable references for canvas round-trip). `routing` is an **ordered list of edges**.

```yaml
name:           # the topology's name — this is the unit a user "lists" as a stream (see Q5)
sources:        # input endpoints — where data enters
destinations:   # terminal sinks — where data lands
pipelines:      # reusable processing units (Streamlang only, NO routing)
routing:        # the graph: ordered edges connecting node ids, with optional conditions
```

Every node (source, pipeline, or destination) may carry an optional `lifecycle:` (see Q4) — because under Decision 2 any node is a data stream that can retain documents.

### `sources`
```yaml
sources:
  otlp_in:
    type: otlp            # otlp | async_bulk | prometheus_remote_write
  bulk_in:
    type: async_bulk
```
A source is an ingestion entry point (per `managed_inputs.md` / `managed-inputs-strategy.md`). In the **ES/KBN execution layer** a source lowers to an entry data stream + its default processing pipeline.

### `destinations`
```yaml
destinations:
  logs_es:
    type: elasticsearch   # elasticsearch (M1); s3 (M2 — see stream-topology-model.md)
    index: logs-nginx
```
Destinations are **append-only** (`stream-topology-model.md` #7). In the ES/KBN layer a destination lowers to a terminal data stream.

### `pipelines`
A pipeline is a **reusable** processing unit = a Streamlang program (`{ steps: [...] }`). It contains **no routing** — that is what keeps it reusable (`stream-topology-model.md` #2).
```yaml
pipelines:
  parse_nginx:
    steps:                              # this is Streamlang (@kbn/streamlang)
      - action: grok
        from: message
        patterns: ['%{COMBINEDAPACHELOG}']
      - action: date
        from: attributes.timestamp
        formats: ["dd/MMM/yyyy:HH:mm:ss Z"]
        to: '@timestamp'
```

### `routing` — the graph
An **ordered list of edges**. Each edge connects a `from` node id to a `to` node id, with an optional `where` condition. The `where` uses the **exact Streamlang condition shape** (`where`/`and`/`or`/`not`/`range`) — so it reuses `conditionToPainless()` unchanged and the existing Streamlang validation corpus doubles as routing-condition samples.
```yaml
routing:
  - { from: otlp_in,    to: parse_nginx }                                   # unconditional
  - { from: parse_nginx, to: logs_es, where: { field: service.name, eq: nginx } }
  - { from: parse_nginx, to: other_es }                                     # fallthrough (no where)
```

---

## Edge-evaluation semantics

Anchored to the **verified** ES `reroute` behavior (`ROUTING_AND_PROCESSING.md`):

- **Ordered, first-match-wins per `from` node.** Edges sharing a `from` are evaluated top-to-bottom; the first whose `where` matches routes the document. An edge with no `where` is an unconditional fallthrough and should be listed last.
- **Exclusive, not fan-out (DECIDED — see Decision 1).** A document goes to exactly **one** downstream node — what `reroute` gives natively (the doc leaves the node on first match). Copy-fanout is out of scope for V1.
- **Processing before routing within a node.** A pipeline node runs its Streamlang steps, then evaluates its outgoing edges — mirrors the structural `@stream.processing → @stream.reroutes` hand-off.
- **Every node is physically a data stream, so any un-routed document is retained where it sits.** Per the verified reroute behavior (`ROUTING_AND_PROCESSING.md`: "no match → document stays… and is indexed in" the current stream), a document that matches no outbound edge is **stored in that node's own data stream**. The clean `source` / `pipeline` / `destination` trichotomy is three *roles* over one underlying object — so a `source` or `pipeline` node is silently also a sink for anything it doesn't route onward. This is the root of the **retention fork** below.

---

## Decided semantics (v0.1)

Two foundational decisions are locked. Both take the reroute-native / simplest option, consistent with the plan's speed-of-proof ethos.

### Decision 1 — Exclusive routing, no fan-out (DECIDED) ✅
Routing is **exclusive, first-match-wins**: a document goes to exactly one downstream node, then leaves — directly the native `reroute` behavior.

**Fan-out is fully out of scope** — neither physical nor logical. Specifically:
- **Physical copy-fanout** (one doc materialized into multiple separate data streams) is not available on the ES path: ES ingest indexes a document exactly once and has no copy primitive. It is properly a **managed-processing-service** capability (alongside S3/external destinations and decoupling) — deferred, not built here.
- **Logical fan-out** (one physical copy, the same doc surfaced in multiple overlapping ES|QL views) *is* technically cheap and half-built (`getWiredStreamViewQuery`, the `$.` view namespace), but is **deliberately not pursued in V1**. Streams' existing views remain mutually-exclusive; we are not introducing overlapping view filters now.

If fan-out is needed later it is a net-new capability decision, not a config flag on this DSL.

### Decision 2 — Intermediate retention accepted (DECIDED) ✅
Because every node is a data stream, a document matching no outbound edge is **retained in that node**, and that is **allowed** — nodes may act as sinks. Validation does **not** require a terminal fallthrough edge; mid-graph retention is legal, not an error. Matches ES natively and is the simplest to build.
- **Consequence (observability):** "where did my data land?" is non-obvious, since any node can hold data. The product surface (Workstream B) should make per-node doc counts / landing visible — this replaces the safety a mandatory-fallthrough rule would have given.
- **Consequence (lifecycle):** because any node can retain data, retention/lifecycle config cannot live only on `destinations` — it may need to attach to any node. See secondary question #4.

---

## Lowering to the ES/KBN execution layer

How the DSL compiles onto the **verified** objects (ties back to `streams_execution_layer_plan.md`):

| DSL concept | ES/KBN object |
|---|---|
| `source` | entry data stream + default `@stream.processing` pipeline |
| `pipeline` node | data stream + `@stream.processing` (Streamlang transpiled in) + `@stream.reroutes` |
| `routing` edges out of a node | one `reroute` processor per edge in that node's `@stream.reroutes`, `if: conditionToPainless(edge.where)`, in list order |
| `destination` (ES) | terminal data stream |
| node identity | a node in the new **graph-stream type** (Workstream A) — arbitrary name, **no parent-name guard**, **no name-based inheritance** |

Crucially this is the *new parallel path*: nodes are graph-stream-type records, so none of the wired-stream hierarchy constraints (`isChildOf`, root-allowlist, parent guard, inheritance) apply.

---

## Worked example (the `ROUTING_AND_PROCESSING.md` nginx scenario, re-expressed)

```yaml
name: serviceA-topology

sources:
  otlp_in: { type: otlp }

pipelines:
  serviceA_parse:
    steps:
      - action: grok
        from: body.message
        patterns: ['%{IP:attributes.client_ip} %{WORD:attributes.method}']

destinations:
  nginx_es:    { type: elasticsearch, index: logs-serviceA-nginx }
  webserver_es:{ type: elasticsearch, index: logs-serviceA-web }
  serviceA_es:                                   # per-node lifecycle override (Q4); others use cluster default
    type: elasticsearch
    index: logs-serviceA
    lifecycle: { dsl: { data_retention: 7d } }

routing:
  - { from: otlp_in,        to: serviceA_parse, where: { field: service.name, eq: serviceA } }
  - { from: serviceA_parse, to: webserver_es,   where: { field: http.url, exists: true } }
  - { from: serviceA_parse, to: nginx_es,       where: { field: log.file.path, contains: nginx } }
  - { from: serviceA_parse, to: serviceA_es }   # fallthrough: matched serviceA but neither child condition
```

This is the same routing tree from the research doc, but the graph is explicit and names no longer encode hierarchy.

Under **Decision 2 (intermediate retention accepted)**, `otlp_in` deliberately has no fallthrough edge: a non-`serviceA` document (e.g. serviceB, or metrics) matches no outbound edge and is legally **retained in `otlp_in`'s own data stream**. That is allowed, not a validation error — the product surface is responsible for making that landing visible.

---

## Validation rules (graph integrity)

- **Referential integrity** — every `from`/`to` resolves to a declared node id.
- **Acyclic** — routing graph must be a DAG (cycle detection; depth limit **(OPEN)** — replaces the old name-based `MAX_NESTING_LEVEL`).
- **Reachability** — every pipeline/destination reachable from at least one source; warn on orphans.
- **Source/destination edge rules** — sources have no inbound edges; destinations have no outbound edges.
- **Condition validity** — each `where` validates against the Streamlang condition schema.

---

## Secondary decisions (PoC defaults — provisional, will change)

These are downstream of the two headline forks. For a PoC we pick the simplest faithful option and note the extension path; none are load-bearing for proving the concept.

### Q1 — Pipeline reuse model → **1:1 (each `pipelines:` entry is one node)**
For the PoC, a `pipelines:` entry is *both* a definition and a single graph node; routing edges reference its id directly (keeps edges simple — no instance/definition split). True reuse of the same Streamlang steps at multiple graph positions is **deferred**; if you need the same logic twice, define two pipelines.
- *Extension path:* later add a `uses: <pipelineDefId>` reference on a node, or a separate `pipeline_templates:` section, so one definition can be instantiated at N positions. Each position still lowers to its own data stream + processing pipeline; only the steps are shared.
- *Aligns with* `stream-topology-model.md` #2 (routing stays external, so the steps are inherently reusable) without paying for the instance/definition machinery yet.

### Q2 — Depth/complexity limits → **DAG correctness via cycle detection; soft path-depth guardrail**
Correctness rests on the **acyclic** check (already in validation rules) — that is the real requirement, replacing the old name-based `MAX_NESTING_LEVEL`. Add a *soft* max-routing-path-depth guardrail (PoC default: 10) purely to bound pathological chaining (the topology ADR's open concern about arbitrarily complex topologies); it is tunable, not semantic.
- *Verify:* ES `reroute` is believed to carry its own loop/recursion protection as a backstop — confirm the exact behavior/limit against a live stack before relying on it.

### Q3 — Edge conditions → **allowed on every edge class**
A `where` is permitted on any edge regardless of node types (source→pipeline, pipeline→pipeline, pipeline→destination, source→destination). Conditions are *routing*, not processing — they compile to `conditionToPainless` in the **source node's** reroute pipeline, which is indifferent to the destination's type. This matches `reroute`'s `if`, which doesn't care what it routes to. `stream-topology-model.md` #7's "default route has no processing" is about processing steps, not conditions, so it doesn't constrain this. First-match ordering applies across *all* outbound edges of a node, regardless of their targets.

### Q4 — Lifecycle/retention → **optional per-node field; default = cluster/data-stream default**
Constrained by Decision 2 (any node retains data), `lifecycle:` is an optional field on **any** node, reusing the existing `IngestStreamLifecycle` shape (`{ dsl: { data_retention } }` or `{ ilm: { policy } }`) from `@kbn/streams-schema`. When omitted, a node falls back to the **cluster/data-stream default** — explicitly **not** name-based ancestor inheritance (that was removed with the new path). Simple, unambiguous, no hierarchy.
- *Extension path:* if shared retention across many nodes becomes painful, add an explicit (non-name-based) default block at the topology level — but only as an opt-in default, never implicit ancestor walking.

### Q5 — Naming the user sees → **the topology `name` is the listed unit; node ids are within it**
The whole DSL document is one named topology (top-level `name:`), and that name is what a user sees when listing "their streams" — consistent with `stream-topology-model.md` #1 (a stream is the full topology). Nodes are addressed by their ids within the topology; the per-node backing data streams are an implementation detail, not the primary list unit.
- *Deferred to product:* `stream-topology-model.md` flags that management actions attach at different levels (retention→destination, processing→pipeline, auth→source) and the user-facing naming needs a dedicated session (Alex B + Luca). The PoC makes the minimal call (topology has a name) and leaves the product-surface naming to that session.
