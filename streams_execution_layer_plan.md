# Plan: ES/KBN-First Execution Layer for Streams Processing

A plan to execute the recommendation in **RFC: Execution layer architecture for processing** (owners: João Duarte, Andrew Cholakian): build a Streams processing/routing implementation on top of today's Elasticsearch + Kibana primitives, **in parallel** with the managed processing service, starting with a de-risking PoC.

## Scope guard

- This plan addresses **timing only** — whether to build the ES/KBN path now rather than waiting for the managed processing service. It does **not** relitigate *whether* to build the managed service; that is settled and out of scope (the RFC draws this line explicitly).
- Rationale framing is **speed-of-proof**: prove the Streams experience end-to-end faster and surface hard-to-anticipate shortcomings cheaply. We deliberately do **not** justify this work as "the self-managed story" — that conflicts with the decided `cloud-serverless-first.md` ADR (on-prem/ECK deferred beyond V1; "do not design V1 with on-prem constraints"). See Workstream C.
- Target end-state for reconciliation is the decided topology model: a stream is the full `source → pipelines → routes → destinations` DAG, with **pipelines and routing as separate, reusable concepts** (`stream-topology-model.md`).

---

## Status snapshot (decisions locked this session)

The gating risk is **answered by source analysis** and the approach is decided; what remains is empirical confirmation, which *is* the prototype.

- ✅ **Gating risk resolved (PoC-1):** ES `reroute` is hierarchy-agnostic — graph routing needs no new routing mechanism. The hierarchy coupling is entirely Kibana-side (validation gates, parent-name guard, name-based inheritance), all in `@kbn/streams-schema` / `wired_stream.ts`.
- ✅ **Approach decided:** a **new parallel graph-stream `type`** beside `wired`/`classic`/`query`; `WiredStream` left untouched (strangler-fig, zero regression). No parent-name guard, no name-based inheritance on the new path.
- ✅ **tree-vs-DAG resolved by design:** no inheritance ⇒ no fan-in ambiguity.
- ✅ **DSL strawman drafted** (`streams_graph_dsl.md`) with foundational decisions locked: **exclusive routing, no fan-out** (physical copy → service; logical view fan-out deliberately not pursued); **intermediate retention accepted**; and five provisional PoC defaults (pipeline reuse 1:1, DAG cycle + soft depth guardrail, conditions on every edge, per-node lifecycle defaulting to cluster default, topology `name` as the listed unit).
- ⏳ **Remaining:** empirical confirmation on a live stack (`_ingest/_simulate` + real reroute across a non-child data stream) — folded into the **Prototype build sequence** below.

---

## Phase 0 — De-risking PoC (gating)

The RFC's explicit stance: "embark on a PoC ASAP to find out if there are critical shortcomings that are hard to anticipate." Phase 0 is the center of gravity. **No UI / YAML / API investment proceeds until the gating risk below is answered.**

### PoC-1 (MAKE-OR-BREAK): Can ES `reroute` express a non-hierarchical graph topology?

This is the single assumption that can invalidate the whole ES/KBN path. Today's wired streams (per `ROUTING_AND_PROCESSING.md`):
- Route via the ES `reroute` ingest processor, which is **name/destination-based and hierarchical** — it reroutes to a data stream that must already exist.
- Enforce **child-only routing** (destination name must be `parent + "."`), **same-root**, and **max 5 nesting levels**.
- Fuse processing and routing structurally: the `@stream.processing` pipeline always hands off to `@stream.reroutes` as its final step (processing always runs before routing).

The target model (`stream-topology-model.md`) requires the opposite: arbitrary graphs where a destination need **not** be a child of the parent, and pipelines **separable** from routing for reuse.

