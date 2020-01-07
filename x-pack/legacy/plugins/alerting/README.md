# Kibana alerting

The Kibana alerting plugin provides a common place to set up alerts. You can:

- Register types of alerts
- List the types of registered alerts
- Perform CRUD actions on alerts

## Terminology

**Alert Type**: A function that takes parameters and executes actions to alert instances.

**Alert**: A configuration that defines a schedule, an alert type w/ parameters, state information and actions.

**Alert Instance**: The instance(s) created from an alert type execution.

A Kibana alert detects a condition and executes one or more actions when that condition occurs.  Alerts work by going through the followings steps:

1. Run a periodic check to detect a condition (the check is provided by an Alert Type) 
2. Convert that condition into one or more stateful Alert Instances
3. Map Alert Instances to pre-defined Actions, using templating
4. Execute the Actions

## Usage

1. Develop and register an alert type (see alert types -> example).
2. Create an alert using the RESTful API (see alerts -> create).

## Limitations

When security is enabled, an SSL connection to Elasticsearch is required in order to use alerting.

When security is enabled, users who create alerts will need the `manage_api_key` cluster privilege. There is currently work in progress to remove this requirement.

## Alert types

### Methods

**server.plugins.alerting.setup.registerType(options)**

The following table describes the properties of the `options` object.

|Property|Description|Type|
|---|---|---|
|id|Unique identifier for the alert type. For convention purposes, ids starting with `.` are reserved for built in alert types. We recommend using a convention like `<plugin_id>.mySpecialAlert` for your alert types to avoid conflicting with another plugin.|string|
|name|A user-friendly name for the alert type. These will be displayed in dropdowns when choosing alert types.|string|
|actionGroups|An explicit list of groups the alert type may schedule actions for. Alert `actions` validation will use this array to ensure groups are valid.|string[]|
|validate.params|When developing an alert type, you can choose to accept a series of parameters. You may also have the parameters validated before they are passed to the `executor` function or created as an alert saved object. In order to do this, provide a `@kbn/config-schema` schema that we will use to validate the `params` attribute.|@kbn/config-schema|
|executor|This is where the code of the alert type lives. This is a function to be called when executing an alert on an interval basis. For full details, see executor section below.|Function|

### Executor

This is the primary function for an alert type. Whenever the alert needs to execute, this function will perform the execution. It receives a variety of parameters. The following table describes the properties the executor receives.

**executor(options)**

|Property|Description|
|---|---|
|services.callCluster(path, opts)|Use this to do Elasticsearch queries on the cluster Kibana connects to. This function is the same as any other `callCluster` in Kibana but in the context of the user who created the alert when security is enabled.|
|services.savedObjectsClient|This is an instance of the saved objects client. This provides the ability to do CRUD on any saved objects within the same space the alert lives in.<br><br>The scope of the saved objects client is tied to the user who created the alert (only when security isenabled).|
|services.log(tags, [data], [timestamp])|Use this to create server logs. (This is the same function as server.log)|
|startedAt|The date and time the alert type started execution.|
|previousStartedAt|The previous date and time the alert type started a successful execution.|
|params|Parameters for the execution. This is where the parameters you require will be passed in. (example threshold). Use alert type validation to ensure values are set before execution.|
|state|State returned from previous execution. This is the alert level state. What the executor returns will be serialized and provided here at the next execution.|
|alertId|The id of this alert.|
|spaceId|The id of the space of this alert.|
|namespace|The namespace of the space of this alert; same as spaceId, unless spaceId === 'default', then namespace = undefined.|
|name|The name of this alert.|
|tags|The tags associated with this alert.|
|createdBy|The userid that created this alert.|
|updatedBy|The userid that last updated this alert.|

### Example

This example receives server and threshold as parameters. It will read the CPU usage of the server and schedule actions to be executed (asynchronously by the task manager) if the reading is greater than the threshold.

```
import { schema } from '@kbn/config-schema';
...
server.plugins.alerting.setup.registerType({
	id: 'my-alert-type',
	name: 'My alert type',
	validate: {
		params: schema.object({
			server: schema.string(),
			threshold: schema.number({ min: 0, max: 1 }),
		}),
	},
	async executor({
    alertId,
		startedAt,
		previousStartedAt,
		services,
		params,
		state,
	}: AlertExecutorOptions) {
		const { server, threshold } = params; // Let's assume params is { server: 'server_1', threshold: 0.8 }

		// Call a function to get the server's current CPU usage
		const currentCpuUsage = await getCpuUsage(server);

		// Only execute if CPU usage is greater than threshold
		if (currentCpuUsage > threshold) {
			// The first argument is a unique identifier the alert instance is about. In this scenario
			// the provided server will be used. Also, this id will be used to make `getState()` return
			// previous state, if any, on matching identifiers.
			const alertInstance = services.alertInstanceFactory(server);

			// State from last execution. This will exist if an alert instance was created and executed
			// in the previous execution
			const { cpuUsage: previousCpuUsage } = alertInstance.getState();

			// Replace state entirely with new values
			alertInstance.replaceState({
				cpuUsage: currentCpuUsage,
			});

			// 'default' refers to a group of actions to be scheduled for execution, see 'actions' in create alert section
			alertInstance.scheduleActions('default', {
				server,
				hasCpuUsageIncreased: currentCpuUsage > previousCpuUsage,
			});
		}

		// Returning updated alert type level state, this will become available
		// within the `state` function parameter at the next execution
		return {
			// This is an example attribute you could set, it makes more sense to use this state when
			// the alert type executes multiple instances but wants a single place to track certain values.
			lastChecked: new Date(),
		};
	},
});
```

