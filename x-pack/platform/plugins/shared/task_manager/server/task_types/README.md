# Task type modules

A task type module is one file that holds a Task Manager task type: its definition and its runner.
Kibana registers it as it does any task type. The same file can also be bundled and run in a
process of its own, with Kibana still claiming, validating, timing out and rescheduling the task.

```ts
// <plugin>/server/task_types/my_task.task.ts
import { defineTaskType } from '@kbn/task-manager-plugin/server';

export const taskType = defineTaskType({
  type: 'myPlugin:my_task',
  title: 'My task', // everything `registerTaskDefinitions` takes, but the runner
  timeout: '1m',
  savedObjectTypes: [myType], // only if the runner uses saved objects
  createTaskRunner: (context, { logger, elasticsearch, savedObjects }) => ({
    run: async () => ({ state: {} }),
    cancel: async () => {},
  }),
});
```

The second argument is the **host**: what the runner may use. In Kibana it is Core; in a process it
is built from Core's own services. The module
never knows which, so it must not reach for anything else (plugin globals, `getStartServices`).

## Moving a task type into a module

1. Move the definition and runner into `server/task_types/<name>.task.ts`. Replace what the runner
   closed over with the host. Keep the scheduling code where it is and import the constants.
2. Import leaf files only. A barrel import pulls the whole plugin into the bundle.
3. List the file in `kibana.jsonc`: `"plugin": { "taskTypes": ["server/task_types/my_task.task.ts"] }`.
4. In `setup`, call `taskManager.registerTaskType(taskType, { logger })` instead of
   `registerTaskDefinitions`. `logger` is optional and defaults to Task Manager's.
5. Test the module with a fake host: `taskType.createTaskRunner(context, host)`.

`cleanup()` runs in the process after each run, so a runner that deletes its params there keeps working.

## Where tasks run

One setting decides it for every task type that is a module. Task types that are not modules always
run in Kibana, and Kibana claims, validates, times out and reschedules every task whatever the mode.

```yaml
xpack.task_manager.task_execution:
  mode: in_process # default: in Kibana's process
```

**`child_process`.** Each run forks the task type's bundle, sends it Kibana's own Elasticsearch
connection over the fork channel, runs the task in it and stops it when the run ends. If the process
cannot be started, Task Manager retries process execution according to the task retry policy.
A process-routed task never runs inside Kibana as a fallback. A registered task type module that has
no bundle in the manifest is not process-routed at all: it keeps running in Kibana, as it would with
`mode: in_process`. A manifest entry whose file is missing on disk still fails startup, since that is
a broken build. Running from source with no bundles built at all (no `manifest.json` in `bundle_dir`)
runs every task type in Kibana and logs a warning, unless `bundle_dir` was set explicitly or Kibana is
a distributable, in which case the manifest is still required.

```yaml
xpack.task_manager.task_execution:
  mode: child_process
  bundle_dir: target/task_bundles # optional; the distributable uses its own task_bundles
```

Build the bundles with `node scripts/task_bundle` (the distributable builds them for you).

For the PoC, process reuse is opt-in. Each child still runs one task at a time, but may serve
subsequent runs of the same task type after successful completion, flushing, and cleanup:

```yaml
xpack.task_manager.task_execution:
  mode: child_process
  reuse:
    enabled: true # default: false
    idle_timeout_ms: 30000 # retain a child for up to 30 seconds between runs
    max_age_ms: 300000 # retire after five minutes; does not interrupt an active run
    max_runs: 100 # retire after this many executions
    max_idle_processes: 10 # global cap across all task types, in addition to active processes
```

Omitting `reuse` retains a fresh process per run. Reuse requires rebuilt bundles: older bundles do
not report successful cleanup and are retired after each run. Changes to startup settings (including
Elasticsearch credentials and encryption keys) retire incompatible idle children before dispatch.
Run credentials, feature flags, and task state are supplied for each execution. Cancellation sends
`SIGKILL` after the task type's optional cancellation grace period, and failed runs or failed cleanup retire the process. Process memory and module
state can survive between successful runs; this mode preserves isolation from Kibana but not a clean
process for every execution. Reused children log `Reusing process <pid> for task <type>` at info.

```yaml
xpack.task_manager.task_execution:
  max_concurrent_processes: 8 # default: xpack.task_manager.max_workers
  child_max_old_space_mb: 512 # optional
  child_max_semi_space_mb: 2 # optional, the default: the young generation of each process
```

### Running processes in production

- **Loopback only.** A forked process listens on `127.0.0.1` and on a port the OS picks. Everything
  secret (the Elasticsearch credentials, the encryption keys, the security settings) goes over the
  fork channel (IPC), which no other process can read. Over HTTP go only the run request (the task,
  and the fake request credentials of this run) and the bearer token the supervisor generated at
  startup and sent over IPC. Versioned business routes require that token; health probes stay open.
  A remote supervisor listens on `HOST` (default: `127.0.0.1`).
- **It ends with Kibana.** A process exits when the fork channel disconnects (Kibana was killed) and,
  as a backstop, when its parent pid changes, closing Core first (bounded to 5 s). No orphans remain
  after a `SIGKILL` of Kibana.
- **Flags.** A process does not inherit `--inspect*`/`--debug*` (the port would clash with Kibana's) or
  heap sizing flags (`--max-old-space-size` and friends, which are sized for Kibana) from `execArgv` or
  `NODE_OPTIONS`. `child_max_old_space_mb` sets the heap of each process explicitly. Every process starts
  with `--max-semi-space-size=2` (`child_max_semi_space_mb`): Node's default lets the young generation
  grow to 128 MB resident, which a process that lives for one run never needs. Measured on idle
  processes, 2 MB takes 63 MB (Task Manager floor), 117 MB (`es_query`) and 110 MB (security rules) off the
  resident memory with the same startup time, at about 7% more CPU in allocation-heavy work (4 MB: about 2%).
- **Capacity.** At most `max_concurrent_processes` processes are held by runs at once (the default is
  `max_workers`, the most runs Kibana has in flight, so it only bites when lowered). A run past the cap is
  retried by Task Manager and counted as a `capacity` dispatch failure. Memory is the reason for the cap; a
  process's memory depends on its task type and settings; the paired measurements below cover startup,
  idle memory and the first real task. Every spawn and exit logs the number of live processes at debug.
- **Shutdown.** On stop the supervisor refuses new runs, waits up to 10 s for the runs in flight (each
  stops its own process when it ends) and then stops what is left with `SIGTERM`, and `SIGKILL` after 2 s.
- **Cancellation.** Task types may declare `cancelGracePeriodMs`. Workflow tasks allow five seconds
  for the execution to persist cancellation and clean up before forced termination. The cancellation
  endpoint acknowledges only after the execution finishes. Other task types retain immediate
  `SIGKILL`; an unresponsive workflow process is killed when its grace period expires. Cancelled
  processes are always retired. Normal completion uses `SIGTERM` unless reuse is enabled.
- **Logs.** A process writes Kibana's JSON layout (the same ECS records as `logging.appenders` with
  `layout: json`) at the lowest level Kibana's Task Manager logger writes. Kibana reads each line from the
  process's stdout and logs it again with its own logger (`plugins.taskManager.task_process`), so the
  configured layout, appenders and level filters apply, and labels records with `task_type` and
  `child_logger` (the context inside the process, such as `plugins.alerting`). Execution records also carry
  `run_id`; the supervisor clears it when the lease ends so idle and shutdown logs have their own scope. A line that
  is not a record (a crash, `stderr`) is logged as is, with the same labels. This needs no new channel and no
  copy of Kibana's logging configuration, which a process cannot see; the cost is one parse per line.
- **Counters.** `getTaskProcessStats()` on Task Manager's start contract returns `dispatchFailures` by task type
  and reason (`declined` for a 422, `not_served` for a 404, `incompatible`, `capacity`, `spawn_failed`, `spawn_timeout`,
  `unavailable`) and the supervisor's numbers (`live`, `active`, `max`, `spawned`, `spawnFailures`,
  `spawnTimeouts`, `capacityRejections`). Dispatch failures are also in the `taskManager` usage counter as
  `taskProcessDispatchFailure:<reason>:<taskType>` and logged at warn. They are not in the health API, whose
  response schema is public; that would be its own change.

**`remote`.** Runs go to an authenticated task worker supervisor. It serves the task types in its
bundle manifest and starts or reuses an isolated execution process for each dispatch. Both modes use
the same serialized initialization snapshot, including current connectors, registration ids, encryption
keys, UI overrides and plugin settings. Credentials and evaluated feature flags belong to each run.

```yaml
xpack.task_manager.task_execution:
  mode: remote
  remote:
    url: http://localhost:4100
    token: secret # matches the worker's required TASK_PROCESS_TOKEN
```

```sh
PORT=4100 TASK_PROCESS_TOKEN=secret node scripts/task_worker
```

The worker reads `TASK_PROCESS_BUNDLE_DIR` (default `target/task_bundles`),
`TASK_PROCESS_MAX_CONCURRENT` (default `4`), `PORT` (default `5602`) and `HOST` (default `127.0.0.1`).
Set `TASK_PROCESS_REUSE=true` to retain compatible workers for up to 100 runs, five minutes of age,
or 30 seconds idle, with at most four idle workers. Off-host deployments terminate TLS in front of
the authenticated endpoint because dispatch snapshots carry secrets. Elasticsearch credentials and
Kibana settings come from the dispatch; a static settings file is not needed.

Missing task types and incompatible deployments fail explicitly. Capacity and startup failures remain
on the process route. Existing standalone bundle endpoints are useful for development, but remote
mode now targets the supervisor so every dispatch receives its current configuration.

