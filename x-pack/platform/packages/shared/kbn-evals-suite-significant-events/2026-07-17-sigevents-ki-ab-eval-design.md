# Design: A/B evaluation of Significant Events KIs (old vs old+new) on the Discovery agent

**Date:** 2026-07-17
**Author:** Lorena Balan (with Claude)
**Status:** Approved design — ready for implementation plan

## Problem

Lorena has a set of extra, custom Knowledge Indicators (KIs) generated via Agent Builder, currently living in a personal Elasticsearch index `.ab-generated-kis`. She wants to know whether giving the **Significant Events Discovery agent** access to **old + new KIs** (vs **old KIs only**) produces a **meaningful change in (a) the relevance/quality of the agent's answers and (b) token consumption**, for the otel-demo **`cart-redis-cutoff`** failure scenario.

## Key findings that shape the design

1. **`.ab-generated-kis` is not a product artifact.** It exists nowhere in the Kibana codebase — it's a user-created index. KI retrieval is **hardcoded** to the canonical data stream `.significant_events-knowledge_indicators` (`indicator_searcher.ts:202`, `revision_reader.ts:37`); there is no config/param to point an agent at a different index. **Therefore the A/B must vary the *contents* of the canonical data stream, not the index the agent reads.**
2. **The Discovery agent is the "answer" producer.** It retrieves KIs via the `search_knowledge_indicators` tool and emits a discovery document (root_cause, summary, impact, criticality, confidence, evidence). The KI *query generation* suite consumes KIs but emits ES|QL rules — no "answer" to judge — so it is **not** the right suite for measuring answer relevance.
3. **An end-to-end Discovery eval already exists:** `evals/discovery/discovery.spec.ts`. It replays captured KIs into `.significant_events-knowledge_indicators`, calls the agent over `/converse`, and scores the discovery doc with an LLM judge (`scenario_criteria`) + trace-based token/latency evaluators. ~90% of the needed machinery already exists.
4. **`cart-redis-cutoff` has no Discovery scenario yet.** It exists only in the `kiFeatureExtraction` (otel_demo.ts:436) and `kiQueryGeneration` (otel_demo.ts:948) dataset blocks. The `discovery:` block (otel_demo.ts:751) currently holds only `payment-unreachable`. **A `cart-redis-cutoff` `DiscoveryScenario` must be authored** — Lorena's in-progress local diff to `otel_demo.ts` (+251 lines around the discovery fixtures) is already doing this.
5. **Harness decision: kbn-evals only.** Orca (the Agent Builder eval framework, `/Users/lorenabalan/Code/elastic/orca`) can also target the discovery `/converse` agent and has nicer paired statistics + a `ki-relevance` evaluator, but does not emit token metrics today and would require rebuilding the dataset/target wiring. Chosen path is kbn-evals; Orca's `evaluation-analysis` skill remains an optional later add for statistical rigor (it can read the `kibana-evaluations` scores that kbn-evals emits).

## Design

### Component 0 — `cart-redis-cutoff` DiscoveryScenario (prerequisite)
Add a `DiscoveryScenario` to the `discovery:` block in `src/datasets/otel_demo.ts`, following the `payment-unreachable` example (line 754):
- `input`: `scenario_id: 'cart-redis-cutoff'`, `stream_name: 'logs'`, `detections[]` (the change-point detections that seed the episode).
- `output`: `criteria[]` (the relevance rubric the LLM judge scores against — the highest-leverage content), `expected_discoveries[]`, `expected_min_evidence_count`.
- `metadata`, `snapshot_source` as needed.
Reuse evidence signals already captured for cart-redis-cutoff in the query-gen scenario (otel_demo.ts:948+): Valkey/Redis connect failures in cart logs, cart crash/shutdown, gRPC UNAVAILABLE/ECONNREFUSED impact in frontend.

### Component 1 — KI-set A/B dimension in `discovery.spec.ts`
Add a dimension `KI_SET ∈ {'old', 'old+new'}`, modeled on the existing `groundingMode` loop, running **one `runExperiment` per value** (separate experiment → clean per-variant trace/token attribution). Per-scenario setup, before `converse`:
- Reset `.significant_events-knowledge_indicators` to a clean state (the suite already cleans/resets streams per scenario).
- **`old`:** replay the scenario's baseline KIs into the data stream (existing `replayKnowledgeIndicatorsSnapshot` path).
- **`old+new`:** baseline KIs **plus** the ab-generated KIs indexed into the **same** data stream.
- Guarantee variant isolation: `old`'s data must not leak into `old+new`.

New-KI sourcing (pick one; code fixture is simplest):
- **(a) Code fixture:** an array of KI docs (`type:'feature'`/`'query'` matching the `data_stream.ts` mapping) `esClient.index`ed into the canonical stream. The `search_embedding` `semantic_text` field auto-embeds on ingest.
- **(b) Snapshot capture:** capture the ab-generated KIs into a snapshot index and replay alongside the baseline.

### Component 2 — Evaluators (all reuse)
- **Relevance/quality:** `scenario_criteria` (against the cart-redis-cutoff criteria); optionally add `evaluators.correctnessAnalysis()` + `groundednessAnalysis()` for explicit relevance/factuality; plus discovery CODE evaluators (grouping correctness, evidence collection, esql grounding, tool usage).
- **Cost:** `traceBasedEvaluators.{inputTokens,outputTokens,cachedTokens}`, `toolCalls`, latency. Requires tracing/EDOT setup (suite README) or tokens return `null`.

### Component 3 — Run & compare
```
node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet evals_tracing
SIGEVENTS_DATASET=otel-demo node scripts/evals run --suite significant-events \
  --project <connector> --judge <gemini-3-pro> --repetitions 3 discovery.spec.ts
```
Keep dataset/example IDs identical across variants so `scripts/evals compare <exp-old> <exp-old+new>` auto-pairs (it pairs only on overlapping dataset + example IDs); otherwise compare manually. Read deltas on criteria score, correctness/groundedness, and tokens.

## Risks / guardrails (where this goes wrong)
1. **Embedding parity** — new KIs must land in the canonical stream so its `semantic_text` field embeds them; keyword-only matches rig the comparison.
2. **Retrieval limit** — `search_knowledge_indicators` caps results (~20, `search.ts:19`). New KIs change the answer only if they rank into the top-N. Inspect *which* KIs were retrieved per run; a null delta may mean "not retrieved," not "not useful."
3. **KI identity/TTL** — indexed KIs need fresh `@timestamp` + no/future `expires_at`, and `id`s that don't collide with existing KIs (append-only + latest-per-id means a colliding id silently supersedes).
4. **Variance** — `--repetitions ≥3`; a single-run delta is likely noise. (Statistical significance across repetitions is the point where Orca's `evaluation-analysis` skill would slot in.)
5. **Fair superset** — `old+new` = `old` ∪ `new`, so any token increase is cleanly attributable to the added KIs.

## Success criteria
- Two comparable Discovery experiments (`old`, `old+new`) on `cart-redis-cutoff`, ≥3 repetitions each, with tracing enabled.
- Per-variant metrics for: relevance (scenario_criteria ± correctness/groundedness), discovery quality (grouping/evidence/grounding), and tokens (input/output/cached) + latency.
- A comparison (auto-paired or manual) reporting the delta on relevance and tokens, plus a retrieval check showing whether the new KIs were actually surfaced.

## Out of scope
- Changing product code to make KI retrieval index-configurable.
- Evaluating the Investigation agent or KI query generation (different questions).
- Full Orca end-to-end wiring (kept as an optional later enhancement for stats).
