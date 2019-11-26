Temporary README.md for developers working on the backend detection engine
for how to get started.

See these two other pages for references:
https://github.com/elastic/kibana/blob/master/x-pack/legacy/plugins/alerting/README.md
https://github.com/elastic/kibana/tree/master/x-pack/legacy/plugins/actions

Since there is no UI yet and a lot of backend areas that are not created, you
should install the kbn-action and kbn-alert project from here:
https://github.com/pmuellr/kbn-action

The scripts rely on CURL and jq, ensure both of these are installed:

```sh
brew update
brew install curl
brew install jq
```

Open up your .zshrc/.bashrc and add these lines with the variables filled in:

```
export ELASTICSEARCH_USERNAME=${user}
export ELASTICSEARCH_PASSWORD=${password}
export ELASTICSEARCH_URL=https://${ip}:9200
export KIBANA_URL=http://localhost:5601
export SIGNALS_INDEX=.siem-signals-${your user id}
export TASK_MANAGER_INDEX=.kibana-task-manager-${your user id}
export KIBANA_INDEX=.kibana-${your user id}

# This is for the kbn-action and kbn-alert tool
export KBN_URLBASE=http://${user}:${password}@localhost:5601
```

source your .zhsrc/.bashrc or open a new terminal to ensure you get the new values set.

Optional env var when set to true will utilize `reindex` api for reindexing
instead of the scroll and bulk index combination.

```
export USE_REINDEX_API=true
```

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

You should also see the SIEM detect the feature flags and start the API endpoints for signals

```
server    log   [11:39:05.561] [info][siem] Detected feature flags for actions and alerting and enabling signals API endpoints
```

Open a terminal and go into the scripts folder `cd kibana/x-pack/legacy/plugins/siem/server/lib/detection_engine/scripts` and run:

```
./hard_reset.sh
./post_signal.sh
```

which will:

- Delete any existing actions you have
- Delete any existing alerts you have
- Delete any existing alert tasks you have
- Delete any existing signal mapping you might have had.
- Add the latest signal index and its mappings
- Posts a sample signal which checks for root or admin every 5 minutes

Now you can run

```sh
./get_alert_instances.sh
```

You should see the new alert instance created like so:

```ts
{
    "id": "908a6af1-ac63-4d52-a856-fc635a00db0f",
    "alertTypeId": "siem.signals",
    "interval": "5m",
    "actions": [ ],
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

See the scripts folder and the tools for more command line fun.

Add the `.siem-signals-${your user id}` to your advanced SIEM settings to see any signals
created which should update once every 5 minutes at this point.

Also add the `.siem-signals-${your user id}` as a kibana index for Maps to be able to see the
signals

Optionally you can add these debug statements to your `kibana.dev.yml` to see more information when running the detection
engine

```sh
logging.verbose: true
logging.events:
  {
    log: ['siem', 'info', 'warning', 'error', 'fatal'],
    request: ['info', 'warning', 'error', 'fatal'],
    error: '*',
    ops: __no-ops__,
  }
```
