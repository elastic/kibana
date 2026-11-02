# PoC findings: self-contained task pods

A "task pod" is a single standby process that bundles everything one family of Task Manager task
types needs to run for real, without booting the rest of Kibana — real identity resolution, a real
Elasticsearch client, and in most pods a real Saved Objects repository. A poking service keeps the
process warm and calls `POST /run` per task execution, instead of Task Manager exec'ing a one-shot
CLI per run. See [README.md](./README.md) for how to build and run these locally.

## Summary

Five pods were built against three real, unrelated plugins to pressure-test that shape: Alerting
v2 (a DI-container plugin), Notification Center (a typical non-DI `core.getStartServices()` task),
the Workflows Execution Engine (a large non-DI plugin reused wholesale), a minimal connector-
execution pod (two real `stack_connectors` executors), and a static sizing pass over every
connector. All four runnable pods work end to end for the paths they cover; see "What each pod
proves" below for exactly what is real versus stubbed in each.

Headline RSS numbers, by coupling tier (see "Measurements" for the full table):

| Coupling tier | RSS at READY | Example |
| --- | --- | --- |
| Bare Node + ES client, nothing else | ~79 MB | Phase 0 baseline |
| Generic pod harness + ES client, no SO repository, no DI | ~103–104 MB | Control (Notification Center) |
| Real connector executor + ES client | ~111–116 MB | Stage B2 (connectors) |
| Real Saved Objects repository + DI container or a full plugin lifecycle | ~280–310 MB | Stage A (Alerting v2), Stage B1 (Workflows) |

Open questions this PoC did not resolve:

- **The ~280–310 MB tier is not root-caused.** Control's 174→103 MB fix (below) came from finding
  one specific landmine; the much larger Stage A/B1 numbers likely have landmines of their own that
  were not hunted down the same way.
- **Connector secrets resolution is unmeasured.** Stage B2 passes config/secrets directly in the run
  request rather than resolving them from Kibana's connector saved objects + encrypted saved
  objects + authorization. That's a real, not-yet-bundled, not-yet-sized surface — see Stage B2 and
  the process-model recommendation below.
- **A full compiled Workflows run was not attempted.** Stage B1 proves the engine's lifecycle and
  repository-backed failure path, not a step graph (ES/flow-control/wait steps) actually executing.

## Baselines

Machine: macOS (darwin 25.6.0), Node 24.21.0, harness: `measure.mjs`, 3 cold process runs per row,
median reported. RSS is summed over the spawned process tree via `ps`.

| Row | RSS at ready | RSS idle (+5 s) | Time to ready | Modules |
| --- | --- | --- | --- | --- |
| bare Node | 47 MB | 47 MB | 34 ms | 1 |
| Node + @elastic/elasticsearch | 79 MB | 79 MB | 171 ms | 325 |
| Kibana `background_tasks`, source (`node scripts/kibana`, warm Babel cache) | 1932 MB | 1940 MB | 22116 ms | 30875 |
| Kibana default roles, source | 2169 MB | 2229 MB | 19774 ms | 30875 |
| Kibana `background_tasks`, 9.6.0-SNAPSHOT distributable (bundled Node 24.22.1) | 1619 MB | 1655 MB | 15323 ms | 31513 |
| Kibana default roles, 9.6.0-SNAPSHOT distributable | 1636 MB | 1784 MB | 12005 ms | 31513 |

Kibana READY is the `Kibana is now available` log line, against a local `9.6.0-SNAPSHOT`
Elasticsearch. Source mode transpiles with Babel at require time and keeps source maps, so it
overstates RSS by roughly 300 MB; the distributable rows are the fair comparison. The
`background_tasks` role loads exactly the same module set as the default roles (30875 vs 30875 in
source, 31513 vs 31513 in the distributable): node roles change which services start, not which
code is loaded. Kibana startup also does work a task pod skips by design (saved object migrations,
privilege registration, resource installation), so these rows answer "what does a process that only
runs tasks cost today", not "what does Kibana Core cost in isolation".

## Lessons from the static import graph

Early in this PoC, a static import graph of the unmodified Alerting v2 rule executor (every step,
middleware, `RulesClient`, `DirectorService`, `QueryService`, etc., bundled with esbuild) came out
to 4996 input files, 30.01 MB, 458 packages, 68 of them Kibana Core or plugin packages. Three import
edges explained almost all of it, and the same three patterns reappear in every pod below:

