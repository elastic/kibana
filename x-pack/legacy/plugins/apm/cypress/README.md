### How to run

_Note: Run the following commands from `kibana/x-pack/legacy/plugins/apm/cypress`._

#### Interactive mode

```
yarn cypress open
```

#### Headless mode

```
yarn cypress run
```

### Connect to Elasticsearch on Cloud (internal devs only)

Update kibana.yml with the [cloud credentials](https://p.elstc.co/paste/nRxc9Fuq#0GKJvmrJajnl-PjgBZSnpItKaixWgPb2xn6DCyGD6nw). The cloud instance contains the static data set

### Kibana

#### `--no-base-path`

Kibana must be started with `yarn start --no-base-path`

#### Content Security Policy (CSP) Settings

Your local or cloud Kibana server must have the `csp.strict: false` setting
configured in `kibana.dev.yml`, or `kibana.yml`, as shown in the example below:

```yaml
csp.strict: false
```

The above setting is required to prevent the _Please upgrade
your browser_ / _This Kibana installation has strict security requirements
enabled that your current browser does not meet._ warning that's displayed for
unsupported user agents, like the one reported by Cypress when running tests.

### Ingest static data into Elasticsearch via APM Server

1. Download [static data file](https://storage.googleapis.com/apm-ui-e2e-static-data/events.json)

2. Post to APM Server

```
node ingest-data/replay.js --server-url http://localhost:8200 --secret-token abcd --events ./events.json
```

### Generate static data

Capture data from all agents with [apm-integration-testing](https://github.com/elastic/apm-integration-testing):

```
./scripts/compose.py start master --all --apm-server-record
```

To copy the captured data from the container to the host:

```
docker cp localtesting_8.0.0_apm-server-2:/app/events.json .
```
