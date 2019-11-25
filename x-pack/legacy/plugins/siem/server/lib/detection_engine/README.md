Temporary README.md for users and developers working on the backend detection engine
for how to get started.

# Setup for Users

If you're just a user and want to enable the REST interfaces and UI screens do the following.
NOTE: this is very temporary and once alerting and actions is enabled by default you will no
longer have to do these steps

Set the environment variable ALERTING_FEATURE_ENABLED to be true in your .profile or your windows
global environment variable.

```sh
export ALERTING_FEATURE_ENABLED=true
```

In your `kibana.yml` file enable alerting and actions like so:

```sh
# Feature flag to turn on alerting
xpack.alerting.enabled: true

# Feature flag to turn on actions which goes with alerting
xpack.actions.enabled: true
```

Start Kibana and you will see these messages indicating signals is activated like so:

```sh
server    log   [11:39:05.561] [info][siem] Detected feature flags for actions and alerting and enabling signals API endpoints
```

If you see crashes like this:

```ts
 FATAL  Error: Unmet requirement "alerting" for plugin "siem"
```

It is because Kibana is not picking up your changes from `kibana.yml` and not seeing that alerting and actions is enabled.

# For Developers

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

```sh
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

```sh
export USE_REINDEX_API=true
```

Add these lines to your `kibana.dev.yml` to turn on the feature toggles of alerting and actions:

```sh
# Feature flag to turn on alerting
xpack.alerting.enabled: true

# Feature flag to turn on actions which goes with alerting
xpack.actions.enabled: true
```

Restart Kibana and ensure that you are using `--no-base-path` as changing the base path is a feature but will
get in the way of the CURL scripts written as is. You should see alerting and actions starting up like so afterwards

```sh
server    log   [22:05:22.277] [info][status][plugin:alerting@8.0.0] Status changed from uninitialized to green - Ready
server    log   [22:05:22.270] [info][status][plugin:actions@8.0.0] Status changed from uninitialized to green - Ready
```

You should also see the SIEM detect the feature flags and start the API endpoints for signals

```sh
server    log   [11:39:05.561] [info][siem] Detected feature flags for actions and alerting and enabling signals API endpoints
```

Open a terminal and go into the scripts folder `cd kibana/x-pack/legacy/plugins/siem/server/lib/detection_engine/scripts` and run:

```sh
./hard_reset.sh
./post_signal.sh
```

which will:

- Delete any existing actions you have
- Delete any existing alerts you have
- Delete any existing alert tasks you have
- Delete any existing signal mapping you might have had.
- Add the latest signal index and its mappings using your settings from `SIGNALS_INDEX` environment variable.
- Posts the sample signal from `signals/root_or_admin_1.json` by replacing its `output_index` with your `SIGNALS_INDEX` environment variable
- The sample signal checks for root or admin every 5 minutes and reports that as a signal if it is a positive hit

Now you can run

```sh
./find_signals.sh
```

You should see the new signals created like so:

```sh
{
  "page": 1,
  "perPage": 20,
  "total": 1,
  "data": [
    {
      "created_by": "elastic",
      "description": "Detecting root and admin users",
      "enabled": true,
      "false_positives": [],
      "from": "now-6m",
      "id": "a556065c-0656-4ba1-ad64-a77ca9d2013b",
      "immutable": false,
      "index": [
        "auditbeat-*",
        "filebeat-*",
        "packetbeat-*",
        "winlogbeat-*"
      ],
      "interval": "5m",
      "rule_id": "rule-1",
      "language": "kuery",
      "output_index": ".siem-signals-frank-hassanabad",
      "max_signals": 100,
      "risk_score": 1,
      "name": "Detect Root/Admin Users",
      "query": "user.name: root or user.name: admin",
      "references": [
        "http://www.example.com",
        "https://ww.example.com"
      ],
      "severity": "high",
      "updated_by": "elastic",
      "tags": [],
      "to": "now",
      "type": "query"
    }
  ]
}
```

Every 5 minutes if you get positive hits you will see messages on info like so:

```sh
server    log   [09:54:59.013] [info][plugins][siem] Total signals found from signal rule "id: a556065c-0656-4ba1-ad64-a77ca9d2013b", "ruleId: rule-1": 10000
```

Signals are space aware and default to the "default" space for these scripts if you do not export
the variable of SPACE_URL. For example, if you want to post rules to the space `test-space` you would
set your SPACE_URL to be:

```sh
export SPACE_URL=/s/test-space
```

So that the scripts prepend a `/s/test-space` in front of all the APIs to correctly create, modify, delete, and update
them from within that space.

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
