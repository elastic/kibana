# Cypress Tests

The `siem/cypress` directory contains end to end tests (specific to the `SIEM` app) that execute via [Cypress](https://www.cypress.io/).

At present, these tests are only executed in a local development environment; they are **not** integrated in the Kibana CI infrastructure, and therefore do **not** run automatically when you submit a PR.

See the `Server and Authentication Requirements` section below for additional details.

## Organizing Tests and (Mock) Data

- Code and CSS selectors that may be re-used across tests should be added to `siem/cypress/integration/lib`, as described below
- Smoke Tests are located in `siem/cypress/integration/smoke_tests`
- Mocked responses from the server are located in `siem/cypress/fixtures`

### `cypress/integration/lib`

The `cypress/integration/lib` folder contains code intended to be re-used across many different tests.

- Files named `helpers.ts` (e.g. `siem/cypress/integration/lib/login/helpers.ts`) contain functions (e.g. `login`) that may be imported and invoked from multiple tests.

- Files named `selectors.ts` export CSS selectors for re-use. For example, `siem/cypress/integration/lib/login/selectors.ts` exports the following selector that matches the Username text area in the Kibana login page:

```
export const USERNAME = '[data-test-subj="loginUsername"]';
```

## Server and Authentication Requirements

The current version of the Smoke Tests require running a local Kibana server that connects to an instance of `elasticsearch`. A file named `config/kibana.dev.yml` like the example below is required to run the tests:

```yaml
elasticsearch:
  username: 'elastic'
  password: '<password>'
  hosts: ['https://<server>:9200']
```

The `username` and `password` from `config/kibana.dev.yml` will be read by the `login` test helper function when tests authenticate with Kibana.

See the `Running Tests Interactively` section for details.

## Running Tests Interactively

To run tests in interactively via the Cypress test runner:

1. Create and configure a `config/kibana.dev.yml`, as described in the `Server and Authentication Requirements` section above.

2. Start a local instance of the Kibana development server:

```
yarn start --no-base-path
```

3. Launch the Cypress interactive test runner:

```sh
cd x-pack/legacy/plugins/siem
yarn cypress:open
```

4. Click the `Run all specs` button in the Cypress test runner