Dispatch protocol v3 uses `/v3/run` and versioned cancellation, progress and active-pool endpoints.
Before each dispatch, Main checks `/v3/health` for the current protocol and required runtime capabilities;
child readiness advertises the same contract before a lease is issued. There are no unversioned business
aliases. A health check that reaches a new replica cannot cause a subsequent run to execute on an old
replica: its versioned run endpoint does not exist. Incompatibility fails permanently without local
execution. `/health` remains available for liveness probes. Rebuild task bundles and deploy matching
workers when upgrading this protocol. Changes to required dispatch semantics must update the protocol
and endpoint version together. Native metric transport also negotiates its serializer format before a run starts.

Workers advertise the `native-feature-flag-declarations` capability. After the health check, Main reads
the authenticated `/v3/feature_flags?taskType=...` endpoint, evaluates every declared flag through Core,
and sends those current values in both the run and dispatch snapshot. Bundle manifests include flags
declared by native SDK contributions, including transitively loaded contributions. Worker readiness
checks those declarations against the loaded module. Missing declarations, changed defaults or missing
evaluated values reject the dispatch before business execution; rebuild and deploy matching bundles.
The receiving worker also validates declared values, and a supervisor verifies that run and snapshot
values agree, so a caller cannot bypass this contract by omitting Main's preflight.
Retained workers read execution-scoped values through the feature-flag SDK APIs,
so false, zero and empty strings remain valid values and overlapping runs cannot share another run's flags.

## What a process is

A task process boots Core's `TaskRoot` with a fixed set of task plugins. It shares Core's configuration,
logging, Elasticsearch, saved objects, data streams, UI settings, analytics, security, status and plugin lifecycle
implementations. It does not construct inbound HTTP servers, rendering, Core apps or browser assets.
Index migration orchestration is skipped; document migrations, mappings, serialization and repository
extensions remain available. Outbound HTTP uses Core's real self client, including base paths and UIAM.

Task plugins implement `TaskPlugin` and export a `taskPlugin` initializer. `TaskCoreSetup` and
`TaskCoreStart` expose the services available in this composition, so task plugins cannot accidentally
depend on web setup contracts. The encrypted saved objects plugin shares its runtime initialization
with normal Kibana and leaves key-rotation routes out of task startup.

The plugins are Task Manager (it collects the task definitions), the encrypted saved objects plugin
when the module declares encrypted types, any `taskPlugins` the module brings (such as the security
plugin's slim task plugin, which registers Core's security delegate so API keys, UIAM, privilege
checks and audit are the security plugin's), and one plugin that adapts the module: it registers what
the module declares and gives the runner its `host` from Core's start contract.

A module declares what it needs and the host has only that. In Kibana the plugin that registers the
task type hands over its own service for the same capability.

| Declare                     | `host` gets                   | In a process                                                                                                                                              | In Kibana                               |
| --------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `savedObjectTypes`          | saved object types registered | Core's repository and clients; the spaces extension takes the space from the fake request                                                                 | Core                                    |
| `createSavedObjectTypes`    | native saved object migrations | Builds definitions and conditional encrypted registrations with genuine encryption setup and revived dispatch settings; static and created definitions are deduplicated by name                     | Already registered by the owning plugin |
| `dataStreams`               | `dataStreams`                 | Core's native clients for the declared definitions, initialized lazily during execution; eager migrations are skipped                                     | Core                                    |
| `encryptedSavedObjectTypes` | `encryptedSavedObjects`       | the real encrypted saved objects plugin, with the keys the process is sent                                                                                | `hostExtensions.encryptedSavedObjects`  |
| `eventLog`                  | `eventLog`                    | the native event-log writer, stamped with Kibana's server UUID, flushed before each run answers                                                           | `hostExtensions.eventLog`               |
| `taskManager`               | `taskManager`                 | writes `task` saved objects, only for `schedulableTypes`                                                                                                  | Task Manager's start contract           |
| `uiSettings`                | `uiSettings`                  | Core's, with the module's `defaults` and `globalDefaults` (`registerGlobal`) registered and Kibana's `uiSettings.overrides` and `globalOverrides` applied | Core                                    |
| `registerUiSettings`        | `uiSettings`                  | Registers configuration-dependent native defaults during Core setup, using the revived dispatch settings                                                  | Already registered by the owning plugins |
| `licensing`                 | `licensing`                   | the license read from Elasticsearch once; feature usage written to the saved object every node and process shares                                         | the licensing plugin                    |
| `usageCounters`             | `usageCounters`               | the usage collection plugin's own counters service, stored when the run ends                                                                              | the usage collection plugin             |
| `settings: ['pluginId']`    | `settings.pluginId`           | the validated config Kibana sends                                                                                                                         | the getter passed to `registerTaskType` |
| `featureFlags`              | `featureFlags`                | the values Kibana evaluated for this run                                                                                                                  | Core                                    |
| `contributions`             | `contributions[key]`          | what plugins export for the key                                                                                                                           | the plugins themselves                  |
| `taskPlugins`               | `plugins[id]`                 | the `start` contract of each plugin                                                                                                                       | the real plugins                        |

`host.analytics`, `host.security`, `host.elasticsearch` and `host.onRunEnd` (in a process) are always there.

Task-mode Core reads user-provided UI settings through fresh clients. This lets retained workers
observe namespace and global preferences changed by Kibana between executions.

**A process does every side effect itself.** Kibana does nothing with a run but reschedule it, so
nothing a run produces comes back in the response, and the process finishes it before it answers (bounded
by a few seconds, so a slow endpoint cannot hold the run; a warning is logged on timeout):

- **Analytics events.** A module that lists the telemetry plugin's task plugin in `taskPlugins` (rule
  modules always do) gets Core's analytics client with the real `ElasticV3ServerShipper`, opted in as
  Kibana is, with the labels, license and cloud context Kibana's events carry. The telemetry plugin
  sends the opt-in, `sendUsageTo` and labels (`getTaskProcessSettings`); alerting adds the license and
  the cloud deployment. If Kibana has no opt-in, nothing ships, exactly as in Kibana. Events leave
  through the shipper's `flush`, and Core's shutdown flushes the rest.
- **Usage counters.** `host.usageCounters.getUsageCounter(domainId)` is the usage collection plugin's
  `UsageCountersService`: the same `usage-counter` saved objects, one per counter and day, stored at
  the end of the run instead of on the interval. The daily clean-up stays with Kibana.
- **Feature usage.** The licensing plugin keeps when each feature was last used in a hidden saved
  object (`licensing-feature-usage`, one per feature) that every node and process writes, and
  `/api/licensing/feature_usage` and `getLastUsages()` read it merged with the node's memory.
  `host.licensing.featureUsage.notifyUsage` writes through the same store.
- **Connector execution logs.** The Actions client uses the native Event Log reader with the
  execution request's saved-object authorization and space. The writer drains queued batches before
  replying and remains open for later runs of a reused worker.
- **Anything else with a queue.** `host.onRunEnd(flusher)` registers what has to finish before the
  process answers. Security telemetry builds its own sender from a snapshot of Kibana's telemetry
  settings (opt-in, endpoint, cluster and license) and flushes its queue there.

**Config over the wire.** Kibana sends its Elasticsearch connection, the encryption keys, the
`security` settings (which carry UIAM) and the plugin configs the task type registered. Core
validates what it reads with its own schemas; certificates are written to a private temporary directory
that is removed at exit. Secrets go over the fork channel, the same trust as the Elasticsearch
credentials; never log them.

**Installs.** A run does what it would do in Kibana, and nothing a plugin's startup does. What a run
triggers (the alerts resources of a space it runs in for the first time, a signing key, the endpoint
action requests data stream) happens in the process with the plugin's own idempotent code. Startup
installs are Kibana's: Core's eager migrations and data stream initialization are skipped. Modules
declare lazily used storage through `dataStreams` or `createDataStreams(settings)`; Core registers those definitions locally and its
real `initializeClient` initializes the requested stream when business execution first needs it,
as it does in Kibana. Factories that only open existing resources retain that behavior.

### Plugin factories

A plugin that a run depends on exposes a function with explicit dependencies, used by both its own
`plugin.ts` and the process (`createMlRunServices`, `createInfraAlertingLibs`,
`createFleetRunServices`, `createRuleDataService`, `createRunTimeSecurity` ...). There is one
implementation and no copy to drift. Any execution dependency missing from a process is a parity
defect to complete before the affected capability is enabled.

### Capability failures

The existing `DeclinedRunError` reports a capability mismatch as `422`. Task Manager treats it and
an unserved task type (`404`) as an explicit failure without local execution. Process dispatch failures
are logged and counted by `TaskProcessDispatchFailureCounter`, including the reason returned by the
process. A capability mismatch is a parity defect to fix before enabling the affected feature.

### Parity with Kibana

A module can prove that its process registered what Kibana did. `parity: [{ kind, getIds(host) }]` on the
module says which ids the process registered for a kind (rule modules have `connectorTypes` and
`connectorAdapters`); `parity: { kind: () => ids }` in the options of `registerTaskType` says which ids Kibana
has. Kibana reads its side for every dispatch (a plugin can register a connector type at any time) and sends it
in `init.parity`; the process compares once, before its first run, and when Kibana has ids it lacks it logs a
warning that names them and declines every run. The per-rule check of `declineIfUnsupported` stays: it only
looks at the connector types the rule uses.

### Settings Kibana sends for every dispatch

Besides the plugin configs in `settings`, Kibana reads at each dispatch what changes while it runs: its final
in-memory connectors (`settings.actionsConnectors`: preconfigured connectors that did not conflict with a saved
one, dynamic ones other plugins registered, system connectors, with their flags; it holds secrets, so never log
it), its `uiSettings.overrides` and `uiSettings.globalOverrides` (read from Core's ui settings client, which
reports the overridden settings) and its `server.publicBaseUrl` exactly as Core has it, with `server.basePath`
only so that Core accepts a public base URL with a path. A process that has no public base URL builds no links,
as Kibana does not.

### Remote processes

