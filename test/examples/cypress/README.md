# Cypress Tests

This directory contains functional UI tests that execute using [Cypress](https://www.cypress.io/).

## Setup

```shell
# bootstrap kibana from the project root
yarn kbn bootstrap

# build the plugins/assets that cypress will execute against
# Note: you may wish to add the "--watch" argument to run the optimizer in watch mode
node scripts/build_kibana_platform_plugins
```

## Running tests

**Note:** in the lexicon of Cypress, the "Test Runner" is a desktop app for developing tests and is usually
accessed with the `cypress open` command. Running Cypress tests in CI requires a "headless" runner that is
usually accessed with the `cypress run` command. This directory contains test configurations for both.

1. **Launching Cypress Test Runner**: this command wraps the `cypress open` and is the preferred mode for
   actively working on test code.

    ```shell
    # launch the Cypress Test Runner
    node scripts/functional_tests.js --config test/examples/cypress/config_runner.ts
    ```

2. **Running Cypress tests headlessly**: this command wraps `cypress run` and is the preferred mode for running
   tests in CI or quickly checking for regressions.

    ```shell
    # run tests headlessly
    node scripts/functional_tests.js --config test/examples/cypress/config_headless.ts
    ```
