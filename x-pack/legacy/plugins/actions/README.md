# Kibana actions

The Kibana actions plugin provides a common place to execute actions. You can:

- Register an action type
- View a list of registered types
- Fire an action either manually or by using an alert
- Perform CRUD on actions with encrypted configurations

## Terminology

**Action Type**: A programatically defined integration with another service, with an expected set of configuration and parameters.

**Action**: A user-defined configuration that satisfies an action type's expected configuration.

## Usage

1. Develop and register an action type (see action types -> example).
2. Create an action by using the RESTful API (see actions -> create action).
3. Use alerts to fire actions or fire manually (see firing actions).

## Action types

### Methods

**server.plugins.actions.registerType(options)**

The following table describes the properties of the `options` object.

|Property|Description|Type|
|---|---|---|
|id|Unique identifier for the action type. For convention, ids starting with `.` are reserved for built in action types. We recommend using a convention like `<plugin_id>.mySpecialAction` for your action types.|string|
|name|A user-friendly name for the action type. These will be displayed in dropdowns when chosing action types.|string|
|unencryptedAttributes|A list of opt-out attributes that don't need to be encrypted. These attributes won't need to be re-entered on import / export when the feature becomes available. These attributes will also be readable / displayed when it comes to a table / edit screen.|array of strings|
|validate.params|When developing an action type, it needs to accept parameters to know what to do with the action. (Example to, from, subject, body of an email). Use joi object validation if you would like `params` to be validated before being passed to the executor.|Joi schema|
|validate.config|Similar to params, a config is required when creating an action (for example host, port, username, and password of an email server). Use the joi object validation if you would like the config to be validated before being passed to the executor.|Joi schema|
|executor|This is where the code of an action type lives. This is a function gets called for executing an action from either alerting or manually by using the exposed function (see firing actions). For full details, see executor section below.|Function|

### Executor

This is the primary function for an action type. Whenever the action needs to execute, this function will perform the action. It receives a variety of parameters.  The following table describes the properties that the executor receives.

**executor(options)**

|Property|Description|
|---|---|
|config|The decrypted configuration given to an action. This comes from the action saved object that is partially or fully encrypted within the data store. If you would like to validate the config before being passed to the executor, define `validate.config` within the action type.|
|params|Parameters for the execution. These will be given at fire time by either an alert or manually provided when calling the plugin provided fire function.|
|services.callCluster(path, opts)|Use this to do Elasticsearch queries on the cluster Kibana connects to. This function is the same as any other `callCluster` in Kibana.<br><br>**NOTE**: This currently authenticates as the Kibana internal user, but will change in a future PR.|
|services.savedObjectsClient|This is an instance of the saved objects client. This provides the ability to do CRUD on any saved objects within the same space the alert lives in.<br><br>**NOTE**: This currently only works when security is disabled. A future PR will add support for enabling security using Elasticsearch API tokens.|
|services.log(tags, [data], [timestamp])|Use this to create server logs. (This is the same function as server.log)|

### Example

Below is an example email action type. The attributes `host` and `port` are configured to be unencrypted by using the `unencryptedAttributes` attribute.

```
server.plugins.actions.registerType({
  id: 'smtp',
  name: 'Email',
  unencryptedAttributes: ['host', 'port'],
  validate: {
    params: Joi.object()
      .keys({
        to: Joi.array().items(Joi.string()).required(),
        from: Joi.string().required(),
        subject: Joi.string().required(),
        body: Joi.string().required(),
      })
      .required(),
    config: Joi.object()
      .keys({
        host: Joi.string().required(),
        port: Joi.number().default(465),
        username: Joi.string().required(),
        password: Joi.string().required(),
      })
      .required(),
  },
  async executor({ config, params, services }) {
    const transporter = nodemailer. createTransport(config);
    await transporter.sendMail(params);
  },
});
```

## RESTful API

Using an action type requires an action to be created that will contain and encrypt configuration for a given action type. See below for CRUD operations using the API.

#### `POST /api/action`: Create action

Payload:

|Property|Description|Type|
|---|---|---|
|attributes.description|A description to reference and search in the future. This value will be used to populate dropdowns.|string|
|attributes.actionTypeId|The id value of the action type you want to call when the action executes.|string|
|attributes.actionTypeConfig|The configuration the action type expects. See related action type to see what attributes is expected. This will also validate against the action type if config validation is defined.|object|
|references|An array of `name`, `type` and `id`. This is the same as `references` in the saved objects API. See the saved objects API documentation.<br><br>In most cases, you can leave this empty.|Array|
|migrationVersion|The version of the most recent migrations. This is the same as `migrationVersion` in the saved objects API. See the saved objects API documentation.<br><br>In most cases, you can leave this empty.|object|

#### `DELETE /api/action/{id}`: Delete action

Params:

|Property|Description|Type|
|---|---|---|
|id|The id of the action you're trying to delete.|string|

#### `GET /api/action/_find`: Find actions

Params:

See the saved objects API documentation for find. All the properties are the same except that you cannot pass in `type`.

#### `GET /api/action/{id}`: Get action

Params:

|Property|Description|Type|
|---|---|---|
|id|The id of the action you're trying to get.|string|

#### `GET /api/action/types`: List action types

No parameters.

#### `PUT /api/action/{id}`: Update action

Params:

|Property|Description|Type|
|---|---|---|
|id|The id of the action you're trying to update.|string|

Payload:

|Property|Description|Type|
|---|---|---|
|attributes.description|A description to reference and search in the future. This value will be used to populate dropdowns.|string|
|attributes.actionTypeConfig|The configuration the action type expects. See related action type to see what attributes is expected. This will also validate against the action type if config validation is defined.|object|
|references|An array of `name`, `type` and `id`. This is the same as `references` in the saved objects API. See the saved objects API documentation.<br><br>In most cases, you can leave this empty.|Array|
|version|The document version when read|string|

#### `POST /api/action/{id}/_fire`: Fire action

Params:

|Property|Description|Type|
|---|---|---|
|id|The id of the action you're trying to fire.|string|

Payload:

|Property|Description|Type|
|---|---|---|
|params|The parameters the action type requires for the execution.|object|

## Firing actions

The plugin exposes a fire function that you can use to fire actions.

**server.plugins.actions.fire(options)**

The following table describes the properties of the `options` object.

|Property|Description|Type|
|---|---|---|
|id|The id of the action you want to fire.|string|
|params|The `params` value to give the action type executor.|object|
|namespace|The saved object namespace the action exists within.|string|
|basePath|This is a temporary parameter, but we need to capture and track the value of `request.getBasePath()` until future changes are made.<br><br>In most cases this can be `undefined` unless you need cross spaces support.|string|

### Example

This example makes action `3c5b2bd4-5424-4e4b-8cf5-c0a58c762cc5` fire an email. The action plugin will load the saved object and find what action type to call with `params`.

```
server.plugins.actions.fire({
  id: '3c5b2bd4-5424-4e4b-8cf5-c0a58c762cc5',
  params: {
    from: 'example@elastic.co',
    to: ['destination@elastic.co'],
    subject: 'My email subject',
    body: 'My email body',
  },
  namespace: undefined, // The namespace the action exists within
  basePath: undefined, // Usually `request.getBasePath();` or `undefined`
});
```