The remote supervisor receives the same versioned dispatch snapshot as child-process mode and
passes initialization secrets to its execution child over IPC. Compatible snapshots permit sequential
reuse; changed plugin settings, registration ids, UI overrides or credentials retire incompatible idle
children. Evaluated feature flags and run identities are supplied for each execution. A worker requires
its bearer token on execution and cancellation requests and validates the dispatch version and deadline.

## Bundles

`node scripts/task_bundle` builds one bundle per file in `plugin.taskTypes`: Core, the plugins above
and the module. Workspace source is treated as free of import-time side effects, so a barrel costs only
what is used from it. Two traps: import leaf files (a cycle through an `export *` barrel leaves names
undefined in a bundle), and a module that reaches a plugin class through a barrel still pays for it.
Each entry is an ESM `.mjs` file. A complete build bundles all entries in one graph with shared
chunks under `chunks/shared/`; a single-entry build uses `chunks/<entry>/`. Connector definitions retain
metadata, schemas and validation at startup; services and SDKs load asynchronously when execution
needs them. Response-action implementations use the same boundary. Code splitting keeps those
implementations out of the enqueue-only startup graph. CommonJS dependencies use Node's
`createRequire` compatibility bridge. Every generated JavaScript file receives the Latin-1 transform.
Syntax minification is disabled because the pinned esbuild drops imports backing namespace getters
across shared entries. An executable regression checks this with the real APM field constants.

### Distributable

The `BuildTaskBundles` task of `node scripts/build` (after `BuildBundles`, before `InstallDependencies`) writes one
entry and its chunks per `plugin.taskTypes` entry and `manifest.json` to `<build>/task_bundles`, and the archive copy
step carries the directory into every platform folder. In a distributable `bundle_dir` defaults to
`<install dir>/task_bundles` (`REPO_ROOT` is the install dir there; from a repository checkout it is
`target/task_bundles`, which is where `node scripts/task_bundle` writes), and the manifest has
`{ kibanaVersion, bundles: { <name>: { file, files, taskType, bytes, startupBytes } } }`.
`bytes` counts all generated JavaScript; `startupBytes` counts generated imports required before readiness,
including the entry's awaited runtime imports and instrumentation initialization.
The shared `runtime` entry records the native APM SDK dependency files and their total bytes separately.
`files` lists the entry's generated output, including chunks and source maps. Copy the entire
`task_bundles` directory when moving a build; copying the entry alone omits deferred implementations.

The bundle hygiene integration test checks both `.es-query` and detection rules for EUI, accidental
plugin classes, exporter management code, tokenizer tables and connector executor SDKs in static
startup imports. Runtime integration tests exercise task processes against Elasticsearch.
Set `KBN_TASK_BUNDLE_TEST_DIR` to a freshly built bundle directory to run rule-process integration
tests against those packaged artifacts. The harness copies the directory, including chunks, and
requires every selected entry to exist; without the setting it builds the entries from source.

- **Externals.** `re2` and `canvas` are external. `re2` is no longer a dependency of Kibana (`re2js` is
  JavaScript, so it is bundled) and no bundle requires it. No bundle needs a native module: `lmdb`, `sharp`
  and `@parcel/watcher` are not in any bundle, and the `.node` files that are referenced
  (`zstd`, `kerberos`, `snappy`) are optional requires inside `try`/`catch` of MongoDB and AWS clients that
  Kibana's own `node_modules` would serve. If a native module is ever needed, add it to `EXTERNALS` and it
  resolves from the distributable's `node_modules`, since a bundle sits at `<install dir>/task_bundles`.
- **Native instrumentation runtime.** The artifact includes the installed APM SDK and its production
  dependency closure under `task_bundles/node_modules`. The SDK loads its own instrumentation files
  from that packaged directory. Its resolver starts from the bundle, so a moved artifact needs no
  external Kibana installation or `node_modules`. The packaging test starts the genuine agent and a
  transaction from an artifact with an unrelated working directory and empty `NODE_PATH`.
- **Nothing reads the source tree.** `@kbn/repo-info` is replaced with a stub that answers with the working
  directory, so a bundle never walks up to find a repository; a task process does not read the paths
  `@kbn/utils` derives from it. Libraries read their own packaged runtime assets, including the native
  APM instrumentation files, pino workers and source-map assets.
- **Cost.** Complete builds share Core and SDK chunks between task entries on disk. Each worker
  still loads its own runtime into memory.
  Artifact size includes deferred code and must be measured separately from startup memory.
- **Not covered here.** The full archive build (`node scripts/build`), and Windows.

### Memory measurements

Measured on 2026-11-06 with Node 24.21.0 and `--max-semi-space-size=2`. Each cell is baseline → candidate,
using the median of five interleaved runs per variant. The baseline includes PR #10's Latin-1 fix.
Both variants use the same validated settings and an active trial security license. These real-rule
fixtures differ from the minimal settings used for earlier startup-only measurements.

| Platform    | Task             | Startup (ms) | Idle RSS (MiB) | Idle heap used (MiB) | Peak RSS through first task (MiB) |
| ----------- | ---------------- | ------------ | -------------- | -------------------- | --------------------------------- |
| macOS ARM64 | Task Manager     | 504 → 337    | 200 → 158      | 87 → 49              | 201 → 158                         |
| macOS ARM64 | `.es-query`      | 880 → 676    | 344 → 266      | 173 → 114            | 365 → 267                         |
| macOS ARM64 | `siem.queryRule` | 1363 → 870   | 483 → 312      | 263 → 156            | 495 → 327                         |
| Linux ARM64 | Task Manager     | 575 → 381    | 181 → 142      | 86 → 49              | 181 → 142                         |
| Linux ARM64 | `.es-query`      | 1065 → 805   | 301 → 235      | 150 → 115            | 314 → 238                         |
| Linux ARM64 | `siem.queryRule` | 1674 → 1036  | 394 → 276      | 247 → 153            | 419 → 291                         |

These historical measurements predate native worker instrumentation.
Linux used `node:24.21.0-bookworm-slim` containers with a 1 GiB memory limit and two CPUs. Each run
started a fresh process and executed a real task against Elasticsearch; rule samples used fresh
rule IDs. All 60 runs succeeded. Peak RSS combines lifetime maximum RSS with observed RSS samples.
The bundles and their chunks ran in the containers without the repository or `node_modules`.

`node scripts/task_bundle_bench --json <file>` also records heap capacity and external memory.
Pass `--settings <settings.json>` for validated plugin settings and `--run <request.json>` for the
first task's wire request. The benchmark's memory probe is not included in distributable bundles.

Workflow startup measured on 2026-11-08 on macOS ARM64 with Node 24.21.0 and
`--max-semi-space-size=2`, using three samples per entry:

| Task | Median startup (ms) | Idle RSS (MiB) | Idle heap used (MiB) |
| --- | ---: | ---: | ---: |
| `workflow:run` | 1366 | 557 | 358 |
| `workflow:resume` | 1374 | 566 | 366 |
| `workflow:scheduled` | 1368 | 555 | 354 |

These are startup-only baselines with validated engine, Actions and Security settings, the three
native workflow scheduling definitions, and optional plugin services disabled. They do not measure
a workflow or agent execution. Each entry reaches approximately 71 MiB of generated JavaScript,
including deferred code, with 55.8 MiB loaded before readiness. The complete 52-entry graph shares
approximately 73 MiB of generated JavaScript on disk; per-entry sizes must not be added together.

### Contributions

A plugin adds what other plugins' task types need under `plugin.taskTypeContributions` in its
`kibana.jsonc`: `{ "alerting-rule-run": ["server/task_types/rule_run_contribution.ts"] }`. The file
exports `contribution`. A task type that lists the key in `contributions` gets every plugin's export:
the bundler imports them and the process hands them to the module. Stack connectors, cases and the
observability AI assistant contribute the connector types and adapters of their system actions, so a
rule module never names the plugins that add connectors. The workflow task types take two more keys:
`workflow-steps` (steps and triggers) and `agent-builder` (what plugins register with agent builder's
registries, see "Agent builder in a process").

## Making a plugin's services available to other plugins' tasks

A task process has no plugin lifecycle, so a service that another plugin's task needs has to be built
from explicit inputs. These are the steps, in the order most plugins need them.

1. **Extract a run-time factory with explicit dependencies.** Move the construction of the service out
   of `plugin.ts` into a function in the plugin's `server/` that takes what it needs as arguments
   (clients, the license observable, config, logger) and not `getStartServices`, plugin class state or
   module globals. `plugin.ts` calls the same function with Kibana's services, so there is one
   implementation. Examples: `createMlRunServices`, `createFleetRunServices`, `createRuleDataService`,
   `createInferenceRunServices`, `createRunTimeSecurity`. Read services lazily when they are used, not
   while the factory runs, because the process builds things in a different order than Kibana.
2. **Complete every execution dependency.** Extract the shared runtime service, contribute executable
   registrations, and snapshot current metadata from Kibana. Keep HTTP route installation and
   long-lived pollers in Kibana. Missing capabilities must fail explicitly while being completed;
   throwing placeholders and silent no-ops do not establish parity.
3. **Do not install anything at startup.** Index, template and data stream creation belongs to Kibana.
   Take already-installed definitions (build a client from its definition, skip mapping updates on
   read). Installs a run itself triggers in Kibana, such as an alerts index for a new space, stay as
   they are and use the plugin's own idempotent code.
4. **Send the config the factory reads.** Register it with `alerting.registerTaskProcessSettings(id,
() => config)` in `setup` and list the id in the module's `settings`. Send only what is read, in a
   form `serializeSettings` handles (plain values, durations, byte sizes and dates; no functions,
   `Map`, `Set` or `RegExp`), and read it as `host.settings[id]`. A plugin that cannot depend on
   alerting exposes a `getTaskProcessSettings()` on its setup contract and a plugin that can (alerting
   itself does this for `security`) registers it. Task Manager sends its own settings.
