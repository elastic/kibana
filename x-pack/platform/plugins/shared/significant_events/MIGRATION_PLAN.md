# Plan: Extract `significant_events` (incl. Knowledge Indicators) from the `streams` plugin

## Goal
Move all "significant events" functionality — **including Knowledge Indicators (KI)** — out of
`x-pack/platform/plugins/shared/streams` into the new plugin
`x-pack/platform/plugins/shared/significant_events`.
- Code used **only** by significant events → **moves**.
- Code used by **both** → keep in streams and consume via contract, or extract shared *types* to a package.
- `streams`, `significant_events`, and `streams_app` must all build and work after the move — including
  when `significant_events` is **disabled** (streams must degrade gracefully).

## Key decisions (locked)
1. **KI moves to `significant_events`.** KI is the store for sig-events queries/features/indicators, so it
   belongs with the feature. Streams-core's residual use of KI is inverted via dependency injection (below).
2. **Dependency direction stays strictly one-way: `significant_events → streams`.** No plugin-level
   `streams → significant_events`. The cycle is avoided because streams' runtime use of KI is already
   dependency-injected — streams imports the KI **type** from a shared package and calls an **injected provider**.
3. **The KI provider is optional.** When `significant_events` is disabled, no provider is registered; the three
   streams→KI touchpoints become no-ops (deletion cleanup is skipped; partition suggestions get no feature signal).
   Stream CRUD never throws because KI is absent.
4. **ESQL rule-*type* registration stays in streams.** Moving the alerts-as-data registration
   (`feature: STREAMS_FEATURE_ID`, `registrationContext`) is migration-sensitive, so the rule-type definition +
   executor stay put. KI's rule-*instance* management (v1/v2 adapters via the alerting `rulesClient`) moves with KI.
5. **Memory moves to `significant_events`, wholesale.** Unlike KI, memory has **no streams-core consumer**,
   so it lifts out with no inversion/provider — `lib/memory/**`, the memory route, the agent-builder memory
   tools, memory workflows, and the `MEMORIES_DATA_STREAM` template all move together (see Memory section).
6. **`streams_app` is repointed** to a new `significantEventsRepositoryClient` from the new plugin.
7. **Staged commits on one branch, one PR.** Build + typecheck at each stage.
8. **Preserve git history: move first, rewire second.** Every relocation is split into two commits — a pure
   `git mv` (byte-identical content) then the import/reference edits — so git records a clean rename and
   `git log --follow` / blame survive across plugins and packages (see "Preserving git history" below).

## Why moving KI is safe: the coupling is already DI-based
Streams imports the KI **implementation** (a value) in exactly one place — `server/plugin.ts:62`
(`KnowledgeIndicatorService`, `initializeKnowledgeIndicatorsTemplate`). Every other streams-core reference
is `import type` plus a threaded `getKnowledgeIndicatorClient` callback. So inverting ownership requires
no architectural surgery in streams-core — only re-homing the construction and the type.

### The complete residual streams→KI surface (what must keep working after the move)
**Runtime calls (3 sites, 2 files):**
| Where | Call | Trigger |
|---|---|---|
| `state_management/execution_plan/execution_plan.ts:290` | `kiClient.deleteAllQueries(name)` | `delete_queries` action handler |
| `execution_plan.ts:328-329` | `kiClient.deleteAllQueries(name)` + `kiClient.deleteIndicators(name)` | `unlink_features` action handler |
| `routes/internal/streams/management/suggest_partitions_route.ts:100` | `kiClient.getFeatures(name, filters)` | partition suggestions |

**Action emitters (unconditional on every stream delete):** `wired_stream.ts:1158,1176`,
`classic_stream.ts:653,671`, `draft_stream.ts:86,89`, `query_stream.ts:571`.

**Type / DI threading (no calls):** `client.ts:46,87`, `service.ts:15,26,33,50`,
`state_management/types.ts:14,35`, `routes/types.ts:23,44`, and the construction at `plugin.ts:62`.

## KI inversion design (how each touchpoint works after the move)

