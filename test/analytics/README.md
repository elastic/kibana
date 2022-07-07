# FTR tests for the `core.analytics` service

This suite allows us to test the event-based telemetry client provided by the `core.analytics` service.

## How to add my own tests

Implement your own tests in the `tests/instrumented_events/(from_the_browser|from_the_server)/` directory and list it in the `tests/instrumented_events/(from_the_browser|from_the_server)/index.ts` file.

There are 2 FTR helpers to allow you to retrieve the generated events:

1. For events generated in the UI, you can use `kibana_ebt_ui` to retrieve the events.
2. For events generated in the server, you can use the `kibana_ebt_server` helper.

The API is the same for both of them:
```typescript
// To retrieve 2 events of type "my-event-type"
const events = await getService('kibana_ebt_ui').getEvents(2, { eventTypes: ['my-event-type'] });
expect(events).to...
```

If you are reusing these helpers in another suite, please remember to make sure to optIn via `await getService('kibana_ebt_ui').setOptIn(true);`

Refer to [`EBTHelpersContract`](./fixtures/plugins/analytics_ftr_helpers/common/types.ts#:~:text=EBTHelpersContract) for more details about the existing APIs and all the options they accept.