5. **Declare what the task reads of Core.** On the module or `createRuleTaskType` options: saved object
   types (`savedObjectTypes`), encrypted saved objects (`encryptedSavedObjectTypes`), event log
   providers, ui settings defaults, feature flags, the task types it schedules. Types the plugin owns
   should come from the same code that registers them in `setup` (a `get<Plugin>SavedObjectTypes()`
   that runs the real registration with a collecting registrar), so the process and Kibana cannot
   disagree.
6. **If Core must know about it, ship a task plugin.** Things that register with Core at `setup`, such
   as the security delegate, need a plugin: add `server/task_plugin.ts` exporting a `StaticPlugin`
   (`manifest` and `definition` with an optional `config`), keep it free of routes and the plugin class,
   and have the module list it in `taskPlugins`. Its `start` contract is what the runner reads as
   `host.plugins[id]`.
7. **If other task types need to register something with your plugin, take contributions.** Define the
   shape in the consuming plugin, add a key to the task type's `contributions` and have contributing
   plugins list a file under `plugin.taskTypeContributions` in their `kibana.jsonc` that exports
   `contribution`. Rule runs use `alerting-rule-run` (see `RuleRunContribution`).
8. **Do the side effects in the run.** Use `host.analytics.reportEvent`, `host.usageCounters` and
   `host.licensing.featureUsage` rather than the services directly: in a process they are the real
   shipper, counters and store, and the process flushes them before it answers. A plugin with a queue
   of its own builds it from explicit dependencies and a snapshot of what it reads from Kibana (send the
   snapshot as a setting) and registers its flush with `host.onRunEnd`. Nothing is returned to Kibana.
9. **Keep the bundle clean.** Import leaf files, not barrels. A cycle through an `export *` barrel
   leaves names undefined inside a bundle. Do not import a plugin class (`server/plugin.ts`); use
   `node scripts/task_bundle --name <bundle>` and the bundle hygiene test (`es_query_bundle.test.ts`)
   to check what ends up inside.
10. **Test it three ways.** A unit test of the factory with the plugin's existing mocks; a parity test
    (`expectModuleToMatchRegisteredRuleType`) for each rule type module; and, for a new family, a real
    run: build the bundle, run it through the supervisor against a real Elasticsearch and assert the
    run was not declined and wrote what Kibana would (see the tests named `*_task_process.test.ts`).
    `node scripts/task_bundle_bench` shows what the addition costs in startup time and memory.

## Alerting rule types

Every rule type is a task type module, `alerting:<ruleTypeId>`, built by `createRuleTaskType`
(`alerting/server/task_types/rule_task_type.ts`). Kibana registers it from the rule type and runs it
with the alerting plugin's services. The plugin that owns the rule type adds a module file to its
`plugin.taskTypes` that builds the same rule type from the process and runs the same `TaskRunner` with
services rebuilt from it (`task_types/standalone`): rules settings, maintenance windows, the alerts
service, an actions runtime that enqueues (and executes connectors only when the module asks), data
views, search and the locators the module lists.

```ts
// <plugin>/server/task_types/my_rule.task.ts
export const taskType = createRuleTaskType(
  {
    ruleTypeId: MY_RULE_ID,
    // The factory gets the host, the rule run runtime (read it when the rule runs, not while it is
    // built), field formats, settings and locators.
    getRuleType: ({ isServerless, host, runtime }) => getRuleType(isServerless),
  },
  { locators: [createDiscoverAppLocatorDefinition()] }
);
```

Options: `locators`, `savedObjectTypes`, `createSavedObjectTypes`, `encryptedSavedObjectTypes`, `uiSettings`, `eventLogProviders`,
`settings`, `executeConnectors`, `schedulableTaskTypes`, `taskPlugins`. A plugin whose rule types read
its config calls `alerting.registerTaskProcessSettings(id, getConfig)`. Add a test with
`expectModuleToMatchRegisteredRuleType` so the module and the plugin cannot drift.

Rule factories retain their typed parameters, state and action groups when passed to
`createRuleTaskType`. Rule workers use the native server Share URL client, the built-in and declared
locators, and the shared URL saved object definition with their locator migrations. Short URL
creation, reads, slug resolution and deletion use the request's saved objects client. Background
access-count updates finish before the worker returns, and redirect links honor the public URL
and server base path.

Rule contributions can declare `executionServices` with a native task module's requirements,
the service IDs they provide and a factory with execution cleanup. The bundler discovers nested
contribution keys before building. Core applies the requirements using revived dispatch settings,
including native plugins, data streams, saved objects, UI settings and scheduling metadata. Each
rule execution owns its service instances; overlapping and retained runs have separate instances.
Callbacks registered through `host.onRunEnd` during an execution belong to that execution;
callbacks registered during process setup remain available for subsequent runs.

A run in a process does what it does in Kibana; Kibana starts it and processes its end result (the
reschedule, the task state, the retries). What differs, and why:

- **`alert.status.changed` workflow events.** The batch is built by the same functions as in Kibana
  (`alert_status_changed_emitter.ts`), before the action scheduler clears the snapshot of the alerts, and is
  sent by the process before it answers, with the workflows client built from the request of the run. A
  plugin that wants the events contributes to `alerting-rule-run`: `register` calls
  `alerting.enableAlertStatusChanged({ isEnabled, featureFlags })` as the plugin does in Kibana (the flags it
  reads go in `declares.featureFlags`; Kibana evaluates them for each dispatch and sends them as
  `host.featureFlags`), and `getWorkflowsClient(request, context)` returns what `workflowsExtensions.getClient`
  returns. Workflow Management supplies this client and the `.workflows` connector's management API
  from the native workflow runtime. Main forwards its engine and workflow-extension settings and
  registry snapshots to rule workers. Connector execution uses the shared scheduling implementation;
  the management API retains the engine's native inline execution behavior for `runWorkflow`.
- **In-memory metrics.** The `node_rules` collector reads Kibana's counters, so Kibana counts what its processes
  served from the end of the run (`observeRemoteRun`): a result is an execution, a result with a
  `taskRunError` is also a failure (it is the same condition as the outcome of `TaskRunner`), a run Kibana
  cancels for its timeout is a timeout and no execution. An intentionally local run counts itself.
- **Settings Kibana decides.** `settings.alertingRun` carries what alerting learns from the plugins around
  it: whether the maintenance windows plugin is enabled (without it no window applies), the data views'
  `scriptedFieldsEnabled` (off by default in serverless), and the `data.search` config, the Elasticsearch
  timeouts and whether rollups are enabled. ES|QL searches read the license, as in Kibana. A plugin that
  reads feature flags in a run registers them with `alerting.registerTaskProcessFeatureFlags`.
- **License feature usage** is reported by the process for the rule types and connector types that need a
  license, to the store every node shares.
- **Native instrumentation.** Main sends its resolved APM, OpenTelemetry and monitoring settings and
  instrumentation environment. Workers initialize the same native SDK factories before importing task
  code. Task transactions, business spans and Core execution context share Main's factories. A dispatch
  continues its APM and W3C trace parents through remote supervisors. Native scheduling retains its active
  APM span parent. Each worker has a distinct OpenTelemetry `service.instance.id`; reused executions keep
  that identity. The task span ends before native exporters are force-flushed, and shutdown drains the
  providers. Startup settings, including Core's current `execution_context.enabled`, participate in reuse
  compatibility. `native_task_tracing_process` verifies actual APM and OTLP HTTP exports, scheduling span
  lineage and enabled/disabled Core labels across fresh and reused child and remote workers.
- **Exporter certificates.** Main captures the contents of native APM CA files and the global or
  signal-specific OTLP CA, client certificate and private-key files. Workers materialize them with private
  permissions before loading the SDKs and remove them after native shutdown. Native environment precedence
  is retained. Unavailable source files remain unavailable in the worker. `native_task_tracing_tls_process`
  verifies actual APM HTTPS and OTel mutual-TLS exports after Main's file paths have been deleted, including
  precedence changes and retained-worker replacement in both process modes.
- **Native counters.** The rule metrics cases in `es_query_task_process` and
  `native_connector_metrics_process` verify real OTLP exports from native rule execution and webhook
  connectors across fresh and reused child and remote workers. Each execution is counted once with delta
  temporality and native credential or connector labels. Reused workers retain their metric identity;
  fresh workers have distinct identities. Exports are flushed before the run answers.
- **Native Prometheus.** Workers hand off ordered native sum and explicit histogram aggregates through
  execution progress and final responses. Main retains cumulative totals after workers retire, using the
  SDK's cardinality limit and overflow series. Duplicate or late snapshots are not counted again, including
  cancellation acknowledgements and failed executions. The native exporter collects gauges from live,
  ready workers on each scrape, including retained idle workers, and preserves their resource identities.
  Gauges from other dispatching Kibana nodes are excluded. SDK numeric values retain their types across
  transport, and each Prometheus family has one metadata header. The native connector and rule Prometheus
  cases exercise the real exporter, Kibana response factory and Hapi adapter in both process modes.
- **Execution limits.** A rule that uses a connector type or adapter the process does not know, or a workflow
  rule whose executions are stored where the process cannot store them, fails explicitly. Fresh workers
  pay for the encryption service, license and alerts resource checks at startup. Reused workers retain
  Core while rebuilding execution services for each run.

### Testing a rule type in a process

`alerting/server/task_types/testing/rule_process_harness.ts` is the harness of every real run of a rule
type (`*_task_process.test.ts` next to the plugin that owns the rule type). `startRuleProcessHarness({ rules:
[{ taskType, bundle }] })` boots a test Elasticsearch with a trial license, builds the bundles once (four at a
time), sends the process every setting Kibana sends (alerting, actions, security with the license, `alertingRun`,
`cases`, `stackConnectors`, the final connectors and the parity lists; more with `settings`), and seeds rules,
connectors and API keys as Kibana stores them. `run(ruleId, ruleTypeId)` goes through `RemoteTaskRunner` and fails
when the run was declined; `runInProcess` runs the same rule in the test process, as Kibana's runtime does,
and `runBoth` compares the two. `createUserWithPrivileges` registers Kibana privileges in Elasticsearch, which a
process does not, so a rule can be created by a user who may or may not execute connectors or read a data view.
`rule_process_parity.test.ts` (stack alerts) holds the behaviour tests: enqueue authorization, saved object
privileges of the executor, timeout and cancel (and the in-memory metrics observer), a forked run against one in
the test process, and `alert.status.changed` with a fake workflows client contribution.

