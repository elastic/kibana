# Significant Events KI A/B Evaluation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Measure whether giving the Significant Events **Discovery agent** access to **old + new KIs** (vs **old KIs only**) meaningfully changes discovery answer relevance and token consumption, on the otel-demo `cart-redis-cutoff` scenario, using the existing kbn-evals discovery suite.

**Architecture:** Add an env-var-gated A/B dimension (`SIGEVENTS_KI_SET`) to the existing `evals/discovery/discovery.spec.ts`. Both variants replay the scenario's baseline KIs into `.significant_events-knowledge_indicators`; the `old+new` variant additionally bulk-indexes a repo-committed fixture of the extra KIs into the same data stream before the agent runs over `/converse`. Reuse the suite's existing LLM-judge + trace-based token evaluators; run twice (once per variant) over an identical dataset and compare.

**Tech Stack:** TypeScript, `@kbn/evals` + `@kbn/scout` (Playwright-based eval runner), Elasticsearch JS client, otel-demo snapshots from GCS.

## Global Constraints

- **Do NOT commit, stage, or push.** Leave all changes in the working tree; report each task's diff for the user to review and commit themselves. (Execution decision: no-commit; the "Commit" steps in tasks below are superseded — skip them.)
- **Secrets:** the ES API key used to export `.ab-generated-kis` is provided at runtime via env var, used transiently, and MUST NOT be written to any file, committed, logged, or saved to memory.
- The discovery agent retrieves KIs by `kind` + `stream_names` (never `search_text`), so semantic `search_embedding` is irrelevant here — do NOT add embeddings to injected KIs.
- Injected KI docs MUST satisfy the reader's filters to be visible: `deleted` absent/false, `excluded` absent/false, `expires_at` in the future, and a unique logical `id` (storage is append-only + latest-per-id; a colliding `id` silently supersedes).
- `old+new` MUST be a strict superset of `old` (same baseline replay in both), so any token delta is attributable only to the added KIs.
- Keep dataset `name` and example `id`s identical across the two variants so `scripts/evals compare` can auto-pair them.
- Canonical KI data stream: `.significant_events-knowledge_indicators` (exported as `KNOWLEDGE_INDICATORS_DATA_STREAM` from `src/data_generators/snapshot_indices.ts`).
- Suite tsconfig for type-checking: `x-pack/platform/packages/shared/kbn-evals-suite-significant-events/tsconfig.json`.
- Discovery scenarios live in the `discovery:` array of `src/datasets/otel_demo.ts`; today it contains only `payment-unreachable`.

---

### Task 1: Author the `cart-redis-cutoff` DiscoveryScenario