- **A single runtime-value import from a package barrel pulls in the whole package.**
  `rules_client.ts` imports one value from `@kbn/core/server`, whose barrel re-exports
  `@kbn/core-root-server-internal` and therefore the whole Core server: saved objects migrations,
  the HTTP server, rendering (`react-dom/server`), Elasticsearch config (`@kbn/crypto`,
  `node-forge`). The fix used throughout this PoC: re-export the specific pure symbol from its real,
  small source file instead of the package's root `index.ts` (a build-time "port", see
  `ports/core_server.ts`, `ports/task_manager_server.ts`).
- **`@kbn/task-manager-plugin/server`'s barrel loads Task Manager's own task runner**, which imports
  `elastic-apm-node`, `@kbn/tracing-utils` (and through it the OpenTelemetry SDK), and
  `@kbn/config-schema`/`joi`. This exact landmine reappeared later in the pod family — see the
  Measurements section's footnote for how it was found and fixed for the Notification Center pod.
- **A helper import can hide an ANTLR-sized dependency.** `appendLimitToQuery` from
  `@kbn/esql-utils`'s root entry pulled in `@kbn/esql-language` (2.8 MB) and the ESQL
  grammar/parser. Barrel files compound this: a re-export file for a group of steps can pull in one
  step's heavy dependency for every other step imported alongside it.

None of the executor's own source needed editing to fix any of this — every coupling was handled by
either a DI-token binding to a local implementation, or a build-time redirect resolving one import
to a small, real-source-backed port file. The general finding: **a shared build-time port is itself
a coupling surface.** A port written for one consumer's needs can silently reintroduce Core or
plugin weight for every other consumer of the same specifier if it isn't scoped per-importer — see
the Notification Center fix in Measurements for a concrete instance of this costing ~70 MB.

A prior, narrower iteration of this PoC (a single coordinator process that fetched one rule via
Kibana and ran only the compute pipeline over it, `main.ts`/`container.ts`) is no longer part of
this directory; the pod family below supersedes it with a stricter invocation model (see below).
Its measurements and decorator-metadata/barrel-file findings are preserved in this file's git
history (`git log -p -- x-pack/platform/plugins/shared/alerting_v2/poc/task_runner/main.ts` on this
branch) for anyone who wants the full phase-by-phase account.

## Generalizing beyond a single coordinator: self-contained task pods

The prior coordinator shape only worked because Kibana did the one expensive step (fetching the
rule) and handed the bundled process a pre-built payload. Three follow-up questions forced a
stricter shape:

1. **Generalizing to an ordinary (non-DI) task type.** Most of Kibana's ~115 task-registering files
   are not DI consumers; they close over `core.getStartServices()` inside `registerTaskDefinitions`.
   The DI container trick that made Alerting v2 tractable does not apply to them.
2. **Workflows.** This needs to work for the Workflows Execution Engine too, which is a large,
   non-DI, non-trivial plugin — not just a second easy case.