Every `alerting:*` task type has a real run in the test of its plugin. Each test seeds what
its executor reads (indices and documents, saved objects such as data views, SLOs, monitors and exception lists, machine
learning jobs and results), asserts that the run was served by the process (never declined), wrote its alerts and a
successful `execute` event, and equals the same rule run in the test process (`runBoth`: alerts, events, state):

| Plugin                  | Test (`server/integration_tests/`)                                                   | Rule types                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| stack alerts            | `es_query_task_process`, `stack_alerts_task_process`, `rule_process_parity`          | es query, index threshold, tracking containment                                                                                                                                                 |
| stack monitoring        | `monitoring_rules_task_process`                                                      | the 14 monitoring rule types                                                                                                                                                                    |
| transform, data quality | `transform_health_task_process`, `degraded_docs_task_process`                        | transform health, degraded docs                                                                                                                                                                 |
| ML                      | `anomaly_detection_alert_task_process`, `anomaly_detection_jobs_health_task_process` | anomaly detection, jobs health                                                                                                                                                                  |
| APM                     | `apm_rules_task_process`                                                             | error count, transaction duration, transaction error rate, anomaly                                                                                                                              |
| infra                   | `infra_rules_task_process`                                                           | metric threshold, inventory, log threshold                                                                                                                                                      |
| observability           | `custom_threshold_task_process`                                                      | custom threshold                                                                                                                                                                                |
| SLO                     | `slo_burn_rate_task_process`                                                         | burn rate                                                                                                                                                                                       |
| Synthetics, uptime      | `synthetics_rules_task_process`, `uptime_rules_task_process`                         | monitor status and TLS of both, uptime TLS legacy and duration anomaly                                                                                                                          |
| security solution       | `security_rules_task_process` (`server/task_types/integration_tests`)                | query (with exceptions and a response action that schedules the isolation of an Elastic Defend host), saved query, EQL, ES\|QL, threshold, new terms, indicator match, ML, legacy notifications |
| elastic assistant       | `attack_discovery_task_process`                                                      | attack discovery                                                                                                                                                                                |

### Running in a real Kibana (Scout)

The jest tests above do not boot the Kibana plugins. Three Scout config sets (API tests only) do,
with `xpack.task_manager.task_execution.mode: child_process`, `bundle_dir` set to bundles built when the config
loads (every declared task module in one shared graph; `TASK_PROCESSES_REBUILD=true` builds them again)
and `max_concurrent_processes: 2`. Kibana's log goes also to `target/task_processes_scout/kibana.log` as JSON
records, with Task Manager at debug, so the tests can see where each run happened.

| Config set (`kbn-scout/src/servers/configs/config_sets/`) | Tests (`task_manager/test/`)             | Proves                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `task_processes`                                          | `scout_task_processes`                   | an es query rule runs in a process (process started, lines of the process logged by Kibana with `task_type`, `run_id` and `child_logger`), writes its alert, and its server log action runs in Kibana; a webhook connector with secrets is used by an action; the extra runs past the cap retry in a process (`capacity`) and every rule completes; a run that Kibana cancels (timeout of 1 s for index threshold) leaves no process |
| `task_processes_unknown_connector`                        | `scout_task_processes_unknown_connector` | with a plugin that registers connector types no bundle knows (the parity check), the process declines and the rules fail (`declined`)                                                                                                                                                                                                                                                                                                |
| `task_processes_es_tls`                                   | `scout_task_processes_es_tls`            | the same over Elasticsearch with TLS, reached as `kibana_system` with the CA of the cluster                                                                                                                                                                                                                                                                                                                                          |

```
node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet task_processes
node scripts/playwright test --config x-pack/platform/plugins/shared/task_manager/test/scout_task_processes/api/playwright.config.ts --project local
```

The workflow suite uses HTTPS with a server base path and an isolated space. It parks and resumes human
input, waits for a synchronous child, reads that space's data views through Core's verified self client,
executes an Agent Builder Elasticsearch tool using Main's live registration snapshot, and cancels a parked
run. Only the language model is stubbed. Worker PIDs and dispatch failures prove process routing.
`task_processes` also inherits the standard serverless Search, Observability Complete and Security Complete
configurations, including Elasticsearch service-account credentials and UIAM. Workflow tests target all three.

Local stateful Scout runs and native process integration tests establish the current validation baseline.
The integration tests exercise Elasticsearch service-account credentials across fresh and reused child and
remote workers; the security tests also cover UIAM workload credential exchange with portable mTLS material.
Live serverless runs are deferred because they require Elastic's private UIAM image. The serverless
configurations remain available for subsequent validation; that deferral does not change the native
execution path or permit execution to fall back to Main.

Killing Kibana while a process is running is covered by supervisor tests rather than Scout.

The distributable builds the bundles into `task_bundles/`.

## Workflows

`workflow:run`, `workflow:resume` and `workflow:scheduled` (`workflows_execution_engine/server/task_types`)
are modules too. The engine's run-time is `createWorkflowRuntime(deps)`, built with explicit
dependencies: Kibana's plugin builds it from its services and a process builds it from its host
(`task_types/process_runtime.ts`). Kibana registers the three modules with `registerTaskType` and hands
the same module code the engine's runtime as `hostExtensions.plugins`, so a module reads
`host.plugins.workflowsExecutionEngine.runtime` in both.

What a workflow run needs beyond a rule run, and where it comes from in a process:

- **Calls to Kibana.** `host.http` is Core's self client aimed at the Kibana that dispatched the run:
  Kibana sends the address where a process reaches it (`kibanaUrl`) and `server.basePath` in `init`.
  Core captures its selected target, server metadata and both local and public TLS profiles for each
  dispatch. Workers restore the same client with those profiles, including CA contents, exclusive
  listener-certificate trust and local mTLS restrictions. Explicit local calls and public calls retain
  their respective targets and verification behavior.
  `callKibanaApi` and `kibana.*` steps use it with the credential of the run. Links (the `kibanaUrl`
  template variable, execution and approval links, rule URLs) are built from Kibana's own
  `server.publicBaseUrl`, which a process gets raw, so they are what Kibana builds.
- **Task Manager.** `host.taskManager` has `schedule`, `bulkSchedule`, `get`, `bulkGet`, `fetch`, `remove`,
  `removeIfExists`, `bulkRemove`, `bulkUpdateSchedules`, `runSoon` and `ensureScheduled`, supplied by
  native `TaskStore` and `TaskScheduling` within the module's declared write scope. Dispatch captures
  Main's task metadata, security license state and API-key strategy. Owning plugins contribute the
  native parameter schemas and state migrations through `task-scheduling`; a required schema missing
  from the worker fails startup before execution. Task credentials use the same encryption registration
  and current encryption keys as Main, including service-account credentials and removal invalidation.
  Native force, priority and schedule-update policies are shared. When Main enables claim nudges,
  `runSoon({ requestImmediateClaim: true })` refreshes and notifies through the native nudge service;
  run completion waits for pending notifications within the worker's flush deadline.
  Native task-creation counts are sampled over the authenticated control channel and reconciled with
  the final run total, including failed runs. Repeated or older samples are ignored. Counts remain
  best effort when a worker crashes before its next sample. Force checks read the dispatching node's
  actual current execution pool through the authenticated run-control channel, including through a
  remote supervisor. Completed reads are never reused; unavailable metadata fails the operation
  before a write. Middleware registrations carry stable IDs in their original registration order.
  Owning plugins contribute the same native factories under `task-scheduling`; missing, duplicate or
  anonymous registrations fail before process execution. Workers instantiate only the active factories.
  The performance fixture persists its scheduling timestamp so Main can measure elapsed time when a
  worker created the task, without relying on another process's in-memory performance marks.
- **Parking.** A wait over five seconds, a wait for input or approval and a sync child workflow park the
  run and schedule a `workflow:resume` task; a second process finishes it.
- **Data streams.** The engine registers its shared definitions with native Core using the current
  dispatch storage settings. Its log and trigger-event clients use Core's lazy initialization,
  preserving native template and first-use creation behavior. With `storage.source: data_stream`,
  the workflow and step execution streams are also initialized through Core before their shared
  native data clients are built. Metadata refresh timers do not keep workers alive. The process
  matrix parks and resumes executions across two rollovers, preserves Main updates, rejects stale
  compare-and-set revisions and verifies fresh revisions in all four worker modes. Attack-discovery
  rules use the same initializer and native scheduler for either storage mode, including encrypted
  workflow tasks; data-stream storage no longer causes those rules to decline.
- **Cases attachments and files.** `cases-attachment-types` contributions restore the native definitions
  registered by Security Solution, Observability, Osquery, ML and AIOps. Main sends the current type IDs,
  feature settings and file configuration; Cases checks registry parity before operations. Attachments,
  events and alerts use native validation, scoped file services and authorized rule-registry clients.
  Main and workers use Core's serializer and the same Spaces service. The four-mode execution matrix
  creates and deletes attachments, uploads evidence and verifies deletion of its metadata and blob contents.
  Native file usage counters and performance events use the worker's durable counters and analytics.
- **Cases solution services.** `cases-client` contributions restore solution-owned close-reason
  validators and alert-status listeners. Security uses the same scoped UI-setting validator as Main
  and forwards Cases mutations through the shared native Security event bus. The run flushes that
  bridge before cleanup. Missing or unexpected owner registrations fail before a Cases operation.
  Notifications restore Main's configured email connector ID and use the shared license-checked
  connector service to enqueue native Actions tasks. The assignee HTML template is a `.text` asset
  imported by the common renderer, so process bundles do not depend on the source-tree layout.