Add the scenario the discovery agent will be evaluated on. (Lorena's local diff is already adding this — this task is to finish/verify it against the `DiscoveryScenario` shape.)

**Files:**
- Modify: `src/datasets/otel_demo.ts` (the `discovery:` array, currently starting ~line 751, and a discovery fixture constant near the top like `PAYMENT_UNREACHABLE_CASCADE_DISCOVERY` ~line 38)
- Reference (shape): `src/datasets/types.ts:92-116` (`DiscoveryScenario`)

**Interfaces:**
- Produces: a `DiscoveryScenario` with `input.scenario_id === 'cart-redis-cutoff'` in `otelDemoDataset.discovery`. Consumed by `discovery.spec.ts` (it iterates `dataset.discovery`).

- [ ] **Step 1: Add a cart-redis-cutoff `Partial<Discovery>` fixture constant** near the other discovery fixtures at the top of `otel_demo.ts`

```ts
const CART_REDIS_CUTOFF_DISCOVERY: Partial<Discovery> = {
  kind: 'discovery',
  discovery_slug: 'cart-valkey-connectivity',
  title: 'Cart Service — Valkey store: connection refused',
  root_cause:
    'cartservice is failing because its Valkey/Redis backing store is unreachable (connection refused), so cart operations error and the service crashes.',
  summary:
    'cartservice: cart operations failing. Checkout/frontend users cannot retrieve carts. Redis/Valkey connectivity lost; cart crashes then frontend sees gRPC UNAVAILABLE. Restore Valkey connectivity / roll back the cart cache change.',
  criticality: 80,
  confidence: 0.8,
  stream_names: ['logs'],
  rule_names: ['Cart Valkey Connection Failures'],
  cause_kis: [{ name: 'cart', stream_name: 'logs' }],
  detections: [
    {
      rule_name: 'Cart Valkey Connection Failures',
      rule_uuid: 'c3d4e5f6-5555-4a5b-8c9d-0e1f2a3b4c70',
      stream_name: 'logs',
      change_point_type: 'spike',
    },
  ],
};
```

- [ ] **Step 2: Add the `DiscoveryScenario` to the `discovery:` array**

```ts
{
  input: {
    scenario_id: 'cart-redis-cutoff',
    stream_name: 'logs',
    detections: CART_REDIS_CUTOFF_DISCOVERY.detections!,
  },
  output: {
    criteria: [
      {
        id: 'root-cause-valkey',
        text: 'Must identify that cartservice lost connectivity to its Valkey/Redis backing store (evidence: cart logs "Wasn\'t able to connect to redis", "fail cartservice.cartstore.ValkeyCartStore").',
        score: 3,
      },
      {
        id: 'cart-crash',
        text: 'Should note the cart service crash/shutdown ("Application is shutting down") as part of the episode.',
        score: 2,
      },
      {
        id: 'frontend-impact',
        text: 'Should capture the upstream user impact in frontend (gRPC code 14 UNAVAILABLE, ECONNREFUSED, "failed to get user cart during checkout").',
        score: 2,
      },
    ],
    expected_min_evidence_count: 1,
    expected_ground_truth: 'discoveries=[cart-valkey-connectivity]',
    expected_discoveries: [CART_REDIS_CUTOFF_DISCOVERY],
  },
  metadata: {
    difficulty: 'medium',
    failure_domain: 'cart',
    failure_mode: 'redis_cutoff',
  },
},
```

- [ ] **Step 3: Type-check the suite**

Run: `node scripts/type_check --project x-pack/platform/packages/shared/kbn-evals-suite-significant-events/tsconfig.json`
Expected: PASS (no type errors).

- [ ] **Step 4: Verify the scenario is collected by the discovery spec (canonical mode, no server needed for collection log)**

Run: `SIGEVENTS_DATASET=otel-demo node scripts/evals run --suite significant-events --dry-run discovery.spec.ts`
Expected: command prints the resolved run without error, referencing the otel-demo discovery suite. (Full run happens in Task 4.)

- [ ] **Step 5: Commit (with approval)**

```bash
git add x-pack/platform/packages/shared/kbn-evals-suite-significant-events/src/datasets/otel_demo.ts
git commit -m "test(sigevents-evals): add cart-redis-cutoff discovery scenario"
```

---

### Task 2: Create the extra-KIs fixture + injection helper

Add a repo fixture holding the "new" KIs and a helper that bulk-indexes them into the canonical KI data stream with correct freshness/TTL, mirroring the reindex stamping in `replay_knowledge_indicators_snapshot.ts`.

**Files:**
- Create: `src/data_generators/extra_knowledge_indicators/cart_redis_cutoff_extra_kis.json`
- Create: `src/data_generators/extra_knowledge_indicators/index.ts`
- Reference (mapping): the KI data stream doc shape — root fields `@timestamp, id, type, title, description, tags, evidence, stream.name, deleted, excluded, run_id, expires_at`; feature payload `feature.{type, subtype, slug, properties, confidence, evidence_doc_ids}` (see `significant_events/server/lib/knowledge_indicators/data_stream.ts`).
- Reference (stamping pattern): `src/data_generators/replay_knowledge_indicators_snapshot.ts:22-32,77-87`

**Interfaces:**
- Produces: `indexExtraKnowledgeIndicators(esClient: Client, log: ToolingLog, kis: ExtraKnowledgeIndicator[]): Promise<{ indexed: number }>` and `cartRedisCutoffExtraKis: ExtraKnowledgeIndicator[]`.
- Consumes: `KNOWLEDGE_INDICATORS_DATA_STREAM` from `../snapshot_indices`.

- [ ] **Step 1: Create the fixture** `cart_redis_cutoff_extra_kis.json` — the "new" KIs to add on top of the baseline. Populate from your `.ab-generated-kis` index (export command in Task 3 note), or start with these representative cart/Valkey KIs:

```json
[
  {
    "id": "ab-entity-cartservice",
    "type": "feature",
    "title": "cartservice",
    "description": "Cart microservice storing user carts in a Valkey/Redis backing store.",
    "tags": ["service", "cart"],
    "evidence": ["cartservice.cartstore.ValkeyCartStore", "Wasn't able to connect to redis"],
    "stream": { "name": "logs" },
    "feature": {
      "type": "entity",
      "subtype": "service",
      "slug": "cartservice",
      "properties": { "service.name": "cartservice" },
      "confidence": 90,
      "evidence_doc_ids": []
    }
  },
  {
    "id": "ab-dep-cart-valkey",
    "type": "feature",
    "title": "cartservice → Valkey",
    "description": "cartservice depends on Valkey/Redis for cart persistence; connectivity loss breaks cart operations.",
    "tags": ["dependency", "cache"],
    "evidence": ["ECONNREFUSED 10.105.181.182:7070", "ValkeyCartStore"],
    "stream": { "name": "logs" },
    "feature": {
      "type": "dependency",
      "subtype": "cache",
      "slug": "cart-valkey",
      "properties": { "source": "cartservice", "target": "valkey", "protocol": "redis" },
      "confidence": 85,
      "evidence_doc_ids": []
    }
  },
  {
    "id": "ab-infra-valkey",
    "type": "feature",
    "title": "Valkey cart store",
    "description": "Valkey (Redis-compatible) backing store for cartservice.",
    "tags": ["infrastructure", "redis"],
    "evidence": ["connect to redis"],
    "stream": { "name": "logs" },
    "feature": {
      "type": "infrastructure",
      "subtype": "datastore",
      "slug": "valkey-cart",
      "properties": { "workloads": ["valkey-cart"] },
      "confidence": 80,
      "evidence_doc_ids": []
    }
  }
]
```

- [ ] **Step 2: Create the helper** `extra_knowledge_indicators/index.ts`

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { KNOWLEDGE_INDICATORS_DATA_STREAM } from '../snapshot_indices';
import cartRedisCutoffExtraKisJson from './cart_redis_cutoff_extra_kis.json';

// Match replay_knowledge_indicators_snapshot.ts: a generous TTL so injected KIs are not
// filtered by the reader's `expires_at >= NOW()` gate during the run.
const TTL_MILLIS = 30 * 24 * 60 * 60 * 1000;

export interface ExtraKnowledgeIndicator {
  id: string;
  type: 'feature' | 'query';
  title: string;
  description: string;
  tags?: string[];
  evidence?: string[];
  stream: { name: string };
  feature?: Record<string, unknown>;
  query?: Record<string, unknown>;
}

export const cartRedisCutoffExtraKis =
  cartRedisCutoffExtraKisJson as ExtraKnowledgeIndicator[];

/**
 * Bulk-index extra KIs into the canonical KI data stream. Stamps a fresh `@timestamp`
 * and future `expires_at` (mirrors the snapshot-replay stamping). No `search_embedding`:
 * the discovery agent lists KIs by `kind` + `stream_names`, so semantic ranking is unused.
 */
export async function indexExtraKnowledgeIndicators(
  esClient: Client,
  log: ToolingLog,
  kis: ExtraKnowledgeIndicator[]
): Promise<{ indexed: number }> {
  if (kis.length === 0) return { indexed: 0 };

  const now = Date.now();
  const timestamp = new Date(now).toISOString();
  const expiresAt = new Date(now + TTL_MILLIS).toISOString();

  const operations = kis.flatMap((ki) => [
    { create: {} }, // data stream: auto _id, append-only
    {
      ...ki,
      '@timestamp': timestamp,
      expires_at: expiresAt,
      deleted: false,
      excluded: false,
    },
  ]);

  const resp = await esClient.bulk({
    index: KNOWLEDGE_INDICATORS_DATA_STREAM,
    operations,
    refresh: true,
  });

  if (resp.errors) {
    const firstError = resp.items.find((i) => i.create?.error)?.create?.error;
    throw new Error(`Failed to index extra KIs: ${JSON.stringify(firstError)}`);
  }

  log.info(`Indexed ${kis.length} extra knowledge indicators into ${KNOWLEDGE_INDICATORS_DATA_STREAM}`);
  return { indexed: kis.length };
}
```

- [ ] **Step 3: Ensure the JSON import is allowed** — confirm `resolveJsonModule` is set (it is inherited via the base tsconfig). Type-check:

Run: `node scripts/type_check --project x-pack/platform/packages/shared/kbn-evals-suite-significant-events/tsconfig.json`
Expected: PASS. If it errors on the JSON import, add `"resolveJsonModule": true` to the suite `tsconfig.json` `compilerOptions` and re-run.

- [ ] **Step 4: Commit (with approval)**

```bash
git add x-pack/platform/packages/shared/kbn-evals-suite-significant-events/src/data_generators/extra_knowledge_indicators/
git commit -m "test(sigevents-evals): add extra-KI fixture + injection helper"
```

---

### Task 3: Wire the `SIGEVENTS_KI_SET` A/B dimension into the discovery spec

Gate the extra-KI injection on an env var and inject right after the baseline KI replay in the 'Discovery agent' task.

**Files:**
- Modify: `evals/discovery/discovery.spec.ts` (imports ~line 24; the `Discovery agent` task, injection after line 251)

**Interfaces:**
- Consumes: `indexExtraKnowledgeIndicators`, `cartRedisCutoffExtraKis` (Task 2); `KI_SET` env var.
- Produces: two comparable experiments over the same dataset depending on `SIGEVENTS_KI_SET`.

- [ ] **Step 1: Add the import and env read** near the top of `discovery.spec.ts` (after line 24)

```ts
import {
  indexExtraKnowledgeIndicators,
  cartRedisCutoffExtraKis,
} from '../../src/data_generators/extra_knowledge_indicators';

// A/B lever: 'old' (baseline KIs only) vs 'old+new' (baseline + extra KIs). Default 'old'.
const KI_SET = process.env.SIGEVENTS_KI_SET === 'old+new' ? 'old+new' : 'old';
```

- [ ] **Step 2: Inject the extra KIs after the baseline replay** — in the `'Discovery agent'` task, immediately after the `replayKnowledgeIndicatorsSnapshot(...)` call (currently ending at line 251), add:

```ts
                    // A/B: when running the 'old+new' variant, add the extra KIs on top of
                    // the baseline for scenarios that have them. Superset of 'old'.
                    if (KI_SET === 'old+new' && input.scenario_id === 'cart-redis-cutoff') {
                      await indexExtraKnowledgeIndicators(esClient, log, cartRedisCutoffExtraKis);
                    }
```

- [ ] **Step 3: Tag the experiment (not the dataset) with the variant** so the two runs are distinguishable in results while dataset/example IDs stay identical for pairing. Change the dataset `description` only (line 192), leaving `name` (line 191) and example `id`s unchanged:

```ts
                      description: `[${dataset.id}] discovery agent across scenarios (${source}) [ki_set=${KI_SET}]`,
```

- [ ] **Step 4: Type-check**

Run: `node scripts/type_check --project x-pack/platform/packages/shared/kbn-evals-suite-significant-events/tsconfig.json`
Expected: PASS.

- [ ] **Step 5: Commit (with approval)**

```bash
git add x-pack/platform/packages/shared/kbn-evals-suite-significant-events/evals/discovery/discovery.spec.ts
git commit -m "test(sigevents-evals): add SIGEVENTS_KI_SET old vs old+new A/B lever"
```

**Note on sourcing real KIs:** to replace the representative fixture with your actual `.ab-generated-kis` contents, export them (adjust host/auth) and reshape into the fixture array:
```bash
# from a cluster where .ab-generated-kis exists
curl -s -u "$ES_USER:$ES_PASS" "$ES_URL/.ab-generated-kis/_search?size=1000&_source=id,type,title,description,tags,evidence,stream,feature,query" \
  | jq '[.hits.hits[]._source]' > src/data_generators/extra_knowledge_indicators/cart_redis_cutoff_extra_kis.json
```
Verify each doc has `stream.name: "logs"` (or the scenario's stream), unique `id`, and `type: "feature"` with a `feature.type` of `entity`/`dependency`/`infrastructure` so the discovery agent's grounding uses them.

---

### Task 4: Run both variants, verify injection + retrieval, and compare

**Files:** none (execution + analysis).

**Interfaces:** consumes everything above.

- [ ] **Step 1: Start Scout with tracing** (required for token metrics; see suite README §"Tracing setup")

Run:
```bash
export GCS_CREDENTIALS='{"type":"service_account",...}'   # for snapshot access
node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet evals_tracing
```
Expected: Scout server + EDOT collector reachable; Kibana tracing exporters configured per README lines 46-90.

- [ ] **Step 2: Run the baseline (`old`) variant**

Run:
```bash
SIGEVENTS_DATASET=otel-demo SIGEVENTS_KI_SET=old \
node scripts/evals run --suite significant-events \
  --project <connector-id> --judge <gemini-3-pro-connector-id> \
  --repetitions 3 discovery.spec.ts
```
Expected: an experiment `sigevents: Discovery (otel-demo) (...)` with a `cart-redis-cutoff` example scored by criteria + token evaluators. Note the experiment id/name printed at the end.

- [ ] **Step 3: Run the `old+new` variant**

Run:
```bash
SIGEVENTS_DATASET=otel-demo SIGEVENTS_KI_SET=old+new \
node scripts/evals run --suite significant-events \
  --project <connector-id> --judge <gemini-3-pro-connector-id> \
  --repetitions 3 discovery.spec.ts
```
Expected: the log shows `Indexed 3 extra knowledge indicators into .significant_events-knowledge_indicators` during the cart-redis-cutoff task. Note this experiment id/name.

- [ ] **Step 4: Verify the agent actually RETRIEVED the new KIs** (guards against the retrieval-limit gotcha — new KIs only matter if surfaced). Inspect the `old+new` run's discovery-agent steps/trace for `search_knowledge_indicators` tool results and confirm one or more `ab-*` KI ids appear. If none do, the null delta means "not retrieved," not "not useful" — increase the tool `limit` or reduce baseline noise and re-run.

- [ ] **Step 5: Compare the two experiments**

Run: `node scripts/evals compare <old-experiment> <old+new-experiment>`
Expected: paired deltas per metric (criteria/relevance score, input/output/cached tokens, tool calls, latency). If they don't auto-pair, confirm both used the same dataset `name` + example `id` (`cart-redis-cutoff`); otherwise read the two runs' per-example scores side by side manually.

- [ ] **Step 6: Record findings** — summarize the relevance delta and token delta (with the ≥3-repetition spread) in the design doc's "Success criteria" section, plus the retrieval observation from Step 4.

---

## Revised execution notes (supersede where noted)

- **Task 2 fixture is populated by export, not hand-authored.** The implementer creates the fixture file as an empty placeholder `[]` (so imports/type-check resolve) and additionally writes an export script `scripts/export_ab_generated_kis.ts` that reads a source index (default `.ab-generated-kis`) from a live ES cluster and writes the reshaped KI docs to `src/data_generators/extra_knowledge_indicators/cart_redis_cutoff_extra_kis.json`. The script reads `ES_URL` and `ES_API_KEY` from env (never hardcoded/logged). The controller (not a subagent) runs it once with the user's transient creds to populate real data.
- **No commits anywhere.** Ignore every "Commit" step; leave changes in the working tree.

### Task 5: Eval runbook script
- Create: `scripts/run_ki_ab_eval.sh` — wraps the Task 4 commands: start Scout (tracing), run `SIGEVENTS_KI_SET=old` then `old+new` (both `--repetitions 3`), then `scripts/evals compare`. Connector/judge IDs and `GCS_CREDENTIALS` come from env vars with clear `: "${VAR:?set me}"` guards and inline comments. Type-check/shellcheck not required; verify with `bash -n scripts/run_ki_ab_eval.sh`.

## Self-Review notes

- **Spec coverage:** Component 0 → Task 1; Component 1 (A/B lever) → Tasks 2–3; Component 2 (evaluators) → reused as-is in Task 3 (no change needed — existing `createDiscoveryEvaluators` + `traceBasedEvaluators` already wired at discovery.spec.ts:273-282); Component 3 (run & compare) → Task 4; all five guardrails → Global Constraints + Task 4 Step 4.
- **Embedding-parity guardrail** from the spec is intentionally dropped for the discovery agent (retrieval is kind/stream-based, and the baseline replay itself strips `search_embedding`) — noted in Global Constraints.
- **TDD note:** eval-suite helpers/specs aren't unit-tested in this package; verification is type-check + a smoke run that asserts the injection log line and retrieval evidence (Task 4 Steps 3-4). This substitutes for red/green unit cycles here.