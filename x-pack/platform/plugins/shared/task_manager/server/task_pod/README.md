# Task pods

A task pod is a standby process that runs the tasks of one family on behalf of Kibana. Task Manager
(in Kibana) still claims tasks; for task types matching `xpack.task_manager.pods[].task_types` it
sends the run to the pod's `POST /run` instead of running it in-process
(`pod_dispatch.ts`, `remote_task_runner.ts`, wire format in `wire.ts`). The pod makes no calls back
to Kibana: it talks to Elasticsearch directly.

## How a pod runs the same code as Kibana

Plugins that take part add a **tasks entry**: `server/tasks/index.ts`, declared in `kibana.jsonc`:

```jsonc
"plugin": {
  "tasks": { "requiredPlugins": ["taskManager", "spaces"], "optionalPlugins": [] }
}
```

A tasks entry has a plugin's lifecycle (`setup`, `start`, `stop`) but only receives:

- the tasks entries of the plugins it declares (a subset of its `requiredPlugins`/`optionalPlugins`),
- `CoreTasksSetup`/`CoreTasksStart` (`@kbn/core-lifecycle-server`), a small subset of Core.

Its `setup` is declarative: register saved object types, event log providers, trigger and task
definitions. It never writes to Elasticsearch; installation (mappings, data streams, the task
index) stays in the plugin's regular `server` entry and runs in Kibana.

The pod host (`host/boot_tasks_plugins.ts`) builds Core's own `PluginsSystem` over the plugins of a
**family** and runs it. Kibana can run the same entries (`plugins.bootTasksEntries`, off by default
because DI lifecycle hooks run once per container); alerting v2's `server` entry binds its task
runtime through `server/tasks`, so both paths share the code.

Stateful infrastructure plugins (task_manager, event_log, encrypted_saved_objects,
maintenance_windows) publish their real contracts to a `TasksKibanaBridge`
(`@kbn/core-plugins-server`); in Kibana their tasks entry delegates to it, in a pod it builds the
standalone implementation. **A pod must run in its own process**: in Kibana's process the bridges
are already filled.

## Turning it on

```yaml
xpack.task_manager.pods:
  - url: http://localhost:4100
    task_types: ['alerting_v2:*']     # globs; first matching pod wins
```

With no `pods`, nothing changes: every task runs in-process. Tasks with `runAs` (service accounts)
always run in-process.

### Pools

One image per family can run as several pools. A pod serves only the task types in
`POD_TASK_TYPES` (comma-separated globs; default: all it has) and refuses runs beyond
`POD_MAX_CONCURRENCY` with a 503 that Kibana retries. Route each pool with its own `pods` entry:

```yaml
xpack.task_manager.pods:
  - url: http://rule-executors:4100
    task_types: ['alerting_v2:rule_executor']
  - url: http://housekeeping:4101
    task_types: ['alerting_v2:*']
```

Serving fewer types does **not** make a pod smaller: the cost is the shared infrastructure (ES
client, OpenTelemetry, saved objects, DI), which every pool of the family loads. Pools are for
isolation and independent scaling.

### Failures

- The pod gets the task's deadline and aborts the run then; Kibana stops waiting shortly after. A
  run isn't limited by undici's 5 minute header timeout.
- A pod that is unreachable, over capacity (503), shutting down, built for another Kibana version
  (409) or missing the task type (404) is retried in 5 seconds rather than failed.
- On SIGTERM a pod stops taking runs and exits once the in-flight ones finish.


## Families

A family is a checked-in manifest next to its owning plugin (plugin ids whose tasks entries to boot,
and the task types it serves). Register the owner in `task_pod/family.ts` (`FAMILY_OWNERS`). Boot
fails if a listed plugin's tasks dependency is missing from the list.

| Family | Manifest | Task types | Notes |
| --- | --- | --- | --- |
| `alerting_v2` | `alerting_v2/task_pod.jsonc` | `alerting_v2:*` | rule executor, dispatcher, housekeeping |
| `connectors` | `actions/task_pod.jsonc` | `actions:.*` | connector executions; `.`-prefixed ids keep the cleanup and telemetry tasks in Kibana |
| `workflows` | `workflows_execution_engine/task_pod.jsonc` | `workflow:run`, `workflow:resume`, `workflow:scheduled` | includes the connectors plugins, for connector steps |
| `agent_builder` | `agent_builder/task_pod.jsonc` | `agent-builder:run-agent` | runs with an API key only; includes inference, search inference endpoints, isomer and the connectors plugins |

