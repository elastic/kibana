# Kibana task manager

The task manager is a generic system for running background tasks. It supports:

- Single-run and recurring tasks
- Scheduling tasks to run after a specified datetime
- Basic retry logic
- Recovery of stalled tasks / timeouts
- Tracking task state across multiple runs
- Configuring the run-parameters for specific tasks
- Basic coordination to prevent the same task instance from running on more than one Kibana system at a time

## Implementation details

At a high-level, the task manager works like this:

- Every `{poll_interval}` milliseconds, check the `{index}` for any tasks that need to be run:
  - `runAt` is past
  - `attempts` is less than the configured threshold
- Attempt to claim the task by using optimistic concurrency to set:
  - status to `running`
  - `startedAt` to now
  - `retryAt` to next time task should retry if it times out and is still in `running` status
- Execute the task, if the previous claim succeeded
- If the task fails, increment the `attempts` count and reschedule it
- If the task succeeds:
  - If it is recurring, store the result of the run, and reschedule
  - If it is not recurring, remove it from the index

## Pooling

Each task manager instance runs tasks in a pool which ensures that at most N tasks are run at a time, where N is configurable. This prevents the system from running too many tasks at once in resource constrained environments. In addition to this, each individual task type definition can have `numWorkers` specified, which tells the system how many workers are consumed by a single running instance of a task. This effectively limits how many tasks of a given type can be run at once.

For example, we may have a system with a `max_workers` of 10, but a super expensive task (such as `reporting`) which specifies a `numWorkers` of 10. In this case, `reporting` tasks will run one at a time.

If a task specifies a higher `numWorkers` than the system supports, the system's `max_workers` setting will be substituted for it.

## Config options

The task_manager can be configured via `taskManager` config options (e.g. `taskManager.maxAttempts`):

