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
`http.selfClient` calls, are not available in pods. The host still uses hand-built Core stand-ins
(`host/core/`), over the real saved objects repository and type registry.
