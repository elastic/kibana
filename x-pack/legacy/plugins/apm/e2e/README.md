# End-To-End (e2e) Test for APM UI

## Ingest static data into Elasticsearch via APM Server

1. Start Elasticsearch and APM Server, using [apm-integration-testing](https://github.com/elastic/apm-integration-testing):

```shell
$ git clone https://github.com/elastic/apm-integration-testing.git
$ cd apm-integration-testing
./scripts/compose.py start master --all --apm-server-record
```

2. Download [static data file](https://storage.googleapis.com/apm-ui-e2e-static-data/events.json)

```shell
$ cd x-pack/legacy/plugins/apm/e2e/cypress/ingest-data
$ curl https://storage.googleapis.com/apm-ui-e2e-static-data/events.json --output events.json
```

3. Post to APM Server

```shell
$ cd x-pack/legacy/plugins/apm/e2e/cypress/ingest-data
$ node ingest-data/replay.js --server-url http://localhost:8200 --secret-token abcd --events ./events.json
```
>This process will take a few minutes to ingest all data

4. Start Kibana

```shell
$ yarn start --no-base-path --csp.strict=false
```

> Content Security Policy (CSP) Settings: Your Kibana instance must have the `csp.strict: false`.

## How to run the tests

_Note: Run the following commands from `kibana/x-pack/legacy/plugins/apm/e2e/cypress`._

### Interactive mode

```
yarn cypress open
```

### Headless mode

```
yarn cypress run
```

## Connect to Elasticsearch on Cloud (internal devs only)

Find the credentials for the cluster [here](https://github.com/elastic/apm-dev/blob/master/docs/credentials/apm-ui-clusters.md#e2e-cluster). The cloud instance contains the static data set

The above setting is required to prevent the _Please upgrade
your browser_ / _This Kibana installation has strict security requirements
enabled that your current browser does not meet._ warning that's displayed for
unsupported user agents, like the one reported by Cypress when running tests.