### 1. Shared type extraction
Move the `KnowledgeIndicatorClient` interface and the value types streams-core references (the `getFeatures`
hit/`Feature` shape, query shapes) into the **new `@kbn/significant-events-schema` package** (see
"Workstream A" below). Streams imports these **type-only** from the package — never from the
`significant_events` plugin. Depending on a package creates no plugin cycle.

### 2. Provider registration (runtime wiring, no import cycle)
Streams' **setup contract** gains an optional registration hook:
```ts
// streams server setup contract
export interface StreamsPluginSetup {
  registerKnowledgeIndicatorClientProvider(
    provider: (request: KibanaRequest) => Promise<KnowledgeIndicatorClient>
  ): void;
}
```
- `significant_events` lists `streams` in `requiredPlugins`, so streams' setup contract is available as a
  setup dependency. In its own `setup`, sig-events constructs `KnowledgeIndicatorService` (it owns alerting,
  taskManager, inference, tuning config, ES/SO access) and calls
  `streamsSetup.registerKnowledgeIndicatorClientProvider((request) => …)`.
- Streams stores the optional provider. Its scoped-clients factory derives:
  ```ts
  const getKnowledgeIndicatorClient = kiProvider
    ? () => kiProvider(request)
    : undefined; // sig-events disabled
  ```
- **Ordering is safe:** all `setup`s complete before requests are served, so by the time any stream
  delete / partition request runs (start phase), the provider is registered iff sig-events is enabled.
