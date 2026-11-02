# Task pods

Run a task type in a standby process (a *pod*) instead of in the Kibana node that claimed it. Task
Manager still claims, validates, times out and reschedules; only `createTaskRunner(...).run()`
moves. A pod is self-contained: during a run it talks to Elasticsearch and never to Kibana, so a slow
or restarting Kibana can't fail a run that has started.

```
Kibana node                                      pod process
TaskManagerRunner.run()                          host (host/): plugin system, pod Core, HTTP server
  RemoteTaskRunner ----- POST /run ------------>   boots plugins, runs the task's createTaskRunner
  processResult (unchanged) <-- RunResult ------   against Elasticsearch
```

## Turning it on

```yaml
xpack.task_manager.pods:
  - url: http://localhost:4100
    task_types: ['alerting_v2:*']     # globs; first matching pod wins
```

With no `pods`, nothing changes: every task runs in-process. Tasks with `runAs` (service accounts)
always run in-process.

### Pools

One image per plugin can run as several pools. A pod serves only the task types in
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
client, OpenTelemetry, saved objects, DI), which every pool of the image loads. Pools are for
isolation and independent scaling.

### Failures

- The pod gets the task's deadline and aborts the run then; Kibana stops waiting shortly after. A
  run isn't limited by undici's 5 minute header timeout.
- A pod that is unreachable, over capacity (503), shutting down, built for another Kibana version
  (409) or missing the task type (404) is retried in 5 seconds rather than failed.
- On SIGTERM a pod stops taking runs and exits once the in-flight ones finish.

## Making a plugin's tasks runnable in a pod

Add `server/task_pod.ts` exporting `podPlugins`. Use the same registration code the plugin runs in
Kibana so a task behaves the same in both places:

- **DI plugin** (alerting v2): `definePodPlugin({ id, configSchema, requiredPlugins, module })`,
  where `module` is a `ContainerModule` that Kibana's plugin module also loads.
- **Classic plugin** (notification center): `definePodPlugin({ id, requiredPlugins, setup })`
  calling the function `plugin.ts` calls.

Dependencies come from other pod plugins, built from the owning plugin's own code (e.g. `spaces`,
`licensing`, `security`, the event log, encrypted saved objects). A required dependency with no pod
plugin is a boot error, never a silent stub, and `podContract(pluginId, provided)` assembles a
contract from the members that work in a pod: any other member throws when called.

## What a pod needs instead of Kibana

There are no callbacks into Kibana. Everything that talks to Elasticsearch runs in the pod: spaces,
licensing, the event log, security key invalidation and API key cloning, encrypted saved objects,
workflows, and Task Manager scheduling. The one thing a pod can't do is UIAM (serverless) API key
invalidation, which needs UIAM credentials only Kibana has: it fails, so the pending record is kept
for a node that can revoke the key.

**What a pod needs in its config** (`POD_CONFIG`, a yml with kibana.yml keys),
and Elasticsearch credentials for Kibana's internal user (it writes system indices and clones API keys):

- `xpack.encryptedSavedObjects.encryptionKey` (and `keyRotation.decryptionOnlyKeys`): the same as
  Kibana's, or decryption fails. A pod that holds the key can decrypt any encrypted saved object, so
  give it only to pods that run on a trusted network.
- `xpack.workflowsExecutionEngine.*` and `xpack.workflowsManagement.available`, as in Kibana.
  Executions are stored with `storage.source: plain_index` (the default).
- `server.publicBaseUrl` (and `server.basePath`), for the links in workflow payloads.

**Encrypted saved objects.** The ESO plugin ships a pod plugin
(`encrypted_saved_objects/server/task_pod.ts`) with the same service, client and encryption
extension, so a task decrypts without calling Kibana.

