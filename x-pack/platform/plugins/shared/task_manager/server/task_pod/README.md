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

## Families

A family is a checked-in manifest next to its owning plugin, e.g.
`alerting_v2/task_pod.jsonc` (plugin ids whose tasks entries to boot, and the task types it
serves). Register the owner in `task_pod/family.ts` (`FAMILY_OWNERS`). Boot fails if a listed
plugin's tasks dependency is missing from the list.

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
