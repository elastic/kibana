# Data Set Quality

In order to make ongoing maintenance of log collection easy we want to introduce the concept of data set quality, where users can easily get an overview on the data sets they have with information such as integration, size, last activity, among others.

## Development

### Unit Tests

Kibana primarily uses Jest for unit testing. Each plugin or package defines a `jest.config.js` that extends a preset provided by the `@kbn/test` package. The following command runs all Data Set Quality unit tests:

```
yarn jest --config x-pack/platform/plugins/shared/dataset_quality/jest.config.js
```

You can also run a specific test by passing the filepath as an argument, e.g.:

```
yarn jest --config x-pack/platform/plugins/shared/dataset_quality/jest.config.js x-pack/platform/plugins/shared/dataset_quality/server/routes/data_streams/get_data_streams/get_data_streams.test.ts
```

### API tests (Scout)

The API tests are located in [`test/scout/api`](./test/scout/api/).

#### Start server and run tests (stateful)

```sh
# start server
node scripts/scout.js start-server --arch stateful --domain classic

# run tests
node scripts/playwright test --config x-pack/platform/plugins/shared/dataset_quality/test/scout/api/playwright.config.ts --project local --grep "@local-stateful-classic"
```

#### Start server and run tests (serverless)

```sh
# start server
node scripts/scout.js start-server --arch serverless --domain observability_complete

# run tests
node scripts/playwright test --config x-pack/platform/plugins/shared/dataset_quality/test/scout/api/playwright.config.ts --project local --grep "@local-serverless-observability_complete"
```

Alternatively `node scripts/scout.js run-tests --arch <arch> --domain <domain> --config <playwright config>`
starts the servers and runs the suite in one step, selecting the deployment tag for you.

### Using dockerized package registry

For tests using package registry we have enabled a configuration that uses a dockerized lite version to execute the tests in the CI, this will reduce the flakyness of them when calling the real endpoint.

To be able to run this version locally you must have a docker daemon running in your system and set `FLEET_PACKAGE_REGISTRY_PORT` env var. In order to set this variable execute

```
export set FLEET_PACKAGE_REGISTRY_PORT=12345
```

To unset the variable, and run the tests against the real endpoint again, execute

```
unset FLEET_PACKAGE_REGISTRY_PORT
```

### Functional Tests

#### Stateful

##### FTR Server

```
yarn test:ftr:server --config ./x-pack/solutions/observability/test/functional/apps/dataset_quality/config.ts
```

##### FTR Runner

```
yarn test:ftr:runner --config ./x-pack/solutions/observability/test/functional/apps/dataset_quality/config.ts --include ./x-pack/solutions/observability/test/functional/apps/dataset_quality/index.ts
```

##### Running Individual Tests

```
yarn test:ftr:runner --config ./x-pack/solutions/observability/test/functional/apps/dataset_quality/config.ts --include ./x-pack/solutions/observability/test/functional/apps/dataset_quality/$1
```

#### Serverless

##### Server

```
yarn test:ftr:server --config ./x-pack/solutions/observability/test/serverless/functional/configs/config.ts
```

##### Runner

```
yarn test:ftr:runner --config ./x-pack/solutions/observability/test/serverless/functional/configs/config.ts --include ./x-pack/solutions/observability/test/serverless/functional/test_suites/dataset_quality/index.ts
```

##### Running Individual Tests

```
yarn test:ftr:runner --config ./x-pack/solutions/observability/test/serverless/functional/configs/config.ts --include ./x-pack/solutions/observability/test/serverless/functional/test_suites/dataset_quality/$1
```