- `max_attempts` - The maximum number of times a task will be attempted before being abandoned as failed
- `poll_interval` - How often the background worker should check the task_manager index for more work
- `index` - The name of the index that the task_manager
- `max_workers` - The maximum number of tasks a Kibana will run concurrently (defaults to 10)
- `credentials` - Encrypted user credentials. All tasks will run in the security context of this user. See [this issue](https://github.com/elastic/dev/issues/1045) for a discussion on task scheduler security.
- `override_num_workers`: An object of `taskType: number` that overrides the `num_workers` for tasks
  - For example: `task_manager.override_num_workers.reporting: 2` would override the number of workers occupied by tasks of type `reporting`
  - This allows sysadmins to tweak the operational performance of Kibana, allowing more or fewer tasks of a specific type to run simultaneously

## Task definitions

Plugins define tasks by calling the `registerTaskDefinitions` method on the `server.plugins.task_manager` object.

A sample task can be found in the [x-pack/test/plugin_api_integration/plugins/task_manager](../../test/plugin_api_integration/plugins/task_manager/index.js) folder.

```js
const taskManager = server.plugins.task_manager;
taskManager.registerTaskDefinitions({
  // clusterMonitoring is the task type, and must be unique across the entire system
  clusterMonitoring: {
    // Human friendly name, used to represent this task in logs, UI, etc
    title: 'Human friendly name',

    // Optional, human-friendly, more detailed description
    description: 'Amazing!!',

    // Optional, how long, in minutes or seconds, the system should wait before
    // a running instance of this task is considered to be timed out.
    // This defaults to 5 minutes.
    timeout: '5m',

    // Optional, how many attempts before marking task as failed.
    // This defaults to what is configured at the task manager level.
    maxAttempts: 5,

    // The clusterMonitoring task occupies 2 workers, so if the system has 10 worker slots,
    // 5 clusterMonitoring tasks could run concurrently per Kibana instance. This value is
    // overridden by the `override_num_workers` config value, if specified.
    numWorkers: 2,

    // The createTaskRunner function / method returns an object that is responsible for
    // performing the work of the task. context: { taskInstance }, is documented below.
    createTaskRunner(context) {
      return {
        // Perform the work of the task. The return value should fit the TaskResult interface, documented
        // below. Invalid return values will result in a logged warning.
        async run() {
          // Do some work
          // Conditionally send some alerts
          // Return some result or other...
        },

        // Optional, will be called if a running instance of this task times out, allowing the task
        // to attempt to clean itself up.
        async cancel() {
          // Do whatever is required to cancel this task, such as killing any spawned processes
        },
      };
    },
  },
});
```

When Kibana attempts to claim and run a task instance, it looks its definition up, and executes its createTaskRunner's method, passing it a run context which looks like this:

```js
{
  // The data associated with this instance of the task, with two properties being most notable:
  //
  // params:
  // An object, specific to this task instance, used by the
  // task to determine exactly what work should be performed.
  // e.g. a cluster-monitoring task might have a `clusterName`
  // property in here, but a movie-monitoring task might have
  // a `directorName` property.
  //
  // state:
  // The state returned from the previous run of this task instance.
  // If this task instance has never succesfully run, this will
  // be an empty object: {}
  taskInstance,
}
```

## Task result

The task runner's `run` method is expected to return a promise that resolves to undefined or to an object that looks like the following:
```js
{
  // Optional, if specified, this is used as the tasks' nextRun, overriding
  // the default system scheduler.
  runAt: "2020-07-24T17:34:35.272Z",

  // Optional, an error object, logged out as a warning. The pressence of this
  // property indicates that the task did not succeed.
  error: { message: 'Hrumph!' },

  // Optional, this will be passed into the next run of the task, if
  // this is a recurring task.
  state: {
    anything: 'goes here',
  },
}
```

Other return values will result in a warning, but the system should continue to work.

## Task instances

The task_manager module will store scheduled task instances in an index. This allows for recovery of failed tasks, coordination across Kibana clusters, persistence across Kibana reboots, etc.

The data stored for a task instance looks something like this:

```js
{
  // The type of task that will run this instance.
  taskType: 'clusterMonitoring',

  // The next time this task instance should run. It is not guaranteed
  // to run at this time, but it is guaranteed not to run earlier than
  // this.
  runAt: "2020-07-24T17:34:35.272Z",

  // Indicates that this is a recurring task. We currently only support
  // minute syntax `5m` or second syntax `10s`.
  interval: '5m',

  // How many times this task has been unsuccesfully attempted,
  // this will be reset to 0 if the task ever succesfully completes.
  // This is incremented if a task fails or times out.
  attempts: 0,

  // Currently, this is either idle | claiming | running | failed. It is used to
  // coordinate which Kibana instance owns / is running a specific
  // task instance.
  // idle: Task Instance isn't being worked on
  // claiming: A Kibana instance has claimed ownership but hasn't started running
  //           the Task Instance yet
  // running: A Kibana instance has began working on the Task Instance
  // failed: The last run of the Task Instance failed, waiting to retry
  status: 'idle',

  // The params specific to this task instance, which will be
  // passed to the task when it runs, and will be used by the
  // task to determine exactly what work should be performed.
  // This is a JSON blob, and will be different per task type.
  // e.g. a cluster-monitoring task might have a `clusterName`
  // property in here, but a movie-monitoring task might have
  // a `directorName` property.
  params: '{ "task": "specific stuff here" }',

  // The result of the previous run of this task instance. This
  // will be passed to the next run of the task, along with the
  // params, and could be used by a task to do special logic If
  // the task state changes (e.g. from green to red, or foo to bar)
  // If there was no previous run (e.g. the instance has never succesfully
  // completed, this will be an empty object.). This is a JSON blob,
  // and will be different per task type.
  state: '{ "status": "green" }',

  // An extension point for 3rd parties to build in security features on
  // top of the task manager. For example, this might be the token of the user
  // who scheduled this task.
  userContext: 'the token of the user who scheduled this task',

  // An extension point for 3rd parties to build in security features on
  // top of the task manager, and is expected to be the id of the user, if any,
  // that scheduled this task.
  user: '23lk3l42',

  // An application-specific designation, allowing different Kibana
  // plugins / apps to query for only those tasks they care about.
  scope: ['alerting'],

  // The Kibana UUID of the Kibana instance who last claimed ownership for running this task.
  ownerId: '123e4567-e89b-12d3-a456-426655440000'
}
```

## Programmatic access

The task manager mixin exposes a taskManager object on the Kibana server which plugins can use to manage scheduled tasks. Each method takes an optional `scope` argument and ensures that only tasks with the specified scope(s) will be affected.

### schedule
Using `schedule` you can instruct TaskManger to schedule an instance of a TaskType at some point in the future.

```js
const taskManager = server.plugins.task_manager;
// Schedules a task. All properties are as documented in the previous
// storage section, except that here, params is an object, not a JSON
// string.
const task = await taskManager.schedule({
  taskType,
  runAt,
  interval,
  params,
  scope: ['my-fanci-app'],
});

// Removes the specified task
await manager.remove(task.id);

// Fetches tasks, supports pagination, via the search-after API:
// https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-search-after.html
// If scope is not specified, all tasks are returned, otherwise only tasks
// with the given scope are returned.
const results = await manager.find({ scope: 'my-fanci-app', searchAfter: ['ids'] });

// results look something like this:
{
  searchAfter: ['233322'],
  // Tasks is an array of task instances
  tasks: [{
    id: '3242342',
    taskType: 'reporting',
    // etc
  }]
}
```

### ensureScheduling
When using the `schedule` api to schedule a Task you can provide a hard coded `id` on the Task. This tells TaskManager to use this `id` to identify the Task Instance rather than generate an `id` on its own.
The danger is that in such a situation, a Task with that same `id` might already have been scheduled at some earlier point, and this would result in an error. In some cases, this is the expected behavior, but often you only care about ensuring the task has been _scheduled_ and don't need it to be scheduled a fresh.

To achieve this you should use the `ensureScheduling` api which has the exact same behavior as `schedule`, except it allows the scheduling of a Task with an `id` that's already in assigned to another Task and it will assume that the existing Task is the one you wished to `schedule`, treating this as a successful operation.

### more options

More custom access to the tasks can be done directly via Elasticsearch, though that won't be officially supported, as we can change the document structure at any time.

## Middleware

The task manager exposes a middleware layer that allows modifying tasks before they are scheduled / persisted to the task manager index, and modifying tasks / the run context before a task is run.

For example:

```js
// In your plugin's init
server.plugins.task_manager.addMiddleware({
  async beforeSave({ taskInstance, ...opts }) {
    console.log(`About to save a task of type ${taskInstance.taskType}`);

    return {
      ...opts,
      taskInstance: {
        ...taskInstance,
        params: {
          ...taskInstance.params,
          example: 'Added to params!',
        },
      },
    };
  },

  async beforeRun({ taskInstance, ...opts }) {
    console.log(`About to run ${taskInstance.taskType} ${taskInstance.id}`);
    const { example, ...taskWithoutExampleProp } = taskInstance;

    return {
      ...opts,
      taskInstance: taskWithoutExampleProp,
    };
  },
});
```

## Limitations in v1.0

In v1, the system only understands 1 minute increments (e.g. '1m', '7m'). Tasks which need something more robust will need to specify their own "runAt" in their run method's return value.

There is only a rudimentary mechanism for coordinating tasks and handling expired tasks. Tasks are considered expired if their runAt has arrived, and their status is still 'running'.

There is no task history. Each run overwrites the previous run's state. One-time tasks are removed from the index upon completion regardless of success / failure.

The task manager's public API is create / delete / list. Updates aren't directly supported, and listing should be scoped so that users only see their own tasks.

## Testing

- Unit tests:
   ```
   cd x-pack
   node scripts/jest --testPathPattern=task_manager --watch
   ```
- Integration tests:
   ```
   node scripts/functional_tests_server.js --config x-pack/test/plugin_api_integration/config.js
   node scripts/functional_test_runner --config x-pack/test/plugin_api_integration/config.js
   ```
