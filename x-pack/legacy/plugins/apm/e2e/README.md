# End-To-End (e2e) Test for APM UI

## Ingest static data into Elasticsearch via APM Server

1. Start Elasticsearch and APM Server, using [apm-integration-testing](https://github.com/elastic/apm-integration-testing):

```shell
$ git clone https://github.com/elastic/apm-integration-testing.git
$ cd apm-integration-testing
./scripts/compose.py start master --no-kibana --no-xpack-secure
```

2. Download [static data file](https://storage.googleapis.com/apm-ui-e2e-static-data/events.json)

```shell
$ cd x-pack/legacy/plugins/apm/e2e/cypress/ingest-data
$ curl https://storage.googleapis.com/apm-ui-e2e-static-data/events.json --output events.json
```

3. Post to APM Server

```shell
$ cd x-pack/legacy/plugins/apm/e2e/cypress/ingest-data
$ node replay.js --server-url http://localhost:8200 --secret-token abcd --events ./events.json
```
>This process will take a few minutes to ingest all data

4. Start Kibana

```shell
$ yarn kbn bootstrap
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

## Reproducing CI builds

>This process is very slow compared to the local development described above. Consider that the CI must install and configure the build tools and create a Docker image for the project to run tests in a consistent manner.

The Jenkins CI uses a shell script to prepare Kibana:

```shell
# Prepare and run Kibana locally
$ x-pack/legacy/plugins/apm/e2e/ci/prepare-kibana.sh
# Build Docker image for Kibana
$ docker build --tag cypress --build-arg NODE_VERSION=$(cat .node-version) x-pack/legacy/plugins/apm/e2e/ci 
# Run Docker image
$ docker run --rm -t --user "$(id -u):$(id -g)" \
    -v `pwd`:/app --network="host" \
    --name cypress cypress
```