This example only receives threshold as a parameter. It will read the CPU usage of all the servers and schedule individual actions if the reading for a server is greater than the threshold. This is a better implementation than above as only one query is performed for all the servers instead of one query per server.

```
server.plugins.alerting.setup.registerType({
	id: 'my-alert-type',
	name: 'My alert type',
	validate: {
		params: schema.object({
			threshold: schema.number({ min: 0, max: 1 }),
		}),
	},
	async executor({
    alertId,
		startedAt,
		previousStartedAt,
		services,
		params,
		state,
	}: AlertExecutorOptions) {
		const { threshold } = params; // Let's assume params is { threshold: 0.8 }

		// Call a function to get the CPU readings on all the servers. The result will be
		// an array of { server, cpuUsage }.
		const cpuUsageByServer = await getCpuUsageByServer();

		for (const { server, cpuUsage: currentCpuUsage } of cpuUsageByServer) {
			// Only execute if CPU usage is greater than threshold
			if (currentCpuUsage > threshold) {
				// The first argument is a unique identifier the alert instance is about. In this scenario
				// the provided server will be used. Also, this id will be used to make `getState()` return
				// previous state, if any, on matching identifiers.
				const alertInstance = services.alertInstanceFactory(server);

				// State from last execution. This will exist if an alert instance was created and executed
				// in the previous execution
				const { cpuUsage: previousCpuUsage } = alertInstance.getState();

				// Replace state entirely with new values
				alertInstance.replaceState({
					cpuUsage: currentCpuUsage,
				});

				// 'default' refers to a group of actions to be scheduled for execution, see 'actions' in create alert section
				alertInstance.scheduleActions('default', {
					server,
					hasCpuUsageIncreased: currentCpuUsage > previousCpuUsage,
				});
			}
		}

		// Single object containing state that isn't specific to a server, this will become available
		// within the `state` function parameter at the next execution
		return {
			lastChecked: new Date(),
		};
	},
});
```

## RESTful API

Using an alert type requires you to create an alert that will contain parameters and actions for a given alert type. See below for CRUD operations using the API.

#### `POST /api/alert`: Create alert

Payload:

|Property|Description|Type|
|---|---|---|
|enabled|Indicate if you want the alert to start executing on an interval basis after it has been created.|boolean| 
|name|A name to reference and search in the future.|string|
|tags|A list of keywords to reference and search in the future.|string[]|
|alertTypeId|The id value of the alert type you want to call when the alert is scheduled to execute.|string|
|schedule|The schedule specifying when this alert should be run, using one of the available schedule formats specified under _Schedule Formats_ below|object|
|params|The parameters to pass in to the alert type executor `params` value. This will also validate against the alert type params validator if defined.|object|
|actions|Array of the following:<br> - `group` (string): We support grouping actions in the scenario of escalations or different types of alert instances. If you don't need this, feel free to use `default` as a value.<br>- `id` (string): The id of the action saved object to execute.<br>- `params` (object): The map to the `params` the action type will receive. In order to help apply context to strings, we handle them as mustache templates and pass in a default set of context. (see templating actions).|array|

#### `DELETE /api/alert/{id}`: Delete alert

Params:

|Property|Description|Type|
|---|---|---|
|id|The id of the alert you're trying to delete.|string|

#### `GET /api/alert/_find`: Find alerts

Params:

See the saved objects API documentation for find. All the properties are the same except you cannot pass in `type`.

#### `GET /api/alert/{id}`: Get alert

Params:

|Property|Description|Type|
|---|---|---|
|id|The id of the alert you're trying to get.|string|

#### `GET /api/alert/types`: List alert types

No parameters.

#### `PUT /api/alert/{id}`: Update alert

Params:

|Property|Description|Type|
|---|---|---|
|id|The id of the alert you're trying to update.|string|

Payload:

|Property|Description|Type|
|---|---|---|
|schedule|The schedule specifying when this alert should be run, using one of the available schedule formats specified under _Schedule Formats_ below|object|
|name|A name to reference and search in the future.|string|
|tags|A list of keywords to reference and search in the future.|string[]|
|params|The parameters to pass in to the alert type executor `params` value. This will also validate against the alert type params validator if defined.|object|
|actions|Array of the following:<br> - `group` (string): We support grouping actions in the scenario of escalations or different types of alert instances. If you don't need this, feel free to use `default` as a value.<br>- `id` (string): The id of the action saved object to execute.<br>- `params` (object): There map to the `params` the action type will receive. In order to help apply context to strings, we handle them as mustache templates and pass in a default set of context. (see templating actions).|array|

