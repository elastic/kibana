# Cypress Tests

This directory contains functional UI tests that execute using [Cypress](https://www.cypress.io/).

## Setup

```shell
# bootstrap kibana from the project root
yarn kbn bootstrap

# build the plugins/assets that cypress will execute against
node scripts/build_kibana_platform_plugins
```

## Using the Cypress Test Runner

This is the preferred mode for working on test code.

```shell
# launch the Cypress Test Runner
node scripts/functional_tests.js --config test/examples/cypress/config_runner.ts
```

## Running tests headlessly

This is the preferred mode for running tests in CI.

```shell
# launch the Cypress headlessly
node scripts/functional_tests.js --config test/examples/cypress/config_headless.ts
```