**Scheduling tasks.** `createTaskSchedulingPodPlugin({ taskTypes })` gives the pod Task Manager's
scheduling half: tasks it schedules are written to `.kibana_task_manager` by the pod (API key cloned
through Elasticsearch, encrypted with the pod's ESO key) and claimed by Kibana's pollers as usual.
API-key scheduling on Elasticsearch only; tasks that run in a pod are claimed and run by the nodes
that claim them, not by this plugin.

**Workflows.** alerting v2's pod runs the workflows code itself (`task_pod_workflows.ts`): trigger
events are matched against workflows and scheduled, workflows are looked up and bulk scheduled, using
factories the workflows plugins export (`workflows_execution_engine/server/scheduling`,
`workflows_management/server/services/get_workflows_by_ids`) that Kibana's plugins use too.

Import what a pod needs from small packages (`@kbn/core-saved-objects-utils-server`, not
`@kbn/core/server`) and subpaths (`@kbn/task-manager-plugin/server/task_helpers`). The build fails if
a barrel that drags in Core, the whole Task Manager plugin or the OpenTelemetry SDK gets bundled.

## Build and run

```bash
node x-pack/platform/plugins/shared/task_manager/scripts/build_task_pod.mjs \
  --plugin x-pack/platform/plugins/shared/alerting_v2/server/task_pod.ts \
  --out /tmp/pod/alerting_v2.mjs --port 4100 --minify

ES_URL=http://localhost:9200 ES_USERNAME=elastic ES_PASSWORD=changeme /tmp/pod/alerting_v2.sh
```

To try it against a local Kibana, give the pod `POD_CONFIG` (see above) and Elasticsearch credentials
for Kibana's internal user, add the pod to Kibana's config, then use Kibana as usual: create a rule,
and an action policy with a workflow destination. Rule events, event log entries, `.alert-actions`
and workflow executions appear as they do when the tasks run in Kibana.

Start it through the `.sh` the build writes: it passes `--max-semi-space-size=8`, which keeps V8's
young generation from growing to ~100 MB on big machines (an alerting v2 pod measured 330 MB without
it and ~180 MB with it). `scripts/measure_pod.mjs` measures a pod, or any process by `--pid`, the same
way each time.

The build is ESM with code splitting: saved objects, the DI machinery and the fake-request path are
separate chunks loaded only by pods that need them (a pod without them sits near 100 MB RSS; with
them, near 180 MB with the launcher). The build replaces one package, `@kbn/repo-info`, with a
standalone shim (`scripts/shims/`), because the real one only works inside a Kibana checkout.

## Design notes

- **Granularity:** one image per plugin (its task family); scale and isolate with pools of that
  image via `POD_TASK_TYPES`. The cost of a pod is shared infrastructure, not the task code (alerting
  v2's own code is ~0.3 MB of an ~8.8 MB bundle), so one pod per task type would pay it several times.
- **Memory** (alerting v2, 5 task types, macOS, 4.5 GB V8 heap limit): 330 MB RSS out of the box.
  About 110 MB was V8's young generation (fixed by the launcher flag), about 65 MB the full
  OpenTelemetry SDK (`@kbn/tracing-utils` loaded it for one predicate; it no longer does), and
  about 40 MB the ES|QL parser, which the rule executor and dispatcher need. Result: ~180 MB RSS,
  ~130 MB OS footprint. A pod with only Elasticsearch and no saved objects or DI is ~100 MB.
  Measure with `scripts/measure_pod.mjs`; numbers are smaller in a memory-limited container.

## What a pod does not do

- Install resources (data streams, templates): Kibana does; pods assume they exist.
- Schedule recurring tasks, serve routes, register privileges or workflow extensions.
- Ship telemetry events (`analytics` accepts and drops them).
- Authenticate anything: `/run`, `/cancel` and the pod's Elasticsearch credentials are not
  secured yet, and the pod holds the encryption key and an internal Elasticsearch user. Run pods on a trusted network (localhost) until that is done.
- Check access for request-scoped saved objects (they use the internal repository, scoped to the
  request's space) or send UIAM client authentication / project routing to Elasticsearch, so
  serverless needs more work.
