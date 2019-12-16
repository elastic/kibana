# Kibana actions

The Kibana actions plugin provides a framework to create executable actions. You can:

- Register an action type and associate a JavaScript function to run when actions
  are executed.
- Get a list of registered action types
- Create an action from an action type and encrypted configuration object.
- Get a list of actions that have been created.
- Execute an action, passing it a parameter object.
- Perform CRUD operations on actions.

## Terminology

**Action Type**: A programatically defined integration with another service, with an expected set of configuration and parameters properties, typically defined with a schema.  Plugins can add new
action types.

**Action**: A configuration object associated with an action type, that is ready to be executed.  The configuration is persisted via Saved Objects, and some/none/all of the configuration properties can be stored encrypted.

## Usage

1. Develop and register an action type (see action types -> example).
2. Create an action by using the RESTful API (see actions -> create action).
3. Use alerts to execute actions or execute manually (see firing actions).

## Kibana Actions Configuration
Implemented under the [Actions Config](./server/actions_config.ts).

### Configuration Options

Built-In-Actions are configured using the _xpack.actions_ namespoace under _kibana.yml_, and have the following configuration options:

| Namespaced Key                       | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Type                  |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| _xpack.actions._**enabled**          | Feature toggle which enabled Actions in Kibana.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | boolean               |
| _xpack.actions._**WhitelistedHosts** | Which _hostnames_ are whitelisted for the Built-In-Action? This list should contain hostnames of every external service you wish to interact with using Webhooks, Email or any other built in Action. Note that you may use the string "\*" in place of a specific hostname to enable Kibana to target any URL, but keep in mind the potential use of such a feature to execute [SSRF](https://www.owasp.org/index.php/Server_Side_Request_Forgery) attacks from your server. | Array<String> |

### Configuration Utilities

This module provides a Utilities for interacting with the configuration.

| Method                | Arguments                                          | Description                                                                                                                                                                                                                                                            | Return Type                                                                                                                                                                                                                   |
| --------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| isWhitelistedUri | _uri_: The URI you wish to validate is whitelisted | Validates whether the URI is whitelisted. This checks the configuration and validates that the hostname of the URI is in the list of whitelisted Hosts and returns `true` if it is whitelisted. If the configuration says that all URI's are whitelisted (using an "\*") then it will always return `true`. | Boolean |
| isWhitelistedHostname | _hostname_: The Hostname you wish to validate is whitelisted | Validates whether the Hostname is whitelisted. This checks the configuration and validates that the hostname is in the list of whitelisted Hosts and returns `true` if it is whitelisted. If the configuration says that all Hostnames are whitelisted (using an "\*") then it will always return `true`. | Boolean |
| ensureWhitelistedUri | _uri_: The URI you wish to validate is whitelisted | Validates whether the URI is whitelisted. This checks the configuration and validates that the hostname of the URI is in the list of whitelisted Hosts and throws an error if it is not whitelisted. If the configuration says that all URI's are whitelisted (using an "\*") then it will never throw. | No return value, throws if URI isn't whitelisted |
| ensureWhitelistedHostname | _hostname_: The Hostname you wish to validate is whitelisted | Validates whether the Hostname is whitelisted. This checks the configuration and validates that the hostname is in the list of whitelisted Hosts and throws an error if it is not whitelisted. If the configuration says that all Hostnames are whitelisted (using an "\*") then it will never throw | No return value, throws if Hostname isn't whitelisted |

## Action types

### Methods

**server.plugins.actions.setup.registerType(options)**

The following table describes the properties of the `options` object.

|Property|Description|Type|
|---|---|---|
|id|Unique identifier for the action type. For convention, ids starting with `.` are reserved for built in action types. We recommend using a convention like `<plugin_id>.mySpecialAction` for your action types.|string|
|name|A user-friendly name for the action type. These will be displayed in dropdowns when chosing action types.|string|
|unencryptedAttributes|A list of opt-out attributes that don't need to be encrypted. These attributes won't need to be re-entered on import / export when the feature becomes available. These attributes will also be readable / displayed when it comes to a table / edit screen.|array of strings|
|validate.params|When developing an action type, it needs to accept parameters to know what to do with the action. (Example to, from, subject, body of an email). See the current built-in email action type for an example of the state-of-the-art validation. <p>Technically, the value of this property should have a property named `validate()` which is a function that takes a params object to validate and returns a sanitized version of that object to pass to the execution function.  Validation errors should be thrown from the `validate()` function and will be available as an error message|schema / validation function|
|validate.config|Similar to params, a config is required when creating an action (for example host, port, username, and password of an email server). |schema / validation function|
|executor|This is where the code of an action type lives. This is a function gets called for executing an action from either alerting or manually by using the exposed function (see firing actions). For full details, see executor section below.|Function|

**Important**  - The config object is persisted in ElasticSearch and updated via the ElasticSearch update document API.  This API allows "partial updates" - and this can cause issues with the encryption used on specified properties.  So, a `validate()` function should return values for all configuration properties, so that partial updates do not occur.  Setting property values to `null` rather than `undefined`, or not including a property in the config object, is all you need to do to ensure partial updates won't occur.

### Executor

This is the primary function for an action type. Whenever the action needs to execute, this function will perform the action. It receives a variety of parameters.  The following table describes the properties that the executor receives.

**executor(options)**

|Property|Description|
|---|---|
|actionId|The action saved object id that the action type is executing for.|
|config|The decrypted configuration given to an action. This comes from the action saved object that is partially or fully encrypted within the data store. If you would like to validate the config before being passed to the executor, define `validate.config` within the action type.|
|params|Parameters for the execution. These will be given at execution time by either an alert or manually provided when calling the plugin provided execute function.|
|services.callCluster(path, opts)|Use this to do Elasticsearch queries on the cluster Kibana connects to. This function is the same as any other `callCluster` in Kibana.<br><br>**NOTE**: This currently authenticates as the Kibana internal user, but will change in a future PR.|
|services.savedObjectsClient|This is an instance of the saved objects client. This provides the ability to do CRUD on any saved objects within the same space the alert lives in.<br><br>The scope of the saved objects client is tied to the user in context calling the execute API or the API key provided to the execute plugin function (only when security isenabled).|
|services.log(tags, [data], [timestamp])|Use this to create server logs. (This is the same function as server.log)|

### Example

The built-in email action type provides a good example of creating an action type with non-trivial configuration and params: 
[x-pack/legacy/plugins/actions/server/builtin_action_types/email.ts](server/builtin_action_types/email.ts)


## RESTful API

Using an action type requires an action to be created that will contain and encrypt configuration for a given action type. See below for CRUD operations using the API.

#### `POST /api/action`: Create action

Payload:

|Property|Description|Type|
|---|---|---|
|name|A name to reference and search in the future. This value will be used to populate dropdowns.|string|
|actionTypeId|The id value of the action type you want to call when the action executes.|string|
|config|The configuration the action type expects. See related action type to see what attributes are expected. This will also validate against the action type if config validation is defined.|object|
|secrets|The secrets the action type expects. See related action type to see what attributes are expected. This will also validate against the action type if secrets validation is defined.|object|

#### `DELETE /api/action/{id}`: Delete action

Params:

|Property|Description|Type|
|---|---|---|
|id|The id of the action you're trying to delete.|string|

#### `GET /api/action/_find`: Find actions

Params:

See the [saved objects API documentation for find](https://www.elastic.co/guide/en/kibana/master/saved-objects-api-find.html). All the properties are the same except that you cannot pass in `type`.

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
|name|A name to reference and search in the future. This value will be used to populate dropdowns.|string|
|config|The configuration the action type expects. See related action type to see what attributes are expected. This will also validate against the action type if config validation is defined.|object|
|secrets|The secrets the action type expects. See related action type to see what attributes are expected. This will also validate against the action type if secrets validation is defined.|object|

#### `POST /api/action/{id}/_execute`: Execute action

Params:

|Property|Description|Type|
|---|---|---|
|id|The id of the action you're trying to execute.|string|

Payload:

|Property|Description|Type|
|---|---|---|
|params|The parameters the action type requires for the execution.|object|

## Firing actions

The plugin exposes an execute function that you can use to run actions.

**server.plugins.actions.execute(options)**

The following table describes the properties of the `options` object.

|Property|Description|Type|
|---|---|---|
|id|The id of the action you want to execute.|string|
|params|The `params` value to give the action type executor.|object|
|spaceId|The space id the action is within.|string|
|apiKey|The Elasticsearch API key to use for context. (Note: only required and used when security is enabled).|string|

### Example

This example makes action `3c5b2bd4-5424-4e4b-8cf5-c0a58c762cc5` send an email. The action plugin will load the saved object and find what action type to call with `params`.

```
server.plugins.actions.execute({
  id: '3c5b2bd4-5424-4e4b-8cf5-c0a58c762cc5',
  spaceId: 'default', // The spaceId of the action
  params: {
    from: 'example@elastic.co',
    to: ['destination@elastic.co'],
    subject: 'My email subject',
    body: 'My email body',
  },
});
```

# Built-in Action Types

Kibana ships with a set of built-in action types:

- server log: logs messages to the Kibana log using `server.log()`
- email: send an email
- slack: post a message to a slack channel
- index: index document(s) into elasticsearch

## server log, action id: `.log`

The params properties are modelled after the arguments to the [Hapi.server.log()](https://hapijs.com/api#-serverlogtags-data-timestamp) function.

#### config properties

|Property|Description|Type|
|---|---|---|
|-|This action has no config properties.|-|

#### params properties

|Property|Description|Type|
|---|---|---|
|message|The message to log.|string|
|tags|Tags associated with the message to log.|string[] _(optional)_|

## email, action id: `.email`

This action type uses [nodemailer](https://nodemailer.com/about/) to send emails.

#### config properties

Either the property `service` must be provided, or the `host` and `port` properties must be provided.  If `service` is provided, `host`, `port` and `secure` are ignored.  For more information on the `gmail` service value specifically, see the [nodemailer gmail documentation](https://nodemailer.com/usage/using-gmail/).

The `secure` property defaults to `false`.  See the [nodemailer TLS documentation](https://nodemailer.com/smtp/#tls-options) for more information.

The `from` field can be specified as in typical `"user@host-name"` format, or as `"human name <user@host-name>"` format.  See the [nodemailer address documentation](https://nodemailer.com/message/addresses/) for more information.

|Property|Description|Type|
|---|---|---|
|service|the name of a [well-known email service provider](https://nodemailer.com/smtp/well-known/)|string _(optional)_|
|host|host name of the service provider|string _(optional)_|
|port|port number of the service provider|number _(optional)_|
|secure|whether to use TLS with the service provider|boolean _(optional)_|
|user|userid to use with the service provider|string|
|password|password to use with the service provider|string|
|from|the from address for all emails sent with this action type|string|

#### params properties

There must be at least one entry in the `to`, `cc` and `bcc` arrays.

The message text will be sent as both plain text and html text.  Additional function may be provided later.

The `to`, `cc`, and `bcc` array entries can be in the same format as the `from` property described in the config object above.

|Property|Description|Type|
|---|---|---|
|to|list of to addressees|string[] _(optional)_|
|cc|list of cc addressees|string[] _(optional)_|
|bcc|list of bcc addressees|string[] _(optional)_|
|subject|the subject line of the email|string|
|message|the message text|string|

## slack, action id: `.slack`

This action type interfaces with the [Slack Incoming Webhooks feature](https://api.slack.com/incoming-webhooks).  Currently the params property `message` will be used as the `text` property of the Slack incoming message.  Additional function may be provided later.

#### config properties

|Property|Description|Type|
|---|---|---|
|webhookUrl|the url of the Slack incoming webhook|string|

#### params properties

|Property|Description|Type|
|---|---|---|
|message|the message text|string|


## index, action id: `.index`

The config and params properties are modelled after the [Watcher Index Action](https://www.elastic.co/guide/en/elastic-stack-overview/master/actions-index.html).  The index can be set in the config or params, and if set in config, then the index set in the params will be ignored.

#### config properties

|Property|Description|Type|
|---|---|---|
|index|The Elasticsearch index to index into.|string _(optional)_|

#### params properties

|Property|Description|Type|
|---|---|---|
|index|The Elasticsearch index to index into.|string _(optional)_|
|doc_id|The optional _id of the document.|string _(optional)_|
|execution_time_field|The field that will store/index the action execution time.|string _(optional)_|
|refresh|Setting of the refresh policy for the write request|boolean _(optional)_|
|body|The documument body/bodies to index.|object or object[]|

# Command Line Utility

The [`kbn-action`](https://github.com/pmuellr/kbn-action) tool can be used to send HTTP requests to the Actions plugin.  For instance, to create a Slack action from the `.slack` Action Type, use the following command:

```console
$ kbn-action create .slack "post to slack" '{"webhookUrl": "https://hooks.slack.com/services/T0000/B0000/XXXX"}'
{
    "type": "action",
    "id": "d6f1e228-1806-4a72-83ac-e06f3d5c2fbe",
    "attributes": {
        "actionTypeId": ".slack",
        "name": "post to slack",
        "config": {}
    },
    "references": [],
    "updated_at": "2019-06-26T17:55:42.728Z",
    "version": "WzMsMV0="
}
```