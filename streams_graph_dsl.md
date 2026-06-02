# Streams Graph DSL (strawman v0.2 — node-output model)

A higher-level, GitOps-friendly DSL describing a stream **topology** as a graph, conformed to `stream-topology-model.md` as updated by **ingest-spec PR #32** (the *node-output model*). This sits above Streamlang: pipeline definitions *contain* Streamlang; the graph DSL wires nodes together.

**What changed from v0.1 (conforming to PR #32):**
- **Streams are emergent, not authored or named.** There is no top-level topology `name` that a user "lists as a stream" — users author **nodes** and wire them, and a *stream* is a source→destination path read off the graph. (Was: v0.1 Q5 made the topology `name` the listed unit.)
- **One wiring primitive: `output`** — a flat list of next-node ids on each node. (Was: a global ordered `routing:` edge list with `from`/`to`.)
- **Conditions live on *routing nodes*, never on a plain `output`.** A plain `output` is always unconditional. (Was: a `where` on every edge.)
- **Routing node `mode: exclusive | clone`** — `clone` (fan-out) is now in the *model*. The ES execution layer still ships **exclusive-only** (see Decision 1). (Was: "no fan-out" as a model-level decision.)
- **Pipeline definitions vs pipelines (placements)** is now canonical and adopted here. (Was: v0.1 Q1 deferred the split.)
- **Destinations are sinks — no `output`**; onward routing only via an optional *inner routing node*, with a built-in catch-all.
- **Routing invariant downgraded to a non-enforced guideline.**

Semantics still marked **(OPEN)** are unresolved design forks.

---

## Top-level shape

A topology is a **graph of nodes connected by each node's `output`**. There is **no topology `name`** — streams are emergent. The document is collections of nodes keyed by id (unique ids, clean YAML, stable references for canvas round-trip):

```yaml
sources:               # entry points — where data enters; each declares an output
pipeline_definitions:  # reusable Streamlang programs ({name, steps}); NO output, not placed in the graph
pipelines:             # placements of a definition in the graph; reference a definition, carry an output
routing_nodes:         # conditional branching / fan-out; conditions live here
destinations:          # terminal sinks; NO output (onward only via an optional inner routing node)
```

Every node except a destination carries an `output` — a **flat list of next-node ids**. That is the whole wiring mechanism. Conditions never live on a plain `output`; they live on routing nodes.

Any node (source, pipeline, routing node, or destination) may carry an optional `lifecycle:` (see Q4) — because under intermediate retention any node is a data stream that can retain documents.

### `sources`
```yaml
sources:
  otlp_in:
    type: otlp            # otlp | async_bulk | prometheus_remote_write | syslog (managed inputs, v1 focus)
    output: [serviceA_parse]
```
A source is an ingestion entry point (per `managed_inputs.md`). In the **ES/KBN execution layer** a source lowers to an entry data stream + its default processing pipeline, then an unconditional reroute to the single node named in `output`.

> **Note — our prototype sits on the *deferred* direct-to-ES path.** The ADR's managed inputs (`otlp`, `async_bulk`, …) are the v1 focus and route through the *managed processing service*. The ADR explicitly describes the **direct-to-ES variants** (`es_otlp`, `bulk`, `es_prometheus_remote_write`) as "*synchronous, ES-only routing, Streamlang transpiled to ES ingest pipelines*" — which is exactly this prototype's execution mode. Where Streamlang runs for v1 is the **open RFC (Joao + Andrew C.)** this work feeds. So this DSL describes the authoring surface; the ES lowering is the deferred/direct-to-ES execution of it.

### `pipeline_definitions`
A pipeline definition is a **reusable** processing unit = a Streamlang program (`{ steps: [...] }`). It has **no `output`** and is **not** placed in the graph by itself — it lives in this library and is referenced *live by name* (editing it changes every placement that uses it). It contains **no routing** — that is what keeps it reusable (`stream-topology-model.md`).
```yaml
pipeline_definitions:
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

### `pipelines` — placements in the graph
A pipeline is a **placement** of a definition in the graph. It references a definition by name and carries an `output`. It is the node users see on the canvas.
```yaml
pipelines:
  serviceA_parse:
    definition: parse_nginx     # live reference; metrics are per-placement, never aggregated across uses
    output: [serviceA_route]    # unconditional handoff to the next node (here, a routing node)
```
- **Metrics are per-placement.** Each placement lowers to its own data stream + processing pipeline, so EPS/data-in-out/errors/latency are tracked per placement and never aggregated across uses of a shared definition (matches `stream-topology-model.md`).
- **Reuse needs an `id`.** The same definition can back several placements; each carries an `id` so it is referenceable and metered separately. A placement's handle is its `id` if present, else its key.

### `routing_nodes` — where conditions live
A routing node performs conditional branching or cloning. It **directs** data, never processes it. Same shape whether standalone or embedded on a destination.
```yaml
routing_nodes:
  serviceA_route:
    mode: exclusive             # exclusive (first-match) | clone (fan-out — see Decision 1)
    conditions:
      - { if: { field: http.url, exists: true }, to: webserver_es }
      - { if: { field: log.file.path, contains: nginx }, to: nginx_es }
      - { to: serviceA_es }     # catch-all (no `if`) — should be listed last
```
The `if` uses the **exact Streamlang condition shape** (`where`/`and`/`or`/`not`/`range`) — so it reuses `conditionToPainless()` unchanged and the existing Streamlang validation corpus doubles as routing-condition samples. A condition with no `if` is the catch-all.

### `destinations`
Destinations are **sinks** — **no `output`**. Onward movement is only via an optional **inner routing node** (same shape as a standalone one) for destination → destination routing; unmatched data stays in the destination (its built-in catch-all, which carries no processing). Destinations are **append-only** (`stream-topology-model.md`).
```yaml
destinations:
  logs_es:
    type: elasticsearch         # elasticsearch (M1); s3 (M2 — see stream-topology-model.md)
    index: logs-nginx
    # optional inner routing node for destination → destination routing:
    # routing_node: { mode: exclusive, conditions: [{ if: {...}, to: logs_error_es }] }
```
In the ES/KBN layer a destination lowers to a terminal data stream; an inner routing node lowers to that data stream's `@stream.reroutes`.

---

## Edge-evaluation semantics

Anchored to the **verified** ES `reroute` behavior (`ROUTING_AND_PROCESSING.md`) and the node-output model:

- **A plain `output` is unconditional.** A pipeline/source node hands its documents to the node(s) named in `output` with no condition. In the ES layer a single-entry `output` is a straight reroute to that node.
- **Conditions live only on routing nodes.** To branch, point a node's `output` at a routing node; the routing node's `conditions` are the branch.
- **`exclusive` = first-match-wins.** Conditions are evaluated top-to-bottom; the first matching `if` routes the document; a no-`if` catch-all should be last. This is native `reroute` (the doc leaves on first match).
- **`clone` = fan-out (model only; not on the ES path).** See Decision 1.
- **Processing before routing within a pipeline node.** A placement runs its definition's Streamlang steps, then hands off via `output` — mirrors the structural `@stream.processing → @stream.reroutes` hand-off.
- **Every node is physically a data stream, so any un-routed document is retained where it sits.** A document that matches no outbound condition is **stored in that node's own data stream** (`ROUTING_AND_PROCESSING.md`: "no match → document stays… and is indexed in" the current stream). This is the root of intermediate retention (Decision 2); at destinations the ADR formalizes it as the **catch-all**.

---

## Decided semantics (v0.2)

### Decision 1 — Routing modes: model has exclusive + clone; the ES execution layer ships exclusive-only
The ADR's routing node carries `mode: exclusive | clone`.
- **`exclusive` (first-match)** maps directly to native `reroute` and is fully supported on the ES/KBN path.
- **`clone` (fan-out)** is now part of the *model* — each clone branch becomes a separate emergent stream. But it is **not expressible on the ES execution layer**: ES ingest indexes a document exactly once and has no copy primitive. So the ES/KBN path implements **`exclusive` only** and rejects `clone` at validation; fan-out is properly a **managed-processing-service** capability (alongside S3/external destinations and decoupling), deferred here.

This is the v0.1 "no fan-out" decision **reframed**: it is now an honest **execution-layer limitation**, not a model-level decision. (Logical/view fan-out via overlapping ES|QL views remains technically cheap but is still deliberately not pursued in V1.)

### Decision 2 — Intermediate retention accepted (catch-all / node-local data streams)
Because every node is a data stream, a document matching no outbound condition is **retained where it sits**, and that is **allowed**. The ADR formalizes this at destinations as the **built-in catch-all** (no processing on the catch-all path). On the ES path the same holds for *any* node (source / pipeline / routing). Validation does **not** require a terminal catch-all; mid-graph retention is legal, not an error. Matches ES natively.
- **Consequence (observability):** "where did my data land?" is non-obvious, since any node can hold data. The product surface (Workstream B) should make per-node doc counts / landing visible.
- **Consequence (lifecycle):** retention/lifecycle config cannot live only on `destinations` — it may attach to any node. See Q4.

---

## Lowering to the ES/KBN execution layer

How the DSL compiles onto the **verified** objects (ties back to `streams_execution_layer_plan.md`):

| DSL concept | ES/KBN object |
|---|---|
| `source` | entry data stream + default `@stream.processing`; `output` → unconditional reroute to the named node |
| `pipeline_definition` | not a node — its Streamlang steps are transpiled into **each** placement's `@stream.processing` (one ES pipeline per placement ⇒ per-placement metrics, matching the ADR) |
| `pipeline` (placement) | data stream + `@stream.processing` (transpiled steps) + `@stream.reroutes` (the `output` hand-off) |
| `routing_node` (`exclusive`) | a node whose `@stream.reroutes` carries one `reroute` per condition, `if: conditionToPainless(cond.if)`, in list order; no-`if` catch-all = retained / unconditional-last |
| `routing_node` (`clone`) | **not expressible** — `reroute` indexes once; rejected at validation (deferred to the service) |
| `destination` (ES) | terminal data stream; built-in catch-all = its own data stream; inner routing node → its `@stream.reroutes` |
| node identity | a node in the new **graph-stream type** (Workstream A) — arbitrary flat id, **no parent-name guard**, **no name-based inheritance** ("graph-stream" is the *internal code* term; not user-facing) |

Crucially this is the *new parallel path*: nodes are graph-stream-type records, so none of the wired-stream hierarchy constraints (`isChildOf`, root-allowlist, parent guard, inheritance) apply. The routing-node conditions map directly onto the existing `{ destination, where }` reroute-generation shape the prototype reuses via a type-generalizing adapter (plan Step 4).

---

## Worked example (the `ROUTING_AND_PROCESSING.md` nginx scenario, node-output form)

```yaml
sources:
  otlp_in:
    type: otlp
    output: [serviceA_gate]        # source hands off to a routing node

pipeline_definitions:
  parse_serviceA:
    steps:
      - action: grok
        from: body.message
        patterns: ['%{IP:attributes.client_ip} %{WORD:attributes.method}']

routing_nodes:
  serviceA_gate:                   # only serviceA traffic continues; the rest is retained in otlp_in
    mode: exclusive
    conditions:
      - { if: { field: service.name, eq: serviceA }, to: serviceA_parse }
  serviceA_route:                  # post-processing branch
    mode: exclusive
    conditions:
      - { if: { field: http.url, exists: true },        to: webserver_es }
      - { if: { field: log.file.path, contains: nginx }, to: nginx_es }
      - { to: serviceA_es }        # catch-all: matched serviceA but neither child condition

pipelines:
  serviceA_parse:
    definition: parse_serviceA
    output: [serviceA_route]

destinations:
  nginx_es:     { type: elasticsearch, index: logs-serviceA-nginx }
  webserver_es: { type: elasticsearch, index: logs-serviceA-web }
  serviceA_es:                                   # per-node lifecycle override (Q4); others use cluster default
    type: elasticsearch
    index: logs-serviceA
    lifecycle: { dsl: { data_retention: 7d } }
```

This is the same routing tree from the research doc, but expressed as nodes wired by `output`, with conditions isolated on routing nodes, and **no node names encode hierarchy**. The streams are emergent — e.g. `otlp_in → serviceA_parse → nginx_es` is one stream, read off the graph, not authored.

Under **Decision 2 (intermediate retention)**, `serviceA_gate` deliberately has no catch-all: a non-`serviceA` document (e.g. serviceB, or metrics) matches no condition and is legally **retained in `otlp_in`'s own data stream**. That is allowed, not a validation error — the product surface is responsible for making that landing visible.

---

## Validation rules (graph integrity)

- **Referential integrity** — every `output` entry and every routing-node `condition.to` resolves to a declared node id.
- **Acyclic** — the graph must be a DAG (cycle detection; depth limit **(OPEN)** — replaces the old name-based `MAX_NESTING_LEVEL`).
- **Reachability** — every pipeline/routing-node/destination reachable from at least one source; warn on orphans.
- **Node edge rules** — sources have no inbound edges; **destinations have no `output`** (onward only via an inner routing node).
- **No `clone` on the ES path** — reject `mode: clone` at validation (execution-layer limitation, Decision 1).
- **Condition validity** — each routing-node `if` validates against the Streamlang condition schema.
- **Routing invariant — guideline, NOT enforced.** Per the ADR, any wiring is allowed (including shortcuts straight to a child/more-specific destination, bypassing a parent's processing). Data landing in a destination may have seen *different* processing depending on the path. Treat the field schema as additive (processing tends to add fields downstream) as a *composing* guideline, but do **not** reject wiring that violates it. (An opt-in constraint mode may be added later.) This ratifies the prototype's "drop completeness/validation gates" stance.

---

## Secondary decisions (PoC defaults — provisional, will change)

### Q1 — Pipeline reuse model → **definition/placement split (now canonical, per ADR)**
Adopted from the ADR: `pipeline_definitions` are reusable `{name, steps}` referenced *live by name*; `pipelines` are placements carrying `output`. Each placement lowers to its own data stream + processing pipeline (per-placement metrics). The same definition may back N placements; each placement gets an `id`. (This supersedes v0.1 Q1's deferred 1:1 model.)

### Q2 — Depth/complexity limits → **DAG correctness via cycle detection; soft path-depth guardrail**
Correctness rests on the **acyclic** check — that is the real requirement, replacing the old name-based `MAX_NESTING_LEVEL`. Add a *soft* max-routing-path-depth guardrail (PoC default: 10) to bound pathological chaining; it is tunable, not semantic.
- *Verify:* ES `reroute` is believed to carry its own loop/recursion protection as a backstop — confirm the exact behavior/limit against a live stack before relying on it.

### Q3 — Conditions → **on routing nodes only; allowed regardless of target type**
Conditions live exclusively on routing nodes (a plain `output` is unconditional). A routing node may target any node type (pipeline, destination, another routing node), and a source/pipeline may `output` to a routing node. This matches `reroute`'s `if`, which is indifferent to the target's type. First-match ordering applies across all of a routing node's conditions.

### Q4 — Lifecycle/retention → **optional per-node field; default = cluster/data-stream default**
Constrained by Decision 2 (any node retains data), `lifecycle:` is an optional field on **any** node, reusing the existing `IngestStreamLifecycle` shape (`{ dsl: { data_retention } }` or `{ ilm: { policy } }`) from `@kbn/streams-schema`. When omitted, a node falls back to the **cluster/data-stream default** — explicitly **not** name-based ancestor inheritance. Simple, unambiguous, no hierarchy.
- *Extension path:* if shared retention across many nodes becomes painful, add an explicit (non-name-based) default block — but only as an opt-in default, never implicit ancestor walking.

### Q5 — Naming the user sees → **streams are emergent (per ADR); nodes are the authored units**
There is **no top-level topology `name`** and no user-authored/named "stream." Users author **nodes** (sources, pipeline definitions/placements, routing nodes, destinations) and wire them via `output`; a *stream* is a source→destination path that *falls out* of the graph (tooling may generate a label, e.g. for a fan-out branch). The authored/visible units are the nodes; per-node backing data streams are an implementation detail. (This supersedes v0.1 Q5's "topology name is the listed unit.")
- *Terminology (ADR checklist):* use "topology" not "DAG"; "stream" = emergent path; do not expose "wired stream" / "graph stream" externally ("graph-stream" stays an internal *code* type name only).
- *Deferred to product:* the ADR notes management actions attach at different levels (retention→destination, processing→pipeline, auth→source); user-facing surfacing needs a dedicated session (Alex B + Luca).