- Streams removes the construction at `plugin.ts:62` and `initializeKnowledgeIndicatorsTemplate` (that moves
  to the new plugin's `start`).

### 3. Make the three touchpoints optional (graceful degradation)
- `routes/types.ts:44` — change `getKnowledgeIndicatorClient` from required to **optional**
  (`getKnowledgeIndicatorClient?: () => Promise<KnowledgeIndicatorClient>`). It's already optional in
  `client.ts`/`service.ts`/`state_management/types.ts`.
- `execution_plan.ts` `deleteQueries` (~282) and `unlinkFeatures` (~319): replace the current
  *"throw if not provided"* with an **early return** when the provider is absent — no KI ⇒ no data to clean.
  ```ts
  const { getKnowledgeIndicatorClient } = this.dependencies;
  if (!getKnowledgeIndicatorClient) return; // significant_events disabled: nothing to clean up
  const kiClient = await getKnowledgeIndicatorClient();
  …
  ```
  (Note: the `delete_queries`/`unlink_features` actions are still emitted unconditionally by the stream
  state machines; only the *handlers* become no-ops. No change needed in the emitters.)
- `suggest_partitions_route.ts:99-101` — guard `getFeatures` so it returns `[]` when the provider is absent:
  ```ts
  getFeatures: async (filters) => {
    if (!getKnowledgeIndicatorClient) return []; // no feature signal without significant_events
    const kiClient = await getKnowledgeIndicatorClient();
    const { hits } = await kiClient.getFeatures(params.path.name, filters);
    return hits;
  },
  ```
- Add unit tests: stream delete + partition suggestions with **no** KI provider must succeed (delete cleans
  the rest of the plan; partitions return suggestions without feature input).

## Memory: clean move (no inversion needed)
In contrast to KI, memory has **zero streams-core dependents** — confirmed by import analysis:
- Consumers of `MemoryService` / `MEMORIES_DATA_STREAM` are only: memory internals (`lib/memory/**`), the
  memory route (`routes/internal/memory/route.ts`), sig-events lib (`significant_events/memory_discovery_tools.ts`,
  `ki_queries_generation_service.ts`), and the agent-builder memory tools (`agent_builder/tools/memory/**`).
- The whole feature is gated by `STREAMS_SIGNIFICANT_EVENTS_MEMORY_ENABLED_FLAG`.

So memory moves as a unit, no provider/contract required:
- `server/lib/memory/**` (memory_service, history_storage, history_data_stream, data_stream, types,
  tool_callbacks, install_managed_workflows, trigger_memory_synthesis_workflow, is_significant_events_memory_enabled).
- `server/routes/internal/memory/route.ts`.
- `server/agent_builder/tools/memory/**` + the memory skill registration (`registerStreamsMemoryAgentBuilder`,
  `createMemoryToolsOptions`, `skills/register_memory_skills.ts`).
- The `MEMORIES_DATA_STREAM` constant (split out of streams `common/constants.ts`) + its template init.
- The memory feature-flag definition and the `memoryEnabled$` subscription wiring from `streams/server/plugin.ts`
  (the install-on-enable + agent re-registration moves to the new plugin's lifecycle).

The memory data-stream template init moves into the new plugin's `start`. Streams retains nothing memory-related.

## Investigations: clean move (no inversion needed)
Investigations is also free of streams-core dependents — confirmed by import analysis. It's two files
(`server/lib/investigations/is_investigation_enabled.ts`, `install_investigation_workflow.ts`), referenced only by:
- `server/plugin.ts` lifecycle wiring (the `investigationEnabled$` subscription, `installInvestigationWorkflowIfEnabled`,
  and the install inside `installManagedWorkflows`), and
- `server/agent_builder/register.ts` (passes `investigationEnabled` to register the investigation discovery agents).

Both move to the new plugin. Gated by `STREAMS_INVESTIGATION_ENABLED_FLAG`. The investigation workflow install
moves into the new plugin's workflow lifecycle (under its own managed-workflows owner rather than the streams owner).
No provider/contract required; streams retains nothing investigation-related.

## Target architecture

### Dependency graph (after)
```
streams_app ──▶ significant_events (public api client: SignificantEventsRouteRepository)
streams_app ──▶ streams           (unchanged streams client)
significant_events ──▶ streams    (start contract: scoped StreamsClient; setup contract: register KI provider)
significant_events ──▶ @kbn/significant-events-schema ──▶ @kbn/streams-schema   (one-way, see Workstream A)
streams  ──▶ @kbn/significant-events-schema   (KnowledgeIndicatorClient + Feature/Query *types* only)
streams  ──▶ (nothing in the significant_events plugin)
```
Both plugins, `streams_app`, and `@kbn/streams-ai` depend on `@kbn/significant-events-schema`; that is a
package dependency, so it introduces no plugin cycle.

### New `streams` contracts (currently both empty)
- **setup**: `registerKnowledgeIndicatorClientProvider(provider)` (see inversion design).
- **start**: `getScopedClients({ request })` returning streams-owned clients (`streamsClient`, `attachmentClient`,
  `contentClient`, `scopedClusterClient`, `soClient`, …) so sig-events can resolve streams without re-implementing
  the factory. (No KI here — KI flows the other way, via the provider.)

### New `significant_events` plugin structure
```
significant_events/
  common/            # availability types, attachment consts, sig-events flags, tuning-config (moved, not duplicated)
  server/
    plugin.ts        # depends on streams; registers KI provider into streams; routes, services, templates,
                     # tasks, agent-builder, workflows, inference features, KI template init
    routes/          # moved sig-events routes + own createServerRoute + scoped-clients factory
    lib/
      ki/            # MOVED from streams/server/lib/streams/ki (service, client, v1/v2/dual-cleanup adapters, …)
      significant_events/  # events, detections, discoveries, features, tasks, saved_objects, ki query gen, …
      memory/  investigations/  workflows (sig-events clients)
    register_significant_events_inference_features.ts
    agent_builder/   # moved sig-events tools/agents/skills/attachments/sml (+ KI-created EBT telemetry event)
  public/
    plugin.ts
    api/index.ts     # createSignificantEventsRepositoryClient + SignificantEventsRouteRepository type
```

## File disposition by area

### MOVE to significant_events
- **KI:** `server/lib/streams/ki/**` (28 files) → `significant_events/server/lib/ki/**`, incl. template init.
- `server/lib/significant_events/**` (events, detections, discoveries, features, tasks, saved_objects,
  ki_queries_generation, persist_queries, latest_source_query, significant_events_alerting_v2, clients).
- `server/routes/internal/significant_events/**`, `server/routes/significant_events/**`,
  `server/routes/internal/memory/route.ts`, `server/routes/utils/assert_significant_events_access.ts`.
- `server/lib/memory/**`, `server/lib/investigations/**`, sig-events workflow clients + installers.
- `server/agent_builder/**` sig-events parts (+ the `KNOWLEDGE_INDICATOR_CREATED` EBT event registration).
- `server/register_significant_events_inference_features.ts`.
- Sig-events UI settings / feature-flag registration (the `isSignificantEventsAvailable` block + continuous-KI +
  tuning-config settings) from `server/feature_flags.ts`.
- `common/significant_events_availability.ts`, `common/significant_event_attachment.ts`,
  `common/significant_events_tuning_config.ts` (now fully sig-events — streams no longer needs it once KI/memory/flags move).
- Prompts-config saved object (streams stops registering it; sig-events registers it).
- Sig-events scout tests + sigevents scripts.

### EXTRACT to `@kbn/streams-schema` (shared types, no duplication)
- `KnowledgeIndicatorClient` interface + the `Feature`/query types streams-core references via `getFeatures`.
- `EsqlRuleParams` type + `MATCH_LOOKBACK_MINUTES` const (referenced by the KI rule adapters and by the
  rule-type definition that stays in streams).

### STAY in streams
- Stream state machines and `execution_plan` (still **emit** `delete_queries`/`unlink_features`; handlers
  become optional no-ops).
- ESQL rule-*type* registration + executor (`server/lib/significant_events/rules/esql/register.ts`, `executor.ts`,
  `register_rules.ts`) — to avoid alerts-as-data migration. KI rule-*instance* adapters move with KI and reference
  the rule-type id (`@kbn/rule-data-utils`) + `EsqlRuleParams` (from package).
- `StreamsClient`, `StreamsService`, route framework, `AttachmentService`, `ContentService`, telemetry (minus the
  KI-created event), generic `TaskService`, core workflows.

### DUPLICATE (only if genuinely shared and not worth a package)
- Small generic helpers sig-events still imports from streams (error classes `StatusError`/`SecurityError`/…,
  esql helpers `toEsqlRequest`/`getColumnIndex`, route utils `getRequestAbortSignal`/query+search schemas).
  Prefer importing from an existing `@kbn/*` package; duplicate only the leftovers.

## Workstream A: `@kbn/significant-events-schema` package extraction
A new package `@kbn/significant-events-schema` houses the shared sig-events/KI **schema symbols**, pulled out of
`@kbn/streams-schema`. This is foundational — both plugins, `streams_app`, and `@kbn/streams-ai` import from it —
so it lands **first**, before any plugin code moves.

### What MOVES from `@kbn/streams-schema` into `@kbn/significant-events-schema`
The whole connected sig-events/KI cluster (it cross-references itself, so it must move as a unit):
- `src/significant_events/**` — `constants.ts` (`MAX_ID_LENGTH`, `MAX_RULE_NAME_LENGTH`, `MAX_TITLE_LENGTH`,
  `MAX_TEXT_LENGTH`), `common_schemas.ts`, `detections/`, `discoveries/`, `events/`.
- `src/api/significant_events/**` — `SignificantEventsResponse`, `GeneratedSignificantEventQuery`, lifecycle DTOs, etc.
- `src/feature.ts` + `src/feature_accumulator.ts` — `Feature`/`BaseFeature`/feature-type constants/`FeatureAccumulator`
  (KI "features"; consumed by `@kbn/streams-ai`).
- `src/queries/**` — the **sig-events** query objects: `StreamQuery`, `QueryLink`, `QueryFeature`,
  `KnowledgeIndicator` union, `streamQuerySchema`, etc.
- `src/onboarding/**`, and the sig-events part of `src/workflows/**` (`SignificantEventsWorkflowStatus[Result]`).
- The 5 sig-events IDs from `src/inference_feature_ids.ts`.
- **New:** the `KnowledgeIndicatorClient` interface (from the streams plugin, per the KI inversion) lands here too.

### What STAYS in `@kbn/streams-schema` (the two coupling fixes that keep the split one-way)
The only core→cluster coupling is `src/helpers/esql_helpers.ts:27` importing `QueryType`. So:
1. **Keep the generic ESQL query classification in `streams-schema`**: `QueryType`, `QUERY_TYPE_MATCH`,
   `QUERY_TYPE_STATS`, `esqlQuerySchema`/`EsqlQuery`, and `deriveQueryType()` are generic ESQL match-vs-stats
   analysis, not sig-events-specific. They stay; the moved `queries/**` imports `QueryType` **from streams-schema**.
   → core `esql_helpers` keeps working with no back-dependency.
2. **Split `inference_feature_ids.ts`**: the streams-core IDs stay
   (`STREAMS_INFERENCE_PARENT_FEATURE_ID`, `STREAMS_PARTITIONING_SUGGESTIONS_…`, `STREAMS_PROCESSING_SUGGESTIONS_…`);
   the 5 sig-events IDs move.
- Everything else stays: `models/**` (stream definitions), `helpers/**`, `shared/**`, `fields/**`, `tasks/**`,
  `api/description_generation`. (`api/features/**` moves with `feature.ts` — verify it has no streams-core consumer.)

### Resulting dependency direction
`@kbn/significant-events-schema` imports from `@kbn/streams-schema` (core stream types, `shared/record_types`
`primitive`, `QueryType`) — **one-way**. `streams-schema` imports **nothing** from the new package. No cycle.
(The `feature.ts` → `significant_events/constants` `MAX_ID_LENGTH` import becomes internal once both move.)

### Consumer blast radius (import path `@kbn/streams-schema` → `@kbn/significant-events-schema`)
~60 files across: `streams` plugin server (KI client, sig-events lib, routes), `streams_app` public
(sig-events hooks/components), `@kbn/streams-ai` (feature identification — incl. value imports like
`FeatureAccumulator`, `computeFeatureUuid`, `mergeFeature`), `@kbn/evals-suite-significant-events`, and tests.
All via the single barrel entry point, so it's a mechanical path swap per import — but it touches the streams
plugin too (which is fine: package dependency, not the sig-events plugin).

## Preserving git history (applies to every stage)
Git stores snapshots, not renames — it **detects** renames at view time by content similarity (~50% threshold).
A file that is moved **and** heavily edited in the same commit (e.g. all its imports repointed) can fall below the
threshold and be recorded as delete + add, breaking `git log --follow` and blame at that point.

**Rule: each relocation is two commits.**
1. **Move commit** — `git mv old new` only, content byte-identical. Git records a 100%-similarity rename; history is
   guaranteed to follow. (Diff shows zero content lines.)
2. **Rewire commit** — edit imports/references in the new location, update barrels, `kbn_references`, etc.

Notes:
- Holds across plugin **and** package boundaries — git doesn't care about directory or package; only content similarity.
- Applies most to Stage A (schema cluster) and Stage 2 (KI + sig-events lib) — the largest relocations.
- **Duplicated** files (the small generic helpers) are genuinely new files — no rename to preserve; the original keeps
  its history. Use `git diff -C` when reviewing those to see they originated as copies.
- Review/verify with `git log --follow <new-path>` and `git diff -M`; GitHub applies follow heuristics automatically.
- Keep `git mv` and edits in separate commits even within one stage — do not let an editor auto-fix imports on a moved
  file before the move commit lands.

## Staged commit sequence (one branch, one PR)

**Stage A — create `@kbn/significant-events-schema` (foundational, lands first)**
- Scaffold the package; move the sig-events/KI/feature/queries/onboarding/workflows cluster out of
  `@kbn/streams-schema` (per Workstream A), applying the two coupling fixes (keep generic `QueryType` +
  `deriveQueryType` in streams-schema; split `inference_feature_ids.ts`).
- Update the ~60 cross-repo consumers' imports (`@kbn/streams-schema` → `@kbn/significant-events-schema`) and the
  `tsconfig.json` `kbn_references` of streams, streams_app, streams-ai, evals-suite, and streams-schema itself.
- Validate: typecheck `@kbn/significant-events-schema`, `@kbn/streams-schema`, `@kbn/streams-ai`, and both plugins.
  ✅ No behavior change; pure symbol relocation. Confirm one-way package dep (streams-schema imports nothing back).

**Stage 0 — KI inversion groundwork (streams only, no behavior change while sig-events still inside)**
- Add the `KnowledgeIndicatorClient` interface to `@kbn/significant-events-schema`; point streams-core at the package type.
- Add streams **setup** hook `registerKnowledgeIndicatorClientProvider` and **start** `getScopedClients`.
- Make `getKnowledgeIndicatorClient` optional in `routes/types.ts`; convert the `execution_plan` handlers +
  `suggest_partitions` to optional no-op/`[]` paths. Add the "no provider" unit tests.
- Temporarily, streams still constructs KI and registers itself as the provider (keeps everything green).
  ✅ streams green; behavior identical.

**Stage 1 — scaffold new plugin server**
- Fill `significant_events/server` (plugin shell, types, empty route repo); add `streams` to `requiredPlugins` in
  `kibana.jsonc` (currently missing). Build empty plugin.

**Stage 2 — move KI + sig-events server lib**
- Move `lib/streams/ki/**` → new plugin; move `lib/significant_events/**`, memory, investigations, sig-events
  workflow clients, agent-builder sig-events parts, inference-feature registration, prompts-config SO, sig-events tasks.
- New plugin constructs `KnowledgeIndicatorService` and calls `streamsSetup.registerKnowledgeIndicatorClientProvider`.
- Move KI + sig-events template initialization into the new plugin's `start`.
- Streams stops constructing KI (`plugin.ts:62` removed); now relies solely on the registered provider.

**Stage 3 — move routes + repository + public client**
- Move sig-events route files; build `significantEventsRouteRepository` + `SignificantEventsRouteRepository`.
- Add the new plugin's scoped-clients factory (composes streams start contract + sig-events services).
- Remove sig-events routes from `streams/server/routes/index.ts`; drop sig-events fields from streams `routes/types.ts`.
- Add `significant_events/public/api/index.ts` → `createSignificantEventsRepositoryClient`.

**Stage 4 — move feature flags / config + strip streams wiring**
- Move sig-events UI settings + tuning-config registration to the new plugin's setup.
- Strip remaining sig-events wiring from `streams/server/plugin.ts` (inference features, sig-events services,
  agent-builder sig-events, sig-events workflows/tasks). Streams keeps: rule-type registration, core workflows,
  telemetry, generic tasks, the KI provider slot.

**Stage 5 — repoint `streams_app`**
- Add `significant_events` to `streams_app` `kibana.jsonc`; expose `significantEventsRepositoryClient` from the new
  plugin's public start; thread it through `useKibana`; switch the 18 `public/hooks/significant_events/**` hooks
  (and components) off `streamsRepositoryClient`.

**Stage 6 — cleanup + validation**
- Update `tsconfig.json` `kbn_references` on all three plugins + `@kbn/streams-schema`; update `.i18nrc`, codeowners.
- Remove dead code from streams; assert **zero** `streams → significant_events` plugin imports.

## Validation at each stage
- `node scripts/type_check --project x-pack/platform/plugins/shared/<plugin>/tsconfig.json` per touched plugin
  (+ `@kbn/streams-schema`).
- `node scripts/eslint --fix` on changed files (watch `no_sync_import_from_plugin` on `server/index.ts`).
- Targeted Jest for moved suites + the new "KI disabled" degradation tests.
- Sig-events scout api tests at the end; `node scripts/check.js --scope=branch` before PR.
- Boundary check: grep streams for any import from the `significant_events` plugin (must be none).

## Open items to confirm during execution
- **`@kbn/significant-events-schema` package** — confirm the package id/owner/path. Verify `api/features/**` and
  `MAX_ID_LENGTH` have no streams-core consumer (so they move cleanly); confirm `QueryType`/`deriveQueryType` is the
  *only* core→cluster coupling that must stay behind in `@kbn/streams-schema`.
- **Rule-type registration staying in streams** — keeps `rules/esql/**` (executor) in streams. If we'd rather it
  live with sig-events, the alerts-as-data `feature`/`registrationContext` constants must stay byte-identical.
- **Memory** — confirmed no streams-core consumer; moves wholesale (no open question).
- **Investigations** — confirmed no streams-core consumer; moves wholesale (no open question). Only the workflow
  managed-owner needs deciding (its own owner vs. reusing the streams owner).
- **`dataset_quality`** imports the `StreamsRepositoryClient` *type* — verify it never calls a sig-events route id
  (expected: stream CRUD only).
- **`STREAMS_API_PRIVILEGES` / `STREAMS_FEATURE_ID`** ids used by sig-events — import from package/common if exported,
  else duplicate the ids.