- **Sandbox sessions.** `sandbox.runtime` constructs the native gRPC client and session factory shared
  with Main. The owning plugin captures its validated connection settings and the exact PEM bytes
  loaded at startup; workers receive no Main-local TLS paths. Session keys retain native space and
  conversation scoping, and run cleanup closes the gRPC connection. The four-mode integration proof
  makes eight real mTLS RPCs after deleting Main's temporary certificate files, with no Kibana HTTP
  requests. Disabled Sandbox configurations retain Main's native unavailable-service behavior.

- **Service accounts.** A workflow with `settings.run_as` runs in the process as in Kibana. The security task
  plugin builds the plugin's own `ServiceAccountsService` from explicit dependencies: Kibana sends
  `serviceAccounts.enabled` and `requestLifetime`, the cloud project context (organization, project and
  project type, for UIAM) and, with UIAM, the contents of the mTLS certificate, key and certificate
  authorities (not their paths, so that a remote process can connect). The two hidden saved object types
  (workload bindings, credentials) are registered by the plugin's own functions, and the service needs the
  encrypted saved objects plugin, which a module gets by declaring encrypted saved object types (the
  workflows module does). The engine's task plugin registers the `workflow` workload type and hands
  `core.security.serviceAccounts` to the runtime, because Core scopes the workload methods to the plugin
  that registered the type. Both backends are served: Elasticsearch service accounts (the credential is
  read and decrypted in the process) and UIAM (the process exchanges the account for a token itself). Without
  the encrypted saved objects plugin or with `serviceAccounts.enabled: false`, `canRunAs()` is false and the
  workflow is declined.
  A separate four-mode proof uses a real `elastic/kibana` Elasticsearch service-account token for
  internal persistence while the workflow's Elasticsearch step retains its scoped user API key.
- **Metering.** The process reports the usage record itself. Kibana sends the Usage API connection (URL
  and TLS, setting `workflowsUsageApi`, only when it reports metering), the process builds the same
  `WorkflowsMeteringService` over the usage API's own `UsageReportingService` (the same retries, the same
  deduplicating record id, the same error log when the endpoint is down) and flushes it with
  `host.onRunEnd` before it answers. Without a connection, nothing is metered, as in Kibana.
- **Side effects.** Analytics events (the telemetry task plugin, the event types of the engine, the
  connectors and every step contribution's `declares.analyticsEventTypes`) and usage counters
  (`usageCounters: true`, such as the cases counter) are the process's own; nothing is returned to Kibana.
  A run's answer holds the result and nothing else, and Kibana only reschedules.
- **Connector steps.** The actions executor is initialized as for attack discovery, with the connector
  types of the `alerting-rule-run` contributions.
- **Steps.** The process step registry (`createServerStepRegistry`) holds the internal `data.*` steps and
  what plugins contribute under the key `workflow-steps`.

### Contributing steps

A plugin lists a file under `plugin.taskTypeContributions['workflow-steps']` in its `kibana.jsonc`. It
exports `contribution: WorkflowStepsContribution` whose `register(registry, context)` calls the same
registration function the plugin's `setup()` calls, with services built from `context.host` and
`context.services`. `declares` adds the saved object types, encrypted types, ui settings, settings, feature
flags and event log providers it needs to the module. Rules to follow:

- A plugin sends its settings with `workflowsExtensions.registerTaskProcessSettings(id, getter)` in `setup`.
  They are optional: a disabled plugin sends none and the contribution registers nothing.
- Do not register a step that reads a registry other plugins fill in their own `setup()` (cases attachment
  types, the features registry) unless the registry is filled by contributions too, as agent builder's is
  (see below). It would behave differently from Kibana. A workflow that uses a step the process lacks is
  declined before anything is written, and the task fails.
- `context.registerRunCheck(check)` verifies required registrations and capabilities before a run writes.
  Templated values resolve through the handler at execution time, as in Kibana. A missing capability fails
  the task without changing executors.
- A service that queues events registers a drain with `services.registerRunCompletion`. These drains
  finish before execution-service cleanup and before telemetry and event-log flushing. Drains added by
  other drains are awaited too; a drain failure is reported after all pending work settles.
- A step that reports analytics events lists their types in `declares.analyticsEventTypes`. For
  heterogeneous payloads with optional nested schemas, use `declares.registerAnalyticsEventTypes`
  and call the same typed registration function as the native plugin. Task Core deduplicates event
  names across arrays and callbacks. Agent Builder contributions support the same declaration. A step that
  counts usage reads `host.usageCounters.getUsageCounter(domain)`.

Contributions can provide lazy execution services with `provides: { serviceId: (context) => service }`.
`context.services.getService<T>(serviceId)` returns the same instance throughout one run. Agent Builder
contributions use the same resolver. Providers and their mutable registries are rebuilt for the next run,
including when Core and the bundle are reused.

The `workflows.management` and `workflows.extensions` providers share one `WorkflowsRuntime`: the full
management API, request-scoped trigger clients and owner-bound managed workflow clients use the same
services and license checks as Kibana. The `spaces` provider uses the real spaces client and security
wrapper over stored space documents, with the captured feature registry, solution visibility and CPS
routing. `nightshiftSources` uses the source catalog's shared client factory; its change emitter awaits
subscribers before writes return.

`alertingVTwo` uses the plugin's dependency-injection modules for its request-scoped clients. Resource
initializers check deployed data streams, templates and pipelines; Kibana owns installing and upgrading
them. Its event bus drains queued handlers, including nested events, before the run completes. Event
subscribers and the response-format subscription are released for each execution.

Evals exposes its executable registry as `evals.taskProviders`. A plugin that calls `registerTaskProvider`
in Kibana also registers the same provider from its workflow contribution through that service. The
`evalsTaskProviders` dispatch snapshot lists the expected provider names, which are checked against the
completed execution registry. Both literal and templated `task_ref` values execute through that registry.

### Agent builder in a process

`ai.agent`, `ai.conversation.*` and `ai.attachment.*` read agent builder's registries (tools, agents, agent
types, skills, attachment types, conversation templates and event types, renderers, hooks, plugins, the AI
index resolver), which about two dozen plugins fill in their `setup()`. A process has no plugin lifecycle,
so it is built the way the plugin builds it, from explicit dependencies, and filled by contributions.

**The run services.** `createAgentBuilderRunServices(deps)` (`agent_builder/server/run_services`) builds the
`ServiceManager`, registers what agent builder itself registers (the connector tools, the SML tools, the hooks,
the Deductive agent) and returns the registries (`serviceSetups`), the registration surface plugins use in
`setup()` (`setupContract`, an `AgentBuilderPluginSetup`) and a recorder of the ids registered with each
registry. The plugin's `setup()` calls it with Kibana's services; the process
(`task_types/create_agent_builder_process_services.ts`) calls it with the host: the inference services of
`createInferenceTaskProcessServices` (chat models and clients are built from the connectors, with the run's
request and credential), the search inference endpoints with Kibana's complete feature snapshot and the recommended
endpoints Kibana's poller had found (sent as a setting), Core's Elasticsearch, saved objects and ui settings,
the actions client of the run, the usage counter and analytics of the host, the deployment information Kibana
sent, and a space taken from the run's request. The start contract plugins read (`getAgentBuilderStart()`) is
built by `createAgentBuilderStartContract`, which the plugin's `start()` calls too. Asynchronous execution
callbacks use the shared actions configuration and relay client. Conversation events are forwarded to the
workflows triggers with the engine's runtime and flushed before the run answers.

**Contributions.** A plugin lists a file under `plugin.taskTypeContributions['agent-builder']` in its
`kibana.jsonc` that exports `contribution: AgentBuilderContribution` (`@kbn/agent-builder-server`):

```ts
export const contribution: AgentBuilderContribution = {
  // What the registrations read besides Core: merged into what the workflow task types declare.
  declares: {
    settings: [MY_SETTINGS_ID],
    savedObjectTypes: [],
    uiSettings: [],
    featureFlags: {},
    analyticsEventTypes: [],
  },
  register: (agentBuilder, { host, logger, settings, services }) => {
    if (!settings[MY_SETTINGS_ID]) return; // the plugin is not enabled in this Kibana
    registerMyPluginAgentBuilder(agentBuilder, {
      /* services built from `host` and `services` */
    });
  },
};
```

`agentBuilder` is the same `AgentBuilderPluginSetup` plugins register with in `setup()`, and `register` calls the
function `setup()` calls (`registerXAgentBuilder(setup, services)`), so there is one implementation. Rules:

- Everything conditional (config, the serverless project type, a feature flag, whether another plugin is there)
  is decided in Kibana and sent: `agentBuilder.taskProcess?.registerSettings(id, () => value)` in `setup()`, read as
  `settings[id]` and listed in `declares.settings`. Send `() => ({})` at least, so that a plugin that is not
  enabled in this Kibana (a plugin of another solution, `enabled: false`) registers nothing in the process.
- `services` has what a registration reads in Kibana from `coreSetup.getStartServices()` (`getCoreStart`,
  `getActionsStart`, `getInferenceStart`, `getAgentBuilderStart`, `getWorkflowsManagement`), lazily. A registration that
  needs a service the process does not have is not made, and the parity guard reports it: do not register a tool that
  would answer "not available" instead. Services that other plugins own are built from explicit dependencies by a
  function the plugin and the process share (`createLlmTasksStartContract` with `createProductDocReadServices`, and
  `createFilesRunServices`, which the platform contribution uses for the product documentation tool and the image
  attachment type).
  Documentation availability uses Main's shared status reader over native Task Manager storage, so a pending
  install reports `installing` and a failed task reports `error` even when product records say `installed`.
  Security Labs uses the native package client, including persisted installation state and update detection
  against the configured artifact repository. Product Docs captures its repository URL, proxy and inference
  ID on every dispatch; enabling LLM tasks without that configuration fails explicitly.
  The documentation retrieval matrix executes the real platform tool against indexed `semantic_text`
  documents and a real inference endpoint in all four worker modes. Only embedding and language-model
  responses are stubbed; installation metadata, search, token processing and returned references use
  the native SDKs, with no Main business requests.