#### `POST /api/alert/{id}/_enable`: Enable an alert

Params:

|Property|Description|Type|
|---|---|---|
|id|The id of the alert you're trying to enable.|string|

#### `POST /api/alert/{id}/_disable`: Disable an alert

Params:

|Property|Description|Type|
|---|---|---|
|id|The id of the alert you're trying to disable.|string|

#### `POST /api/alert/{id}/_mute_all`: Mute all alert instances

Params:

|Property|Description|Type|
|---|---|---|
|id|The id of the alert you're trying to mute all alert instances for.|string|

#### `POST /api/alert/{alertId}/alert_instance/{alertInstanceId}/_mute`: Mute alert instance

Params:

|Property|Description|Type|
|---|---|---|
|alertId|The id of the alert you're trying to mute an instance for.|string|
|alertInstanceId|The instance id of the alert instance you're trying to mute.|string|

#### `POST /api/alert/{id}/_unmute_all`: Unmute all alert instances

Params:

|Property|Description|Type|
|---|---|---|
|id|The id of the alert you're trying to unmute all alert instances for.|string|

#### `POST /api/alert/{alertId}/alert_instance/{alertInstanceId}/_unmute`: Unmute an alert instance

Params:

|Property|Description|Type|
|---|---|---|
|alertId|The id of the alert you're trying to unmute an instance for.|string|
|alertInstanceId|The instance id of the alert instance you're trying to unmute.|string|

#### `POST /api/alert/{id}/_update_api_key`: Update alert API key

|Property|Description|Type|
|---|---|---|
|id|The id of the alert you're trying to update the API key for. System will use user in request context to generate an API key for.|string|

##### Schedule Formats
A schedule is structured such that the key specifies the format you wish to use and its value specifies the schedule.

We currently support the _Interval format_ which specifies the interval in seconds, minutes, hours or days at which the alert should execute.
Example: `{ interval: "10s" }`, `{ interval: "5m" }`, `{ interval: "1h" }`, `{ interval: "1d" }`.

There are plans to support multiple other schedule formats in the near fuiture.

## Alert instance factory

**alertInstanceFactory(id)**

One service passed in to alert types is an alert instance factory. This factory creates instances of alerts and must be used in order to execute actions. The id you give to the alert instance factory is a unique identifier to the alert instance (ex: server identifier if the instance is about the server). The instance factory will use this identifier to retrieve the state of previous instances with the same id. These instances support state persisting between alert type execution, but will clear out once the alert instance stops executing.

This factory returns an instance of `AlertInstance`. The alert instance class has the following methods, note that we have removed the methods that you shouldn't touch.

|Method|Description|
|---|---|
|getState()|Get the current state of the alert instance.|
|scheduleActions(actionGroup, context)|Called to schedule the execution of actions. The actionGroup relates to the group of alert `actions` to execute and the context will be used for templating purposes. This should only be called once per alert instance.|
|replaceState(state)|Used to replace the current state of the alert instance. This doesn't work like react, the entire state must be provided. Use this feature as you see fit. The state that is set will persist between alert type executions whenever you re-create an alert instance with the same id. The instance state will be erased when `scheduleActions` isn't called during an execution.|

## Templating actions

There needs to be a way to map alert context into action parameters. For this, we started off by adding template support. Any string within the `params` of an alert saved object's `actions` will be processed as a template and can inject context or state values. 

When an alert instance executes, the first argument is the `group` of actions to execute and the second is the context the alert exposes to templates. We iterate through each action params attributes recursively and render templates if they are a string. Templates have access to the `context` (provided by second argument of `.scheduleActions(...)` on an alert instance) and the alert instance's `state` (provided by the most recent `replaceState` call on an alert instance) as well as `alertId` and `alertInstanceId`.

### Examples

The following code would be within an alert type. As you can see `cpuUsage ` will replace the state of the alert instance and `server` is the context for the alert instance to execute. The difference between the two is `cpuUsage ` will be accessible at the next execution.

```
alertInstanceFactory('server_1')
  .replaceState({
    cpuUsage: 80,
  })
  .scheduleActions('default', {
    server: 'server_1',
  });
```

Below is an example of an alert that takes advantage of templating:

```
{
  ...
  id: "123",
  actions: [
    {
      "group": "default",
      "id": "3c5b2bd4-5424-4e4b-8cf5-c0a58c762cc5",
      "params": {
        "from": "example@elastic.co",
        "to": ["destination@elastic.co"],
        "subject": "A notification about {{context.server}}"
        "body": "The server {{context.server}} has a CPU usage of {{state.cpuUsage}}%. This message for {{alertInstanceId}} was created by the alert {{alertId}}."
      }
    }
  ]
}
```

The templating system will take the alert and alert type as described above and convert the action parameters to the following:

```
{
  "from": "example@elastic.co",
  "to": ["destination@elastic.co"],
  "subject": "A notification about server_1"
  "body": "The server server_1 has a CPU usage of 80%. This message for server_1 was created by the alert 123"
}
```

There are limitations that we are aware of using only templates, and we are gathering feedback and use cases for these. (for example passing an array of strings to an action).
