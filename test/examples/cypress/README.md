# Cypress Tests

This directory contains functional UI tests that execute using [Cypress](https://www.cypress.io/).

#### FTR + Interactive

This is the preferred mode for developing new tests.

```shell
# bootstrap kibana from the project root
yarn kbn bootstrap

# build the plugins/assets that cypress will execute against
node scripts/build_kibana_platform_plugins

# launch the cypress test runner
cd test/examples
yarn cypress:open-as-ci
```

Note that you can select the browser you want to use on the top right side of the interactive runner.