- SML types (`agentBuilderSml.registerType`) are registered with `context.registerSmlType`, which takes the place of
  the SML plugin's setup contract (`{ registerType: context.registerSmlType }`). The process owns an SML service
  (`createSmlService`, started with the privileges of the security task plugin) and an SML start contract
  (`createSmlStartContract`), which the SML tools read. Kibana's ids come from `getRegisteredTypeIds()` of the SML plugin,
  and are compared under the `agentBuilder.smlTypes` parity kind.
- Import leaf files, and take the registration function's services as arguments, as for every plugin factory.

**Parity.** Kibana sends the ids it registered with each registry (`workflowsExtensions.registerTaskProcessParity`,
one kind per registry: `agentBuilder.tools`, `.agents`, `.skills`, `.attachmentTypes` ...), read at every dispatch,
and the process compares them with what it registered, in both directions: an id Kibana has that the process lacks
(a plugin that does not contribute yet, a registration the process cannot make) and an id only the process has (a
plugin that contributes but is disabled in this Kibana). The steps that read the registries are declined, with a
warning that names the ids, and the task fails; every other step is served as before. This is not
`TaskTypeModule.parity`, which declines every run of the process: most workflows do not use agents, and they keep
running in a process while contributions are still being added. The parity is `host.parity`, compared with
`findMissingParity`. Every plugin that registers Agent Builder extensions contributes its native
registrations; an inventory mismatch fails explicitly before an agent step executes.

**The workflows management API.** The hooks that run an agent's workflows, the `workflow` tool type and the tools of
the plugins that run workflows read `workflowsManagement.management`. The process uses the same
`WorkflowsRuntime` and `WorkflowsManagementApi` as Kibana, composed from explicit execution, authorization,
actions, storage, and registry dependencies. The plugin's lifecycle adapter supplies these dependencies
from Core; the `workflows.management` contribution supplies them from the run. CRUD, validation,
inline and saved execution, managed workflows, history, resume, and cancellation share one implementation.
Management side effects include audit events and SML indexing, which the process flushes before replying.
Change history opens the data stream Kibana installed instead of installing assets at worker startup.

`WorkflowStepsContribution.provides` declares lazy run-service providers. `services.getService(id)` resolves
one instance per execution; `registerService` publishes services after asynchronous composition, and
`getExecutionEngine` resolves once all step contributions have registered. Duplicate and circular providers
fail explicitly. Agent Builder publishes its start contract as `agentBuilder`; proposal steps use its
attachment client. KI verifier workflows are scheduled as separate tasks, so their caller can poll and
cancel them through the same access-controlled management API.

**Global ui settings.** `declares.globalUiSettings` (of an `agent-builder` or `workflow-steps` contribution) are
registered with `registerGlobal` in the process (`TaskTypeModule.uiSettings.globalDefaults`) and read with
`host.uiSettings.globalAsScopedToClient`; a key several contributions declare is registered once. The Deductive
agent's settings and the context engine's memory setting are declared this way, so the Deductive agent no longer
declines runs.

**Services a tool reads.** Build them from explicit dependencies in a function the plugin's `setup()`/`start()` and
the contribution share (`createContextEngineRunServices`, `createCasesRunServices`, `createProposalsRunServices`)
and create them lazily: the contribution registers (also with the stub host of `collectRegisteredIds`) before the
services can be built from the host.

A checked-in list of the ids the contributions register (`agent_builder_contribution_ids.json`) and a test that
every plugin that takes `AgentBuilderPluginSetup` contributes its registrations
fail when a plugin registers something new without a contribution. Test a contribution with
`collectRegisteredIds`, and a registration end to end with
`workflow_agent_builder_process.test.ts` (a real bundle, Elasticsearch and a stub LLM behind a `.gen-ai`
connector).

Who contributes: discover, elasticsearch_home, search_getting_started, apm (service map), custom_content,
agent_builder_visualizations and agent_builder_platform (tools, attachment types, skills, templates, event types),
proposals (the services over the plugin's storage, and agent builder's attachments), context_engine_agent_builder
(the AI index services, the signals and improvements stores), cases (the cases client of `createCasesRunServices`,
with the events of the tools bridged to the workflow triggers) and ml (the anomaly detection skill; the
capabilities of a request are resolved from its `ui:ml/*` privileges through the native Spaces and ML
license switchers).
Agent Builder Dashboards uses `createDashboardServerClient` with native embeddable transforms,
schemas and persisted-state migrations. Main captures the factories, definitions and drilldowns it
actually registered. Workers restore that inventory through `embeddables` contributions from Controls,
Dashboard, Markdown, Discover, Visualizations, Lens, Maps, ML, AIOps, Custom Content and URL Drilldown.
Missing registrations fail explicitly. Lens reads the current `lens.apiFormat` flag for each execution;
schemas and dashboard read services are isolated across overlapping and retained runs. Dashboard saved
objects use the full native embeddable migration registry. Agent Builder Workflows uses the shared
management API, including CRUD, validation, inline execution and scheduling. Visualizations, Platform,
Dashboards and Workflows contribute their SML types. Product documentation and Security Labs use the
native status readers described above.

Also contributing since: streams (the scoped clients of `createStreamsRunServices`: the streams client over its
storage, the scoped Elasticsearch client, the inference client of the process, the license and the fields metadata
service resolved from the shared metadata registry, native authorized rule readers and encrypted saved objects;
tool availability reads the current authorized space and applies the same solution gate as Kibana) and evals_skills (the dataset service and the
evaluator registry of the evals plugin, built by the same classes, the model connectors of the process's inference
service and the privileges of the security task plugin; saving and running an experiment use the shared workflow management runtime).

The engine also exposes the native field metadata service as `fieldsMetadata` in the workflow service
registry. It uses the active extractor provider IDs captured from Kibana at dispatch, and resolves each
provider through `fieldsMetadata.extractors.<id>`. Missing registered providers fail explicitly. Fleet
capabilities are evaluated with the task's credentials by the shared Security switcher, then restricted
by the current authorized space and native solution gate. The Streams extractor is available through
this registry, and Streams consumes the shared service. Fleet contributes its native package client and
extractors using the package registry configuration and portable file material captured at dispatch.

Fleet's shared execution initializer now takes genuine Core saved objects services and explicit security
and encryption capabilities. Core's FIPS setting is carried into worker boot and exposed through the task
host. Its package-material capture helper snapshots the native bundled archives and cached signing key;
the archive decoder reads captured bytes and checks their SHA-256 digest. The native bundled-package
and signature loaders select this material explicitly in workers, so a remote host does not need the
original file paths. The worker package client uses real Core saved objects and Elasticsearch services;
run cleanup releases Fleet configuration and license subscriptions. Response actions use the same
snapshot and genuine task Security license and audit services. Rule modules declare the snapshot in
`optionalSettings`, matching Fleet's optional plugin dependency; executing a response action requires
the snapshot.

Workflows resolve native Fleet services through `fleet.runServices`. The shared initializer runs
once per task run and releases its subscriptions at run end. Fleet contributes its complete native
saved-object definitions using the dispatch configuration, including the space-awareness namespace
setting. Enrollment queries use the native scoped agent service and current Elasticsearch documents;
retained workers do not cache agent availability between runs.

The nine archives pinned in `fleet_packages.json` have registry content lengths totaling 26,063,815
bytes, or 34,751,764 bytes after base64 encoding (33.1 MiB, measured November 7, 2026). Full dispatch
size validation must also include build-time version rewrites, the signing key, configuration and
other plugins' settings against the remote host's 64 MiB request limit.

Native observability data services are available through the workflow service registry:

- `apmSourcesAccess.setup` and `apmDataAccess.setup` use the validated APM source configuration and
  current saved-object overrides. Kibana and APM rule workers share the same index resolver.
- `dataViews` uses the native data-view factory, saved-object definition, field formats and
  request-scoped Security and Spaces capability switchers. Its dispatch snapshot carries the
  plugin's actual scripted-field and rollup settings. Conditional defaults use the same UI
  registration helper as Kibana; meta-field and default-view settings share their native definitions
  with the Data plugin. Rule runtimes use the same native capability factory, with current feature
  registrations and whether Spaces is enabled captured at dispatch. Security privileges and active
  space restrictions are checked for each request. Tests exercise both data-view factories with
  changing task credentials and disabled-space features in fresh and retained local and remote workers.
- `ml.setup` uses the shared ML service factory with native authorization, licensing, audit,
  data views and Spaces. The module recognizer reads a dispatch snapshot of its installed manifests,
  job and datafeed definitions, logos and saved-object assets. It does not need source-tree paths
  on the worker. Shared capability checks receive the actual authorization, license and feature
  settings for credential-bearing workflow requests. ML rule workers use the same factories and
  portable assets, require their dispatch settings, and use captured Cloud facts and native Spaces
  services. ML capabilities read current space-disabled features on each request, including the
  native AIOps gate. Real workflow tests cover credential denial and space disable/re-enable in
  fresh and retained local and remote workers; rule tests cover both ML types and their APM,
  Uptime and Security consumers.
- `logsDataAccess` uses the native logs service factory and Core UI settings clients, including
  request-scoped reads and writes of the configured log sources.
- `observabilityAgentBuilder.dataProviders.apm` and `.infra` register the same providers as Kibana
  over native APM, Infrastructure, ML, SLO and alert clients. The Observability agent contribution
  restores the captured successful tool, attachment and skill registrations and binds each data
  provider to its captured owner. Missing owners or providers fail explicitly. Real worker tests
  cover APM error updates, host CPU changes, log-source changes and credential denial in fresh and
  retained local and remote workers.
