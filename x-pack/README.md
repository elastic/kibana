# Elastic License Functionality

This directory tree contains files subject to the Elastic License 2.0.
The files subject to the Elastic License 2.0 are grouped in this directory to clearly separate them from files licensed otherwise.

## Alert Details page feature flags (feature-flag-per-App)

If you have:

```yaml
xpack.observability.unsafe.alertDetails.uptime.enabled: true
```

**[For Uptime rule type]** In Kibana configuration, will allow the user to navigate to the new Alert Details page, instead of the Alert Flyout when clicking on `View alert details` in the Alert table

# Development

By default, Kibana will run with X-Pack installed as mentioned in the [contributing guide](../CONTRIBUTING.md).

Elasticsearch will run with a basic license. To run with a trial license, including security, you can specifying that with the `yarn es` command.

Example: `yarn es snapshot --license trial --password changeme`

By default, this will also set the password for native realm accounts to the password provided (`changeme` by default). This includes that of the `kibana_system` user which `elasticsearch.username` defaults to in development. If you wish to specify a password for a given native realm account, you can do that like so: `--password.kibana_system=notsecure`

# Testing

For information on testing, see [the Elastic functional test development guide](https://www.elastic.co/guide/en/kibana/current/development-tests.html).

#### Running functional tests

The functional UI tests, the API integration tests, and the SAML API integration tests are all run against a live browser, Kibana, and Elasticsearch install. Each set of tests is specified with a unique config that describes how to start the Elasticsearch server, the Kibana server, and what tests to run against them. The sets of tests that exist today are _functional UI tests_ ([specified by this config](test/functional/config.base.js)), _API integration tests_ ([specified by this config](test/api_integration/config.ts)), and _SAML API integration tests_ ([specified by this config](test/security_api_integration/saml.config.ts)).

The script runs all sets of tests sequentially like so:

- builds Elasticsearch and X-Pack
- runs Elasticsearch with X-Pack
- starts up the Kibana server with X-Pack
- runs the functional UI tests against those servers
- tears down the servers
- repeats the same process for the API and SAML API integration test configs.

To do all of this in a single command run:

```sh
node scripts/functional_tests
```

#### Developing functional UI tests

If you are **developing functional tests** then you probably don't want to rebuild Elasticsearch and wait for all that setup on every test run, so instead use this command to build and start just the Elasticsearch and Kibana servers:

```sh
node scripts/functional_tests_server
```

After the servers are started, open a new terminal and run this command to run just the tests (without tearing down Elasticsearch or Kibana):

```sh
node scripts/functional_test_runner
```

For both of the above commands, it's crucial that you pass in `--config` to specify the same config file to both commands. This makes sure that the right tests will run against the right servers. Typically a set of tests and server configuration go together.

Read more about how the scripts work [here](../scripts/README.md).

For a deeper dive, read more about the way functional tests and servers work [here](../packages/kbn-test/README.mdx).

#### Running API integration tests

API integration tests are run with a unique setup usually without UI assets built for the Kibana server.

API integration tests are intended to test _only programmatic API exposed by Kibana_. There is no need to run browser and simulate user actions, which significantly reduces execution time. In addition, the configuration for API integration tests typically sets `optimize.enabled=false` for Kibana because UI assets are usually not needed for these tests.

To run _only_ the API integration tests:

```sh
node scripts/functional_tests --config test/api_integration/config
```

#### Running SAML API integration tests

We also have SAML API integration tests which set up Elasticsearch and Kibana with SAML support. Run _only_ API integration tests with SAML enabled like so:

```sh
node scripts/functional_tests --config test/security_api_integration/saml.config
```

#### Running Jest integration tests

Jest integration tests can be used to test behavior with Elasticsearch and the Kibana server.

```sh
yarn test:jest_integration
```

#### Running Reporting functional tests

See [here](./test/functional/apps/dashboard/group3/reporting/README.mdx) for more information on running reporting tests.

#### Running Security Solution Cypress E2E/integration tests

See [here](./solutions/security/plugins/security_solution//public/management/cypress/README.md) for information on running this test suite.