**PoC tasks:**
1. ✅ **DONE — constraints located and verified in source** (see "Verified findings" below).
2. ✅ **DONE (source analysis) — relax points identified; arbitrary-root gate is a single validation check** (see "PoC-1 task 2/3 result").
3. ✅ **DONE (source analysis) — `reroute` is hierarchy-agnostic; the real ES-layer blocker is the parent-name guard, not `reroute`** (see below). ⏳ Empirical `_ingest/_simulate` confirmation pending a live stack.
4. Prototype **separating** a reusable pipeline from routing — confirm whether the processing→reroute hand-off can be decoupled without losing the "processing before routing" guarantee where it's still wanted.
5. ~~GATING DECISION — tree-vs-DAG.~~ **RESOLVED BY DESIGN** (see "Chosen approach" below). The tree-vs-DAG fork only mattered because of *inheritance ambiguity* (which parent's fields/settings/lifecycle win under fan-in). The chosen approach gives the new graph-stream path **no name-based inheritance**, so there is nothing to resolve ambiguously — DAG/fan-in is unproblematic. The hard branch evaporates.

**Verified findings (PoC-1 task 1, confirmed in source):**

The hierarchy/routing constraints live in `@kbn/streams-schema`, not the state machine itself — the state machine consumes them. This means relaxing them is a **schema-package change with repo-wide blast radius**, not a localized edit.

| Constraint | Verified value | Source |
|---|---|---|
| `ROOT_STREAM_NAMES` | exactly `['logs', 'logs.otel', 'logs.ecs']` | `kbn-streams-schema/src/shared/hierarchy.ts:11-15` |
| `MAX_NESTING_LEVEL` | `5` | `hierarchy.ts:189` |
| Supported-root gate | every wired stream must be under a known root (`hasSupportedStreamsRoot`) | validation at `wired_stream.ts:420`; impl `root_stream_definition.ts:43` |
| Child-only routing | destination must satisfy `isChildOf(parent, dest)` — same root, `dest.startsWith(parent + ".")`, exactly one extra segment | enforced `wired_stream.ts:530-539`; impl `hierarchy.ts:36-58` |
| Same-root | cross-root routing structurally impossible (`getRoot(parent) !== getRoot(child)` ⇒ not descendant) | `hierarchy.ts:44` |
| Max-depth enforcement | `getSegments(name).length > MAX_NESTING_LEVEL` ⇒ reject | `wired_stream.ts:436-447` |

**New finding not in the research docs — bidirectional routing-completeness coupling:** `wired_stream.ts:543-559` rejects any desired-state stream that *is* a structural child of this stream but is **not** present in this stream's `routing` array ("Child stream X is not routed to from its parent"). Routing is therefore tightly coupled to the name hierarchy in **both** directions: a child must be name-prefixed under its parent **and** the parent must explicitly route to it. A graph topology where routing is decoupled from naming has to unwind this two-way invariant, not just the one-way child-prefix check. This raises the cost estimate for Workstream A.

**Nuance worth noting:** `getParentId`/`matchesAnyRoot` already contain a generic-hierarchy fallback for names outside known roots (`hierarchy.ts:101-118`) — so some plumbing for arbitrary roots exists, but the `hasSupportedStreamsRoot` validation gate (`wired_stream.ts:420`) forbids them today. The relax point is the validation gate + `isChildOf` routing check, not the parent-resolution plumbing.

### PoC-1 task 2/3 result — the gating risk is ANSWERABLE; the blocker is the guard, not `reroute`

Two ES ingest pipelines are generated per wired stream. Tracing what each emits resolves the make-or-break question:

**1. The `reroute` pipeline is already hierarchy-agnostic.** `generate_reroute_pipeline.ts:30-37` emits `{ reroute: { destination: child.destination, if: <painless> } }`. `destination` is a plain string passed straight through; ES's `reroute` processor accepts **any** target data stream name and has **zero** knowledge of stream hierarchy (consistent with `ROUTING_AND_PROCESSING.md`: "Elasticsearch has no knowledge of the stream hierarchy and would accept any pipeline targeting any data stream name"). **Conclusion: the routing-execution layer needs no change for graph topology** — hand it a non-child destination and it routes there.

**2. The parent-name guard IS the real ES-layer blocker.** `generate_ingest_pipeline.ts:57-73` injects, into every non-root wired stream's processing pipeline:

```painless
if (ctx["stream.name"] != params.parentName) { throw new IllegalArgumentException(...); }
```

with `parentName: getParentId(definition.name)` — a **single, name-derived parent**. Walk the failure through for a graph edge where stream `A` routes to stream `B` and `B` is *not* `A`'s name-child:
- `A`'s pipeline stamps `stream.name = "A"`, then reroutes to `B`.
- `B`'s processing pipeline runs its guard, expecting `stream.name == getParentId("B")`. Since `B`'s name-derived parent ≠ `"A"`, the guard **throws and the document is rejected.**

So arbitrary graph routing fails today **at the destination's guard, not at `reroute`.** This is precisely the "hard-to-anticipate shortcoming" the RFC's PoC was meant to surface — and it is findable by source analysis alone.

**Implication.** The guard's only job is a safety property: stop documents being injected directly into a mid-graph node, bypassing upstream processing/routing. The chosen approach (below) **does not generate this guard at all** on the new graph-stream path — mid-graph injection protection is explicitly out of scope at this stage. So the guard is not an obstacle to design around; it simply isn't emitted on the new path.

**3. The guard is one symptom of a deeper coupling: name-derived ancestry drives the entire inheritance model.** The guard was the first instance found, but it is not the whole story. The same name-based `getParentId`/`getAncestors` walk underpins the full inheritance machinery in `wired_stream.ts`:
- **Field inheritance** — `getInheritedFieldsFromAncestors(ancestors)` (~649-653), where `ancestors` is computed name-based via `isDescendantOf` (606-624).
- **Settings inheritance** — `getAncestorsAndSelf` → `getInheritedSettings` (691-697).
- **Create actions** — `getAncestorsAndSelf` drives inherited lifecycle / settings / failure-store (804-814).
- **Field-conflict validation** up and down the name chain — `validateAncestorFields` / `validateDescendantFields` (626-635).
- **Draft ES|QL views** — `getWiredStreamViewQuery(name, destinations)` (896, 1002).

Every one derives the chain **from the name**. The moment routing destinations diverge from names, all of them compute the *wrong* ancestry — not just the guard. Trying to *rebase* this inheritance machinery onto the routing graph in place would be the larger (and riskiest) half of the work, and under DAG/fan-in it forces a multi-parent resolution design. **The chosen approach avoids this entirely by not carrying name-based inheritance onto the new path** (see below).

### Chosen approach — a parallel graph-stream path (do NOT mutate wired streams in place)

Rather than rebasing the existing `WiredStream` inheritance/guard machinery, introduce a **new, parallel stream construct** beside `wired`/`classic`/`query` and leave `WiredStream` completely untouched. This is a strangler-fig migration path: zero regression risk to the shipped `logs.*` experience, and it sidesteps the two hardest couplings instead of fighting them.

**Why this is alignment, not a shortcut.** `stream-topology-model.md` describes a flat `source → pipelines → routes → destinations` DAG with pipelines/routing as separate concepts and composite append-only destinations. It says **nothing** about name-derived field/settings inheritance — that is a wired-streams-*today* concept, not a target-model one. A new path with explicit per-node config and no name inheritance is therefore *closer* to the ADR than today's wired streams.

**What the new path reuses unchanged:** the two-pipeline pattern, `reroute` generation (already hierarchy-agnostic), the `State`/`ExecutionPlan` desired-state engine, Streamlang→ingest-pipeline transpilation, and the per-stream ES asset set (component template, index template, data stream, `.streams` doc).

**What the new path drops or overrides:**
- **Validation** — no `isChildOf`, no `hasSupportedStreamsRoot`/root-allowlist, no bidirectional routing-completeness. Names are plain identifiers; routing destinations are arbitrary.
- **Parent-name guard** — **not generated** on this path. Mid-graph injection protection is explicitly **out of scope at this stage** (owner decision). Documents may be written directly to any node's data stream; we accept that for now.
- **Inheritance** — **none.** Each node defines its own fields/settings/lifecycle/failure-store explicitly. No `getAncestors`-based computation. This is what dissolves the tree-vs-DAG problem: with nothing inherited, fan-in has nothing to resolve ambiguously.

**Net verdict on the gating risk:** the ES execution layer **can** express graph routing — `reroute` is hierarchy-agnostic, no new routing mechanism is required. By adding a parallel graph-stream type (no guard, no inheritance) rather than rebasing wired streams, the Kibana-side cost drops to a **bounded, additive change** with no regression surface on the shipped product and no multi-parent inheritance design problem. **Remaining empirical step:** confirm with `POST /_ingest/_simulate` (and a real reroute across a non-child data stream) once a live stack is available — to validate no second-order ES behavior (e.g. failure-store interaction, `field_access_pattern`) bites.

**Exit gate:** a written finding — *can ES `reroute` + relaxed Kibana constraints express the target graph topology, yes/no, and at what cost?* A "no" or "only with a parallel routing mechanism" result feeds directly back into the RFC decision and may shift weight toward waiting for the service.

### PoC-2: Multi-root / arbitrary-data-type enablement

- Exercise enabling non-`logs` roots end to end (component template → index template → processing pipeline → reroute pipeline → data stream → `.streams` doc), per the fork object inventory in `ROUTING_AND_PROCESSING.md` and `streams_crud.md`.
- Confirm the `State.attemptChanges()` execution-plan flow tolerates arbitrary roots without `logs`-specific assumptions.

### PoC-3: Processing parity smoke test

- Confirm Streamlang → ingest-pipeline transpilation (`@kbn/streamlang`) covers the processing steps needed for a representative end-to-end flow, and that draft-mode ES|QL views still resolve.
- **Validation corpus (use, don't invent):** `kbn-streamlang/src/transpilers/shared/mocks/test_dsls.ts` is a maintained set of `StreamlangDSL` samples already exercised against **both** transpile targets (ingest pipeline *and* ES|QL) — exactly the dual-target property the new path needs (ingest time + draft-mode ES|QL views). Reuse it as the PoC corpus:
  - `comprehensiveTestDSL` — ~20 steps spanning grok, dissect, date, convert, rename, set, math, uri_parts, network_direction, registered_domain, join, concat, append, case ops, drop_document, the `manual_ingest_pipeline` escape hatch, plus inline `where`, nested `condition` blocks, and boolean/`and`/`or` conditionals.
  - `notConditionsTestDSL` — `not` condition coverage.
  - `typeCoercionsTestDSL` — string/number/boolean coercion and `range` comparisons.
  - `manualIngestPipelineTestDSL` — escape-hatch with `if`/`on_failure`/`tag`/`ignore_failure`.
  - 26 action types exist in total (`append, concat, convert, date, dissect, drop_document, enrich, grok, join, json_extract, lowercase, manual_ingest_pipeline, math, network_direction, redact, registered_domain, remove, remove_by_prefix, rename, replace, set, sort, split, trim, uppercase, uri_parts`); ones not in the comprehensive DSL (`enrich`, `redact`, `json_extract`, `remove`, `sort`, `split`, `remove_by_prefix`) have dedicated per-processor test DSLs under the same `transpilers/*/processors/` trees.
  - **Routing-condition reuse:** the `where`/`condition` blocks in these DSLs are the same shape `generateReroutePipeline` feeds to `conditionToPainless` — so the corpus doubles as routing-condition samples for the graph-routing PoC, not just processing.

---

## Prototype build sequence (next actions)

Goal: a runnable end-to-end PoC that **creates a graph topology, ingests sample docs, and proves exclusive routing + processing + intermediate retention** on the ES/KBN path — closing the remaining empirical gate and laying the Workstream A foundation. Do this on a throwaway/experimental branch behind a feature flag; correctness over polish.

**Authoring model for the prototype:** the graph DSL (`streams_graph_dsl.md`) **lowers to N per-node definitions** — each node (source/pipeline/destination) becomes one graph-stream definition carrying its own `routing` edges to arbitrary destinations. This reuses the existing per-stream machinery maximally; the DSL is the authoring surface, per-node definitions are what the state machine consumes.

**Pre-flight findings (verified in source before writing schema):**
- **`composed_of` is the real template-level inheritance coupling — must override.** `generate_index_template.ts:34` builds the index template's `composed_of` chain by walking `getAncestorsAndSelf(name)` (`['logs@stream.layer', 'logs.otel@stream.layer', …]`) — i.e. name-derived component-template inheritance, the ES-template analogue of the field/settings inheritance. The new graph-stream type **must generate a standalone `composed_of`** (the node's own `@stream.layer` only), not the ancestor walk. (`generateLayer` itself emits a single per-stream template and is fine.)
  - *Corollary:* prototype node ids should be **flat / non-dotted** (e.g. `serviceA_parse`, `nginx_es`) so they can't accidentally resolve name-ancestry; combined with the `composed_of` override this makes nodes cleanly standalone. (A single-segment name is already a root to `getAncestorsAndSelf`, so it naturally yields a standalone chain.)
- **`generateReroutePipeline` needs a thin adapter, not as-is.** It is typed to `WiredStream.Definition` and reads `definition.ingest.wired.routing`. **Decision for the prototype: mirror the wired routing shape** `{ destination, where, status }` on the new per-node definition, so reroute generation (and `conditionToPainless`) reuse with only a type generalization rather than a parallel generator.

| # | Step | Concrete target | Proves / de-risks |
|---|------|-----------------|-------------------|
| 0 | Local stack + feature flag | `yarn start` ES+Kibana; flag-gate the new type | environment for empirical confirmation |
| 1 | New graph-stream `type` schema | Zod model in `@kbn/streams-schema` (per-node definition: own fields/settings/lifecycle + `routing` edges) | the additive schema; no hierarchy fields |
| 2 | New `StreamActiveRecord` subclass | `state_management/streams/graph_stream.ts` (register in `stream_from_definition.ts`) | parallel path; `WiredStream` untouched |
| 3 | Validation override | `doValidateUpsertion`: drop `isChildOf`/`hasSupportedStreamsRoot`/completeness; **add DAG cycle + soft depth check** | arbitrary roots + non-child routing accepted |
| 4 | Pipeline generation variant | guard-less processing pipeline (omit `generate_ingest_pipeline.ts:57-73` guard); reuse `generateReroutePipeline` **via a type-generalizing adapter** (mirror wired `{destination,where,status}` routing shape), fed graph edges | the verified make-or-break: non-child reroute works |
| 5 | Create actions, no inheritance | `doDetermineCreateActions`: **override `generateIndexTemplate` so `composed_of` is standalone (own `@stream.layer` only), not the `getAncestorsAndSelf` walk** (`generate_index_template.ts:34`); reuse `generateLayer`; data stream, `.streams` doc; **no `getAncestors`/`getInheritedSettings` calls** | explicit per-node config; the verified template-level coupling |
| 6 | End-to-end run | load the worked nginx topology from `streams_graph_dsl.md`; `_ingest/_simulate` then real ingest using the `test_dsls.ts` corpus | **closes PoC-1/2/3 empirically**: routing + processing + intermediate retention; watch `field_access_pattern` / failure-store second-order behavior |
| 7 | (optional) Thin DSL loader | YAML graph DSL → per-node definitions | round-trip authoring, sets up Workstream B |

**Likely-zero-new-action-types:** Step 5 should reuse existing `ExecutionPlan` action types (`upsert_component_template`, `upsert_index_template`, `upsert_ingest_pipeline`, `upsert_datastream`, `upsert_dot_streams_document`). If a graph node needs an action the plan can't express, that's a finding worth recording.

**Exit criteria for the prototype:** a serviceA doc routes through `serviceA_parse` → matches the nginx condition → lands in `nginx_es` with processing applied; a non-matching doc is retained in the source node (intermediate retention); no parent-guard rejection occurs. That empirically confirms the headline finding.

---

## Phase 1 — Workstreams (gated on Phase 0 exit)

### Workstream A — New parallel graph-stream type (additive; `WiredStream` untouched)
The reference architecture is a parallel construct, not an in-place rewrite (see "Chosen approach"). All of the below sits behind a feature flag and leaves `wired`/`classic`/`query` streams unmodified.

- **New `StreamActiveRecord` subclass + discriminated `type`.** Add a new stream type beside `WiredStream`/`ClassicStream`/`QueryStream` in `state_management/streams/`, with its own schema in `@kbn/streams-schema`. Reuse `State`/`ExecutionPlan` so ES and Kibana state stay co-derived.
- **Validation override — no hierarchy checks.** The new subclass's `doValidateUpsertion` omits `isChildOf`, `hasSupportedStreamsRoot`, the bidirectional routing-completeness check, and name-based depth. Add instead: **routing cycle/depth guards** on the graph (the only new validation actually needed — see open question in `stream-topology-model.md`).
- **No parent-name guard.** The new path's `generateIngestPipeline` equivalent does **not** emit the `stream.name == parentName` guard (`generate_ingest_pipeline.ts:57-73`). Mid-graph injection protection is explicitly deferred. Reuse `reroute` generation **as-is** — it is already hierarchy-agnostic.
- **No name-based inheritance — explicit per-node config.** Do not call `getAncestors`/`getInheritedSettings`/`getInheritedFieldsFromAncestors`. Each node carries its own fields/settings/lifecycle/failure-store. **Verify `generateLayer` (component-template composition) does not assume ancestor templates** — on the new path each node's component template must be standalone. (This is the one reuse point most likely to carry a hidden hierarchy assumption — check early.)
- **Pipeline / routing separation** (folds in the former Workstream B): model pipelines as reusable units independent of routing, per the topology ADR. Keep the processing→reroute hand-off only where the "processing before routing" guarantee is wanted; otherwise expose routing as its own construct.

### Workstream B — Shared product surface (common to ES-only AND service paths)
- Streams UI / canvas (evolve existing experience — `canvas-design.md`, no parallel V2).
- **YAML model generation** with round-trip fidelity — a decided requirement (`canvas-design.md`, GitOps). Note the new path's explicit-per-node config (no inheritance) shapes this schema directly. **Strawman complete: see `streams_graph_dsl.md`** (`sources`/`destinations`/`pipelines`/`routing` graph DSL) — both foundational decisions locked (exclusive routing/no fan-out; intermediate retention) and five secondary PoC defaults resolved.
- User-facing Kibana Streams composition API.
- These are built once and reused regardless of execution layer; sequence them after PoC-1 clears.

### Workstream C — ADR reconciliation (decision-track, runs alongside, needs named owners)
Surface and resolve the three tensions explicitly so reviewers don't relitigate them:
1. **Cloud-first vs. self-managed framing** — reconcile with `cloud-serverless-first.md`. Confirm this work is justified as speed-of-proof, not as the on-prem story. *Owner: cloud-first decision owners (Andrew Wilkins + Felix Barnsteiner).*
2. **Metering point** — `processing-metering.md` moves metering from ES-ingestion to managed inputs (from M1). An ES-only path can only meter at the old ES-ingestion point, which is the "odd separate SKU" problem the RFC flags. Decide how (or whether) ES-path processing is metered/billed. *Owner: Dima Ismalov / Perk.*
3. **Input protocols** — ES-only path is limited to protocols ES natively serves. Note `/_async_bulk` is a *managed-input receiver* (`async-bulk-endpoint.md`), not native ES `_bulk`; confirm which input protocols the ES/KBN PoC actually exercises. *Owner: João Duarte + Andrew Cholakian.*

---

## Known V1-scope limitations (acceptable, not blockers)

- **No S3 / external destinations.** ES-only writes to ES — but `stream-topology-model.md` puts S3 in **M2** and ES-only in **M1**, so this is out of V1 scope regardless. Not a blocker for the ES/KBN path.
- **No managed-input-only protocols / decoupling.** Queueing/WarpStream decoupling, COGS efficiency, and scaling beyond ES capacity are explicitly service-only and remain unresolved by the ES implementation (per RFC "Issues not resolved").
- **No mid-graph injection protection.** The new graph-stream path does not emit the parent-name guard, so documents can be written directly to any node's data stream, bypassing upstream processing/routing. Accepted at this stage (owner decision); revisit if/when the path moves toward GA.
- **No field/settings/lifecycle inheritance on the new path.** Each node is configured explicitly. This is a deliberate divergence from wired-streams behavior — simpler and unambiguous, but more verbose for users. It also shapes the YAML schema and component-template composition (Workstream A/B).

## Migration-path consequences (own these explicitly)

- **Two stream models coexist** during migration: hierarchical `WiredStream` (`logs.*`, unchanged) and the new graph-stream type. This is intentional (strangler-fig) but carries maintenance + conceptual surface-area cost. **A future decision must own convergence:** migrate `logs.*` onto the new path, or keep wired streams as a permanent special case. Out of scope for this plan; flagged so it isn't forgotten.

---

## Decision checkpoint

After Phase 0, reconvene on the RFC decision with the PoC-1 finding as the deciding input:
- **Reroute/graph works at acceptable cost** → proceed with Phase 1 ES/KBN implementation in parallel with the service.
- **Reroute/graph does not work cleanly** → reassess; the fast-V1 argument weakens and waiting for the service gains weight.

---

## Source references

- Codebase research: `ROUTING_AND_PROCESSING.md`, `streams_apis.md`, `streams_crud.md`
- Decided ADRs (`../ingest-spec/docs/decisions/`): `stream-topology-model.md`, `cloud-serverless-first.md`, `processing-metering.md`, `async-bulk-endpoint.md`, `auth-model.md`, `canvas-design.md`
- State machine entry points to verify in PoC: `x-pack/platform/plugins/shared/streams/server/lib/streams/state_management/state.ts`, `.../execution_plan/execution_plan.ts`