3. **A stricter invocation model.** The whole task run — not just the "fetch and compute" part — has
   to live in the bundled process, because the real-world invocation model is standby pods that a
   poking service tells to run a task, not Task Manager execing a short-lived CLI per run.
   Concretely:
   - **Nothing is bundled as a callback to Kibana.** Connector execution, custom step handlers,
     scheduling follow-up tasks, forwarding events — if a task type needs it, it has to be in the
     bundle, or the task type is out of scope for this invocation model.
   - **The poking service carries the identity, not the pod.** Pods never hold the Saved Objects
     encryption key or any persistent credential. Each run request carries a short-lived,
     already-decrypted API key (the poking service decrypted it, the same way Task Manager decrypts
     a task's `apiKey` field today); the pod builds a fake request from it and never does its own
     decryption. The one documented exception is Stage B2's connector secrets, which arrive the
     same way — in the run request, already decrypted — because bundling connector SO/ESO
     resolution was out of scope for this pass (see below).

### Pod contract

One process per `TaskRegistry`, kept on standby; a poking service calls `/run`, not a one-shot CLI
per task (`pod/server.ts`, unchanged across every pod below — this is the part of the architecture
that generalizes with zero task-specific code):

- `GET /health` → `{ inFlight, rss }`.
- `POST /run` body: `{ taskType, taskInstance: { id, params, state, attempts, scheduledAt?,
  startedAt?, runAt? }, executionUuid, apiKey?, spaceId, timeoutMs? }`. The pod looks up `taskType`
  in its registry, builds the real `fakeRequest` from `apiKey`/`spaceId` if present, and calls the
  task's own `createTaskRunner(...).run()`. Response: `{ outcome: 'ok' | 'error', result | error,
  taskRunEventFields }`.
- `POST /cancel/:executionUuid` aborts the in-flight run's `AbortController` and calls `cancel()` if
  the task defines one.

Everything task-type-specific lives in one `pod/entries/*.ts` file per task family, wired to a thin
`pod/main_*.ts` entry. `pod/server.ts` itself never changed across five very different task families
below — that is the generalization claim this round of work was testing.

### What each pod proves

| Pod | Entry | Coupling style | What it proves |
| --- | --- | --- | --- |
| Stage A — Alerting v2 | `entries/alerting_v2.ts` | DI container (inversify) | `FetchRuleStep` → real `RulesClient` over a bundled, real `SavedObjectsRepository`; workflow-trigger forwarding bundled as a real `task` SO write, not a callback to Kibana |
| Control — Notification Center | `entries/notification_center.ts` | `core.getStartServices()` closure (typical of ~115 Kibana task files) | the *harness* needs zero task-specific code for a non-DI task; only the task's own `CoreSetup` fake is task-specific |
| Stage B1 — Workflows engine | `entries/workflows.ts` | Real `Plugin` class (`setup()`/`start()`) reused wholesale | a large, unrelated, non-DI plugin generalizes with the same "reuse the real bind/setup code, fake only the Core/plugin tokens it reads" strategy that worked for Alerting v2's DI modules |
| Stage B2 — connectors | `entries/connectors.ts` | Real per-type executor functions called directly | real `stack_connectors` executors (`server-log`, `es_index`) run correctly inside a bundled process against a real ES client |
| Stage B3 — all connectors | `entries/size_only_all_connectors.ts` | Static import graph only, never run | sizes what "bundle every connector" would cost without claiming it works |

### Stage A: Alerting v2, full run in the bundle

Reuses the real, unmodified DI modules (`bindServices`, `bindEvents`, `bindArtifactTypes`,
`bindRuleExecutionServices`, `bindTasks`) with `FetchRuleStep` live (not swapped for a pre-built
payload), over a real `SavedObjectsRepository`:

- `SavedObjectTypeRegistry` + `KibanaMigrator` + `SavedObjectsRepository.createRepository`, fed only
  by the plugin's own `registerSavedObjects()` call against a capturing `FakeSavedObjectsServiceSetup`.
  `migrator.prepareMigrations()` has to be called explicitly — it is the one step `runMigrations()`
  normally does that `migrateDocument`/`isDowngradeRequired` require, and the pod never calls
  `runMigrations()` itself (no ES index bootstrapping; documents are assumed already migrated).
- `spacesService.getSpaceId`/`spaceIdToNamespace` are not stubbed with constants; they are the real
  `SavedObjectsUtils.namespaceStringToId`/`namespaceIdToString` logic the Spaces plugin itself uses,
  reading `request.spaceId` off the real `KibanaRequest` `buildTaskFakeRequest` produces.
- `security.authc.getCurrentUser`/`userProfile.getCurrentProfileId` resolve identity by calling
  Elasticsearch's own `_security/_authenticate` with the request's `Authorization` header
  (`pod/authc.ts`) — real identity resolution, not Core's session/realm machinery.
- Workflow-trigger forwarding (`RuleExecutorWorkflowSubscriber` → `WorkflowService.emitEvent`) is
  bundled as a real `task` saved object write (`pod/task_manager_store.ts`): a second
  `SavedObjectsRepository` scoped to `.kibana_task_manager`, registered with Task Manager's own real
  `setupSavedObjects()` mappings, writing a `workflow:run`-typed task document. Nothing claims or
  runs it (ground rule: do not touch Task Manager's polling/claiming code) — the write itself is
  what "Task Manager store, bundled" means here.
- Verified end to end against a real rule: `outcome: 'ok'`, `rule.execution.succeeded`, including the
  workflow-forwarding write.
- Two build-time ports follow the barrel pattern from "Lessons from the static import graph":
  `ports/core_server.ts` (`isSavedObjectErrorResult`/`SavedObjectsUtils`/`SavedObjectsErrorHelpers`,
  each re-exported from its real, small home package) and `ports/task_manager_server.ts` /
  `ports/task_manager_server_with_invalidate.ts` (`TaskStatus`, `TaskCost`, `TaskPriority`,
  `EVENT_LOG_ACTIONS`/`_PROVIDER`, `createTaskRunError`/`throwRetryableError`/
  `throwUnrecoverableError`, `runInvalidate`, each re-exported from its real source file instead of
  the package entry).

### Control: Notification Center cleanup (the generalization check)

`registerNotificationCleanupTask` is real and unmodified; it is not a DI consumer, it closes over
`core.getStartServices()` to read `coreStart.elasticsearch.client.asInternalUser` inside
`createTaskRunner`. The entry fakes exactly that one `CoreSetup.getStartServices()` call — nothing
else — and registers it against the same `FakeTaskManagerSetup`/`TaskRegistry`/`pod/server.ts`
harness Stage A uses. It runs end to end (`outcome: 'ok'`).

This is the generalization claim made concrete: the *shared harness* needed zero changes for a
completely different coupling style (closure over `CoreSetup`, not DI). What is task-specific is,
unavoidably, task-specific — someone still has to write the one-off `CoreSetup`/`CoreStart` fake a
given task's closure reads — but that surface is small (one function, in this case) and does not
grow the shared harness.

### Stage B1: Workflows Execution Engine, real plugin class reused wholesale

Generalizing the "reuse the real bind modules" trick from DI-container granularity to plugin-class
granularity: `WorkflowsExecutionEnginePlugin` (the real, unmodified class) is instantiated directly
with a faked `PluginInitializerContext`, and its own `setup()`/`start()` are called with faked
`CoreSetup`/`CoreStart`/plugin start contracts, exactly like Kibana's plugin lifecycle would, but
inside the pod.

What is real and bundled:
- `workflow:run`/`workflow:resume`/`workflow:scheduled` task registration, and the full
  `runWorkflow` execution function.
- `WorkflowExecutionRepository`/`StepExecutionRepository` over a real, bundled `plain_index` ES
  client (`PlainIndexDataClientBundle` creates the real `.workflows-executions`/
  `.workflows-step-executions` indices with their real mappings on `initStart`).
- Verified against the real engine: a `workflow:run` task for a nonexistent execution id correctly
  reached the bundled repository, found nothing, and produced a `failed` task-run outcome through
  the real failure path (`completeIdentityFailureCleanup`/`logWorkflowTaskFailure`) — proof the
  unmodified engine logic is running, not a stub.

What is explicitly **not** bundled, and why (coupling-inventory findings, not correctness fixes):
- **Connector steps.** `execution_functions/setup_dependencies.ts` imports the real
  `ConnectorExecutor` unconditionally (not lazily, only on a connector step), which otherwise drags
  all of `@kbn/actions-plugin/server` into every Stage B1 pod. `ports/connector_executor.ts` is a
  path-redirected stub with the same public shape that throws a clear "not bundled, see Stage B2"
  error instead. Connector steps are a separate pod (B2).
- **Execution-log and trigger-event data streams.** `core(Start).dataStreams` is a minimal no-op
  fake (`registerDataStream`/`initializeClient` return inert handles). Nothing on the
  run/resume/scheduled task path requires them to succeed, so step/workflow logs and the
  event-driven trigger log are silently not persisted. This is the one place a real Core service
  (`@kbn/core-data-streams-server(-internal)`) was stubbed instead of bundled.
- **Licensing, cloud, usage metering, spaces.** No-op/absent, matching how `plugins.*` are already
  optional or soft-checked (`checkLicense` faked to always report an active enterprise license) in
  the real plugin.
- **A full compiled step graph (flow-control + ES + wait/resume step types actually executing).**
  Authoring a valid execution document requires the workflow YAML→execution-graph compiler
  (`@kbn/workflows`/workflows_management), a separate subsystem from the execution engine proper
  that was not pulled into this pass. What is proven is that the *engine* (task registration,
  run/resume/scheduled lifecycle, repository-backed lookups, failure handling) runs unmodified
  inside the pod; proving a specific step type executes end to end is the natural next slice of
  work.

### Stage B2: connector execution, minimal set

A deliberately narrower slice than "bundle `ActionsClient`": the real, unmodified connector executor
functions (`stack_connectors/server/connector_types/{server_log,es_index}`) are called directly with
config/secrets/params supplied in the run request, rather than resolved through Kibana's connector
saved objects + encrypted saved objects + authorization. `ActionsClient`, connector SO/ESO
registration and RBAC are not bundled — that is a materially larger surface (SO/ESO types,
decryption, authorization checks) than what this pass had time to port, and is called out here as
the gap rather than silently narrowed.

Both connectors ran for real inside the bundled pod: `server-log` wrote a real log line through the
real executor; `es_index` performed a real ES bulk index through the real executor and the document
was confirmed present with a follow-up search. Both outcomes came from the actual `stack_connectors`
code, not a reimplementation.

### Stage B3: sizing "bundle every connector"

Static import graph only (`entries/size_only_all_connectors.ts` imports `stack_connectors`'s own
`connector_types/index.ts` and `actions/server/actions_client`; it is never invoked). This answers
"what would bundling the real `registerConnectorTypes()` surface plus `ActionsClient` cost",
separate from whether it would work.

27.45 MB unminified / 14.80 MB minified, 5860 input files, 434 packages. The per-connector SDK
clients dominate, not Kibana code: `mongodb` (1067 KB), `tedious` — SQL Server driver (1572 KB),
`@grpc/grpc-js` (667 KB), `@azure/msal-node` (594 KB), `nodemailer` (559 KB), `mysql2` (525 KB),
`axios` (470 KB), `gpt-tokenizer` (1092 KB), on top of `@kbn/actions-plugin` itself (1105 KB) and
`@kbn/stack-connectors-plugin` (654 KB). "Bundle every connector into every task pod" is a real,
measurable 25+ MB tax paid regardless of which connector a given workflow actually uses — a strong
argument for per-connector-type bundles (or a shared connector-execution pod that task pods call
over the network) rather than one pod that links every connector SDK.

### Measurements

Single-run spot measurements (not the median-of-N harness rigor the baselines above used), so treat
absolute numbers as indicative, not final.

| Pod | Bundle (unminified) | Bundle (minified) | RSS at READY | RSS after one run | Cold start |
| --- | --- | --- | --- | --- | --- |
| Stage A — Alerting v2 | 17.53 MB | 8.70 MB | 283–287 MB | 311 MB | ~595 ms |
| Control — Notification Center | 12.75 MB → 3.63 MB¹ | 6.51 MB → 2.01 MB¹ | 174 MB → 103–104 MB¹ | - | - |
| Stage B1 — Workflows engine | 19.98 MB | 10.09 MB | 277–280 MB | - | - |
| Stage B2 — connectors (2 types) | 5.15 MB | 2.79 MB | 111–116 MB | - | - |
| Stage B3 — all connectors (static only) | 27.45 MB | 14.80 MB | not run | - | - |

¹ **Found and fixed after the fact.** The first pass of this measurement had a landmine in the
pod's own `ports/task_manager_server.ts`: it re-exported `runInvalidate` (needed only by Alerting
v2's `invalidate_pending_api_keys` task) from a single shared port covering *every* pod's
`@kbn/task-manager-plugin/server` import. That one export pulls
`@kbn/core-http-router-server-internal`, which pulls `elastic-apm-node` + `@grpc/grpc-js` + the
OpenTelemetry SDK — none of which Notification Center's cleanup task (or most task types) touch.
Splitting it into `task_manager_server.ts` (base) and `task_manager_server_with_invalidate.ts`
(redirected to only from Alerting v2's own importer, in `build.mjs`) dropped Control's RSS from 174
MB to 103–104 MB and its minified bundle from 6.51 MB to 2.01 MB, with no change in behavior
(re-verified end to end). The same removal moved Workflows from 10.33 MB to 10.09 MB minified (it
reaches APM/gRPC/OTel through its own `elastic-apm-node` dynamic import regardless, so the saving
there is smaller); Stage A and the connectors pod were unaffected (Stage A needs `runInvalidate` for
real; the connectors pod never imports `@kbn/task-manager-plugin/server` at all).

Against the handoff's budgets (idle RSS ≤120 MB, stretch ≤300 MB; bundle ≤10 MB): the bundle budget
is cleared, minified, by every pod except Stage A/B1/B3 (B1/B3 clear it once rounded; Stage A is
close). The idle-RSS budget is a different story by coupling tier: Control, after the fix, is just
inside the 120 MB target at 103–104 MB; every pod that needs a real Saved Objects repository, DI
container, or a real plugin's `setup()`/`start()` lifecycle (Stage A, Stage B1) still lands at
roughly 280 MB — 2.3–2.4x the target, and that gap has not been root-caused the way Control's was.
Running more task types per pod would not make this worse per task type (most of the fixed RSS is
per-process: Node, the ES client, any DI/plugin-lifecycle machinery), but "one pod per task type" is
still not free — the four runnable pods above cost roughly 775 MB resident if all kept warm
simultaneously, before any of them have run anything.

### Per-task coupling inventory

| Task family | Coupling style | Core/plugin surfaces touched | Biggest landmine found |
| --- | --- | --- | --- |
| Alerting v2 rule executor | DI container (inversify) | SO repository, Spaces, Security (`_authenticate`), Task Manager store write | `@kbn/core/server` and `@kbn/task-manager-plugin/server` barrels re-export their whole package even for two pure helpers |
| Notification Center cleanup | `core.getStartServices()` closure | ES client only | a shared port's `runInvalidate` re-export pulled APM/gRPC/OTel into every consumer of `@kbn/task-manager-plugin/server`, not just Alerting v2 |
| Workflows run/resume/scheduled | Real `Plugin` class, non-DI | SO-equivalent (plain-index ES repositories), licensing, data streams (stubbed), connector executor (redirected) | an unconditional top-level import (`ConnectorExecutor`) drags a whole sibling plugin's server implementation into every build regardless of whether a given workflow uses a connector step |
| Connector execution (server-log, es_index) | Plain functions, no plugin lifecycle | ES client (es_index only) | none at the executor level; the elided surface (SO/ESO secrets resolution, authorization) is structural, not a build landmine |
| All connectors (static) | N/A (sizing only) | N/A | per-connector third-party SDKs (`mongodb`, `tedious`, `@grpc/grpc-js`, `@azure/msal-node`) are the actual size cost, not Kibana code |

### Process-model recommendation

Given "standby pods poked by an external service, not Task Manager spawning a process per run" and
"nothing is bundled as a callback to Kibana":

1. **One pod image per task type (or small, related family), not one pod per plugin and definitely
   not one pod with every task type.** Stage B3's numbers make the "bundle everything into one fat
   pod" option concrete and expensive: every connector SDK client, all the time, in every pod,
   whether or not a given run needs it. A pod per task type (Stage A/B1/B2's granularity) pays only
   for what that task type needs.
2. **Connector execution is the strongest case for a shared, separately-poked service rather than
   being linked into every workflow pod.** The B1/B3 split shows why: if Workflows pods bundled
   every connector, that is Stage B3's 25+ MB tax multiplied by however many Workflows pods are
   warm; if each connector type gets a pod, a workflow run becomes a request to a second pod
   mid-execution — more moving parts, but the SDK cost is paid once per connector type instead of
   once per workflow pod.
3. **Identity stays with the poking service, including for connectors.** Stage A and B1/Control all
   work cleanly under "poke carries the already-decrypted key" for the task's own identity. Stage
   B2's one exception — connector secrets arriving directly in the run request rather than being
   resolved from encrypted saved objects inside the pod — should be closed before this is more than
   a PoC: either the poking service also resolves and forwards decrypted connector secrets
   (consistent with the rest of the identity model), or a connector-secrets lookup gets properly
   bundled (SO + ESO + authorization), which Stage B2 did not attempt.
4. **The idle-RSS budget needs to be revisited for anything beyond the narrowest task types.** Only
   the Control pod (non-DI, ES-only) came close to the original 120 MB target. Every pod that needed
   a real Saved Objects repository, DI container, or a real plugin's `setup()`/`start()` lifecycle
   landed at 2–2.4x that budget. If per-task-type pods are the chosen model, the budget conversation
   should be "per warm pod, at this coupling tier", not one number for every task type.