- `metricsDataAccess.setup` uses the native metrics client. Its dispatch snapshot identifies any
  installed default resolver; `metricsDataAccess.defaultIndices.<owner>` restores that resolver
  through its owning plugin's factory. Infra contributes its native source resolver. Missing or
  unowned resolvers fail explicitly. Explicit metric-index saved objects retain their native priority.
- `slo` and `observabilityAgentBuilder.dataProviders.slo` share the native scoped SLO client and
  details provider. Each request resolves its current space and uses its scoped saved object and ES clients.
- `observabilityAgentBuilder.dataProviders.synthetics` shares the native monitor repository and public
  field selection. Both monitor saved object types use the real encryption migration factories;
  reading monitor details does not decrypt secrets.
- `ruleRegistry.getRacClientWithRequest` uses the native alert client, authorization class, audit
  logger and rule data service. Alerting captures its current rule identifiers, alias metadata,
  feature definitions and Security/Spaces availability at dispatch. Requests retain native read and
  write privileges and space filters. A changed bootstrap snapshot starts a fresh worker; unchanged
  snapshots retain the worker while credentials and alert documents change between runs.

**Registrations after start.** What a plugin registers once Kibana has started (`agentBuilder.skills.register` and
`agents.ensure` of the start contract) can change while Kibana runs (significant events registers its skills when a
feature flag flips on). A contribution adds `registerAtStart(start, context)`, which calls the function the plugin
calls with `start` (`AgentBuilderContributionStart`: `skills.register` and `agents.ensure`). Kibana decides the
current set and sends it as settings with each dispatch (`registerSettings(id, () => current)`, evaluated at every
dispatch), the process runs `registerAtStart` with these settings, so it registers exactly that set and skills
registered at start count in the `agentBuilder.skills` parity. `agents.ensure` in a process only keeps the
availability and visibility of the agent in memory (`setAgentAvailability`): Kibana persisted the agent, a process
does not write it. An availability that holds a callback is sent as data (the result Kibana evaluated for this
dispatch) and rebuilt by the registration as a handler that answers it, or is the process-side equivalent built by the
same factory. Test it with `collectRegisteredIds`, which runs `registerAtStart` too.

**Discovery.** Attachment and skill registration follows the exact successful registration snapshot from Kibana,
including flag-off startup. The shared runtime supplies authorized workflow management, scoped Spaces and
inference services, and the native discovery data client. Asynchronous generation is queued as a separately
owned, nonbillable workflow task before returning `pending`. Synchronous agent calls read that task's persisted
result and stop waiting at their existing deadline while the queued job continues. Execution UUID, source,
request identity and space are preserved across the task boundary; the source keeps the native gate and result
policies. Only metadata bound to an owned ephemeral execution can choose these policies; caller metadata and
rendered context overrides cannot. Each pipeline phase and the optional report are scheduled by the native orchestration.

**Significant Events.** The worker calls the native tool, attachment, agent type, skill and SML registration
factories using the successful registration snapshot. Scoped clients use native Security, licensing, source
catalog, field metadata, V2 alerting, workflow management and Core data-stream services. Agent installers rebuild
runtime availability policies while persisted agent profiles remain owned by Kibana. Feature flags and caller
privileges are evaluated for each execution, including executions in a retained worker. Interactive confirmation
requests retain the native non-interactive refusal behavior.

**Agentic Investigations.** Native impact, subject and hypotheses attachments, investigation tools and escalation
conversation events use the same registration and document-store factories as Kibana. All four investigation
workflow steps use the run's Agent Builder conversation and attachment clients, native Security privilege checks
and Core user attribution. Reopening preserves native rename authorization and template checks; appending workflow
execution ids preserves ordering and avoids duplicates.

**AlertZero agent contribution.** Kibana and workers use the same registration function for the
action-discovery tool and skill, three attachments, agent type and conversation-update trigger. The
catalog uses the native action service and request-scoped workflows client. Reads retain the caller's
privileges, workflow ACLs, category filters and space setting. Kibana captures whether the action and
management services started; workers do not substitute another service when either is unavailable.
The owning workflow contribution registers the same native UI setting when AlertZero is enabled.
Outcome reporting uses the native owner-bound managed-workflows client and the request-scoped
execution reader to verify persisted lineage. Its event schemas use the same registration helper
as Kibana. Worker tests change and restore the workflow owner before accepting another report.
`alertzero.investigation.summarize` reads the native conversation timeline, runs the native agent
with structured output, and patches the conversation's metadata. Kibana and workers share its
connector resolver, including the configured AlertZero frontier feature policy. The step checks
the shared `agentBuilder.parity` preflight before executing. Agent Builder declares the native
inference-settings type its model-policy client reads, independently of the optional inference
workflow steps. Real summary tests cover private-conversation denial, persisted metadata and
feature-specific connector selection in fresh and retained local and remote workers.

`hunt.packageReport` uses the native conversation and attachment clients, action catalog, scoped
Fleet enrollment and Proposals service. Kibana and workers construct Proposals through the same
factory. Packaging checks Agent Builder registration parity before execution and resolves the
current Context Engine setting through native scoped UI settings. Execution tests change the
task's proposal-read privileges and agent enrollment between runs, including a same-named agent
in another space, across fresh and retained local and remote workers.

Triage reads live workflow executions through the same native authorized reader in Kibana and
workers. It shares the HTTP license policy and managed-execution gate, checks API privileges for
each read, and delegates ACL filtering to the management API. The reader derives its space from
the native request. Tests cover changing privileges, private workflows, current execution statuses,
and actual default and non-default-space dispatches in every worker mode.

Detection-alert reads and tag changes use the shared native Security Solution operations in Main
and workers, including current API privileges, search validation, request-scoped Elasticsearch,
audit events and observed tag-change deltas. The native event bridge finishes forwarding before
a worker answers. Execution tests cover default and foreign spaces, permission changes, filters,
persisted claims and trigger-event execution lineage in all four worker modes without Kibana calls.

Nightshift registers all fifteen workflow steps through the same factory as Main. Its native runtime
uses the shared investigation and subject clients, persisted quotas, scoped custom context and
secrets, notification routing, server locators, Sandbox sessions and trigger completion tracking.
Main and workers also share its agent, Sandbox-tool and attachment registrations, with the same
feature and plugin-presence gates. Worker tests cover native agent installation and readiness,
mTLS workspace allocation and quota denial across independent runs in all four execution modes,
without Kibana HTTP calls.

Entity Store exposes its native metadata, relationship, resolution, resolution-rule and maintainer-status
clients in workers through the same factory Main uses. Main captures its live maintainer registry for each
dispatch; workers use that execution's registry with the real Task Manager and scoped Elasticsearch and saved
objects clients. All four worker modes cover persisted resolution-rule changes, entity linking, relationship
reads and maintainer status without business calls to Main.

Alerting exposes native scoped rule readers through the workflow service registry. They execute the same
`get`, `resolve`, `find` and `bulkGetRules` domain operations as Main, with native authorization, audit logging, licensing,
reference injection and secret sanitization. Main captures its current rule catalog at dispatch. Owning plugins
contribute their actual reference injectors and view URL callbacks; a missing required callback fails explicitly.
Streams uses these readers for attachments and suggestions, and registers its canvas configuration and encrypted
attributes through the same saved object registration function as Main, with the captured canvas gate.

Lens captures custom visualization migration IDs and versions at dispatch. Native contributions provide the
actual migration functions, and the worker verifies that they match Main's enabled inventory before building
its embeddable factory. The example visualization shares its migration factory between Main and workers.
Dashboard saved object migrations and execution services resolve the same contributed migration registry.

Native workflow search uses Data's strategy providers with Main's search configuration, Elasticsearch
timeouts, rollup setting, UI validation setting and documentation links. Scoped cancellation and TTL
extension preserve the request principal and project routing. Shared Data and Data Views defaults are
registered once when the SDKs are composed.

Security's Endpoint workflow services compose native Fleet authorization and file clients, scoped Data
search, Spaces, connector actions, telemetry opt-in and the product-feature snapshot. Main and workers
share the Endpoint CPS resolver and the product-feature reader. The four-mode process matrix executes
24 searches and authorization checks while changing feature gates and telemetry opt-in, verifies reuse
within unchanged settings and replacement after settings change, and asserts no business calls to Main.

Security's enabled Agent Builder contribution shares Main's complete tool and skill registrars,
attachment registrations, rule draft generation, entity clients and watchlist source tools, with
the dispatch's feature gates and plugin availability. Managed MITRE clients use the owning population
and retry lifecycle. Background watchlist sync and lead generation register completion callbacks so
the worker finishes their writes before disposing execution services. Rule preview uses the shared
preview executor, alert schema, preview data client and native Alerts Service. Its four-mode process
test verifies persisted preview alerts, confirmed entity changes and asynchronous Agent Builder task
scheduling without business calls to Main.

### Workflow registration coverage

Every plugin that registers with Agent Builder contributes its native registrations. The contribution
coverage test has no plugin exemptions, and checks the enabled inventory against the checked-in tool,
skill, attachment and other registry IDs. Native execution checks that inventory against the snapshot
Main sends for each dispatch. Missing registrations fail explicitly; execution never falls back to Main.

`ai.agent`, `ai.conversation.*` and `ai.attachment.*` use the shared Agent Builder runtime and native
services. Asynchronous Agent Builder execution schedules its owned `agent-builder:run-agent` task
through the scoped Task Manager capability; workflow agent steps retain Main's synchronous execution
semantics. Shared UI defaults are registered once across all contributed SDKs, including defaults
derived from the dispatch's configuration.

Inference features are sent as the `inferenceFeatures` settings snapshot at each dispatch, including parent
relationships, model policies and the current recommended endpoints. Both AI steps and Agent Builder restore
that registry, so features registered by other plugins and templated `connector-id-by-feature` values resolve
as they do in Kibana. A missing or invalid snapshot fails execution explicitly.