**What a pod does not run, and how it fails**

- Connector types that need Kibana privileges (system and sub-feature types) get no task definition in a
  pod, so its `/health` does not list them. When a pod answers 404 to a run, Task Manager runs the task in
  Kibana (`RemoteTaskRunner`'s `fallback`).
- Workflow steps that call Kibana (`kibana.*`, custom steps' `callKibanaApi`) fail with an explicit
  message: a pod has no route back to Kibana. Workflows that run as a service account are refused.
- A workflow step registered by a plugin that is not in the family fails with `Unknown node type: <step>`.
  `node scripts/task_pod_coverage.js` lists the plugins that register into a family's registries and
  whether each has a tasks entry and is in the manifest; most of them do not yet.
- Agent runs bound to a service account stay in Kibana (Task Manager keeps `runAs` tasks in-process). An
  agent that calls a Kibana API (the execute-API tool) fails with an explicit message; Elasticsearch
  calls work. Tools, skills and attachments registered by other plugins are only there if the plugin has a
  tasks entry and is in the family (none do yet).
- A pod that writes to restricted system indices, as agent builder's executions, needs Elasticsearch
  credentials that may do so: Kibana's internal user (`kibana_system`), not a superuser.
- A task timeout longer than 2^31-1 ms (about 24.8 days, e.g. a workflow's `365d`) is cut at that length on
  both sides of the call.

**Inputs a pod needs**: the same `xpack.encryptedSavedObjects.encryptionKey` as Kibana; for connectors,
the same `xpack.actions.preconfigured` connectors (secrets can come from `kibana.keystore`, read by
`bin/kibana-task-pod`) and any certificate files `customHostSettings` names; per-pod state (email rate
limit, lease pool, metrics) is not shared between pods.

## Running

```
ES_URL=http://localhost:9200 ES_USERNAME=elastic ES_PASSWORD=changeme \
  node scripts/task_pod.js --family alerting_v2 --port 3500   # from source
bin/kibana-task-pod --family alerting_v2                       # distributable
```

Env: `ES_URL`, `ES_USERNAME`/`ES_PASSWORD` or `ES_API_KEY`, `PORT`, `POD_CONFIG` (yml with
kibana.yml keys, e.g. `xpack.encryptedSavedObjects.encryptionKey`, which must match Kibana's),
`POD_MAX_CONCURRENCY`, `POD_TASK_TYPES`, `LOG_LEVEL`. The launcher sets
`--max-semi-space-size=8`, which keeps a pod ~100 MB lower.

Then point Kibana at it: `xpack.task_manager.pods: [{ url: 'http://pod:3500', task_types: ['alerting_v2:*'] }]`.

## Memory

What a pod costs is decided by the transitive imports of its entries. Measure and budget:

```
node scripts/task_pod_entry_cost.js <module> [--baseline] [--trace]   # fresh process, per-package
node scripts/task_pod_budget.js                                      # against src/cli/task_pod/budgets.yml
```

A whole alerting v2 pod measures about 240 MB RSS from the built (transpiled, unbundled) tree,
against about 180 MB for the earlier esbuild bundle. The difference is code volume rather than
barrels, and is accepted for now; a release-time bundle of `bin/kibana-task-pod` is the option if it
needs to shrink.

Imports from a tasks entry must stay light: never import a plugin's barrel (use its `server/tasks`
leaves), and the `no_boundary_crossing` lint rule rejects tasks files importing another plugin's
non-tasks server code or tasks entries it did not declare.

## Tests

`integration_tests/task_pod_parity.test.ts` runs Kibana and a pod (as a child process) against a
real Elasticsearch and checks that the pod serves the registered task types, runs a rule, and
creates no indices. `task_pod.test.ts` covers the wire format.

## Known gaps

No authentication between Kibana and the pod. Tasks that run `runAs` a service account, and
`http.selfClient` calls, are not available in pods.

## What is real in a pod

The host (`host/boot_tasks_plugins.ts`) runs Core's `PluginsSystem` and gives it Core's own
services, wired for a process with no HTTP server, no routes and no migrations. A stand-in is kept
only where the real class cannot run in a pod. Fresh-process costs below are `task_pod_entry_cost
--baseline` (noisy by a few MB on a busy machine).

| Core service | In a pod | Why |
| --- | --- | --- |
| `Env`, `ConfigService` | **Real** (`core/core_context.ts`) over the merged `POD_CONFIG` object. Plugin tasks entries validate their `config` export through it, like a server entry. `packageInfo.version` is `POD_KIBANA_VERSION` and `dist` is `true`. | |
| Plugin initializer context | **Real** (`createPluginInitializerContext`) | |
| Elasticsearch client | **Real** `ClusterClient` + `AgentManager` + `ElasticsearchConfig` (`core/es_cluster.ts`), over `ES_URL`, `ES_USERNAME`/`ES_PASSWORD` or `ES_API_KEY` and the optional `elasticsearch.*` section of `POD_CONFIG`. Scoped clients read the fake request's `authorization` header. | `ElasticsearchService` itself is not used: its setup needs the HTTP, execution context and security services, and it polls nodes, clock skew and cluster info for the life of the process and blocks start on a version check that needs cluster privileges an API key-only pod lacks. With `ES_API_KEY` the key is a custom header, so a scoped client of a request with no `authorization` runs as the pod. |
| Analytics | **Real** `AnalyticsService` | |
| Feature flags | **Real** `FeatureFlagsService`. `workflows.kibanaRequest.coreSelfClientEnabled` is forced on through `feature_flags.overrides`, which `POD_CONFIG` may extend. No provider is set, so other flags return their fallback. | Its counter route goes to a no-op router. |
| UI settings | **Real** `UiSettingsService` (core defaults, plugin registrations, validation, `UiSettingsClient`s over the pod's saved objects) | Its routes go to a no-op router (`createNoopRouter`). |
| Security | **Real** `SecurityService` with a pod delegate (what the security plugin provides in Kibana): the user a run's fake request was enriched with, `areAPIKeysEnabled`, `cloneAsInternalUser`; everything else is Core's default (audit off, no UIAM). Service accounts fail with `TaskPodUnsupportedError`. `acquireFakeRequestEnricher` is what the server uses to bind a run's user. | The security plugin does not run in a pod. |
| User profile | **Real** `UserProfileService` with a pod delegate (`getCurrentProfileId`: the enriched user, else the profile of the request's API key) | Same. |
| Base path | **Real** `BasePath` | |
| Saved objects | Core's building blocks (`SavedObjectTypeRegistry`, `KibanaMigrator.prepareMigrations`, `SavedObjectsRepository`, `SavedObjectsClientProvider`, `SavedObjectsClient`, the encryption extension from ESO) in `core/pod_saved_objects.ts`; the active space comes from a pod spaces extension. | `SavedObjectsService` needs the HTTP, deprecations, core usage data and ES-status services and costs about 44 MB more in a fresh process (the pod loads only the pieces it uses). It is started like Core's with `migrations.skip`: documents are migrated on read, the index is never touched. Like Kibana with the security plugin, request-scoped clients use the internal repository. Hidden types of plugins outside the family are dropped from `includedHiddenTypes`. |
| Data streams | Stand-in (`core/data_streams.ts`) over `DataStreamClient.fromDefinition` | `DataStreamsService.start` runs `DataStreamClient.initialize` for every stream, which installs and updates index templates and mappings and, in `initializeClient`, creates the stream. A pod never installs anything; Elasticsearch creates a missing stream on the first write through the template Kibana installed. |
| HTTP (`getServerInfo`) | Stand-in (`core/server_info.ts`): the `server.host`/`server.port` settings | `HttpService` starts a hapi server and routes and costs about 30 MB in a fresh process. A pod listens only for Task Manager on `PORT`. |
| Logging | Stand-in (`PodLogger`): JSON lines on stderr, `LOG_LEVEL` | `LoggingSystem` costs about 48 MB in a fresh process (appenders, layouts, rolling files) against a 59 MB budget for the whole host. |
| Dependency injection | **Real** `CoreInjectionService` | |

`host/core/*.test.ts` cover the wiring; `task_pod_parity` and the family parity tests cover it
against a real Elasticsearch.
