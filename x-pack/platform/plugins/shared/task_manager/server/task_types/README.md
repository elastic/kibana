# Task type modules

A task type module is one file that holds a Task Manager task type: its definition and its runner.
Kibana registers it as it does any task type. The same file can also be bundled and run in a
process of its own, with Kibana still claiming, validating, timing out and rescheduling the task.

```ts
// <plugin>/server/task_types/my_task.task.ts
import { defineTaskType } from '@kbn/task-manager-plugin/server';

export const taskType = defineTaskType({
  type: 'myPlugin:my_task',
  title: 'My task',                       // everything `registerTaskDefinitions` takes, but the runner
  timeout: '1m',
  savedObjectTypes: [myType],             // only if the runner uses saved objects
  createTaskRunner: (context, { logger, elasticsearch, savedObjects }) => ({
    run: async () => ({ state: {} }),
    cancel: async () => {},
  }),
});
```

The second argument is the **host**: what the runner may use. In Kibana it is Core; in a process it
is built from Core's logging system, Elasticsearch client and saved objects repository. The module
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
  mode: in_process      # default: in Kibana's process
```

**`child_process`.** Each run forks the task type's bundle, sends it Kibana's own Elasticsearch
connection over the fork channel, runs the task in it and stops it when the run ends. If the process
cannot be started, that run goes to Kibana.

```yaml
xpack.task_manager.task_execution:
  mode: child_process
  bundle_dir: target/task_bundles   # optional; the distributable uses its own task_bundles
```

Build the bundles with `node scripts/task_bundle` (the distributable builds them for you).

**`remote`.** Runs go to a task process you start yourself from the same bundle, so it can live on
another host. It serves the one task type of its bundle and answers 404 for any other, which then
runs in Kibana.

```yaml
xpack.task_manager.task_execution:
  mode: remote
  remote:
    url: http://localhost:4100
    token: secret                   # the process's TASK_PROCESS_TOKEN, if it has one
```

```
ES_URL=http://localhost:9200 ES_USERNAME=kibana_system ES_PASSWORD=secret PORT=4100 TASK_PROCESS_TOKEN=secret \
  node target/task_bundles/taskManager__delete_inactive_nodes.js
```

A remote process does not receive Kibana's settings, so it takes `ES_URL`, `ES_API_KEY` or both of
`ES_USERNAME` and `ES_PASSWORD` (there is no default user), `PORT` and `TASK_PROCESS_TOKEN` from its
environment. A run for a process that is down is retried shortly. A process built for another Kibana
version refuses runs.

## What a process has, and does not

Has: a logger, Core's Elasticsearch client (also scoped to the task's API key), and, for a module
that declares `savedObjectTypes`, Core's internal saved objects repository.

Does not have yet: user-profile enrichment of the fake request, scoped saved objects clients,
encrypted saved objects, the event log, spaces, plugin config, and anything that is Kibana itself (HTTP routes, other plugins' contracts). A task
type that needs them stays in Kibana until the host offers them. Tasks scheduled to `runAs` a
service account always run in Kibana.

The distributable builds the bundles into `task_bundles/`.
