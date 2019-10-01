Temporary README.md for developers working on the backend detection engine
for how to get started.

Since there is no UI yet and a lot of backend areas that are not created, you 
should install the kbn-action and kbn-alert project from here:
https://github.com/pmuellr/kbn-action

Add your signal mappings into your Kibana instance manually by opening

```
x-pack/legacy/plugins/siem/server/lib/detection_engine/signals_mapping.json
```

And copying that to your DEV tools so it looks something like:
```
PUT /.siem-signals-10-01-2019
{
  "mappings": {
    "dynamic": false,
...
```

We will solve the above issue here:
https://github.com/elastic/kibana/issues/47002

Add these lines to your `kibana.dev.yml` to turn on the feature toggles of alerting and actions:
```
# Feature flag to turn on alerting
xpack.alerting.enabled: true

# Feature flag to turn on actions which goes with alerting
xpack.actions.enabled: true

# White list everything for ease of development (do not do in production)
xpack.actions.whitelistedHosts: ['*']
```

Open `x-pack/legacy/plugins/siem/index.ts` and find these lines and add the require statement
while commenting out the other require statement:

```
// Uncomment these lines to turn on alerting and action for detection engine and comment the other
// require statement out. These are hidden behind feature flags at the moment so if you turn
// these on without the feature flags turned on then Kibana will crash since we are a legacy plugin
// and legacy plugins cannot have optional requirements.
// require: ['kibana', 'elasticsearch', 'alerting', 'actions'],
```

Restart Kibana and you should see alerting and actions starting up
```
server    log   [22:05:22.277] [info][status][plugin:alerting@8.0.0] Status changed from uninitialized to green - Ready
server    log   [22:05:22.270] [info][status][plugin:actions@8.0.0] Status changed from uninitialized to green - Ready
```

Open a terminal and run

```sh
kbn-alert ls-types
```

You should see the new alert type of:

```ts
[
    {
        "id": "siem.signals",
        "name": "SIEM Signals"
    }
]
```

Setup SIEM Alerts Log action through

```ts
kbn-action create .server-log "SIEM Alerts Log" {} {}
{
    "id": "7edd7e98-9286-4fdb-a5c5-16de776bc7c7",
    "actionTypeId": ".server-log",
    "description": "SIEM Alerts Log",
    "config": {}
}
```

Take note of the `id` GUID above and copy and paste that into a create alert like so

```ts
kbn-alert create siem.signals 5m '{}' "[{group:default id:'7edd7e98-9286-4fdb-a5c5-16de776bc7c7' params:{message: 'SIEM Alert Fired'}}]"
```

You should get back a response like so
```ts
{
    "id": "908a6af1-ac63-4d52-a856-fc635a00db0f",
    "alertTypeId": "siem.signals",
    "interval": "5m",
    "actions": [
        {
            "group": "default",
            "params": {
                "message": "SIEM Alert Fired"
            },
            "id": "7edd7e98-9286-4fdb-a5c5-16de776bc7c7"
        }
    ],
    "alertTypeParams": {},
    "enabled": true,
    "throttle": null,
    "createdBy": "elastic",
    "updatedBy": "elastic",
    "apiKeyOwner": "elastic",
    "scheduledTaskId": "4f401ca0-e402-11e9-94ed-051d758a6c79"
}
```

Every 5 minutes you should see this message in your terminal now:

```
server    log   [22:17:33.945] [info][alerting] SIEM Alert Fired
```

Add the `.siem-signals-10-01-2019` to your advanced SIEM settings to see any signals
created which should update once every 5 minutes at this point.