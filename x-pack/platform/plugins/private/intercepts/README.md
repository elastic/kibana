## Intercept plugin

Contains business logic and orchestration for displaying the intercept dialog suited to the needs of Kibana, and is made available so that other solution teams might leverage this to register and schedule an intercept of their choosing

Exposes the following public api;

All exposed APIs existing solely on the start contract;

On the server;

- `registerTriggerDefinition`: This method registers a new trigger, and accepts an id for said trigger, alongside a callback that should return a duration interval. The callback provides values that can be used to conditionally return said interval depending on the use case. When a falsy value is returned no action is taken, if the the id provide already exists and a different trigger interval is provided we update said trigger's interval in place, if the same interval is turned no action is taken. One might define a new trigger like so;

```ts
const TRIGGER_ID = 'some_trigger';

const isServerless = (function evaluateIfIsServerless() {/* ... */})()

registerTriggerDefinition(TRIGGER_ID, ({ }) => {

 return isServerless ? '30d' : '180d';

});

```


On the client; 

- `registerIntercept`: The method provides a mechanism to configure the intercept that would get displayed to the user, along sides some hooks to act on the feedback provided as the user journeys through the configured steps; 

when calling this method, the value of id should match the ID that was registered on the server

```ts

registerIntercept({
    id: TRIGGER_DEF_ID,
    steps: [],
    onProgress({ stepId, stepResponse, runId }) {
        // step response received on the last completed step
        // allows the developer to act on the data immediately if
        // they so wish especially that users might close the
        // intercept at any point
    },
    onFinish({ response, runId }) {
        // response here will be an object that contains all the
        // input received provided the user completed all steps
        //  for the intercept
    },
    onDismiss({ stepId, runId }) {
        // callback called when a user dismisses the intercept
    }
})

```

Invoking the `registerIntercept` method returns a cold observable, that when subscribed to will kick off computation for when the intercept should be displayed and queue the intercept at the time it should be displayed, said subscription simply returns the ID of the last run.

This plugin also exposes the following config

- `xpack.intercepts.enabled`: Expects boolean value, denotes if the intercept plugin service will run, disabling this plugin implies that any downstream dependent of this plugin will not function.
