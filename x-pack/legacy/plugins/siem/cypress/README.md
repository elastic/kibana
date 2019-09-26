# Cypress Tests

The `siem/cypress` directory contains end to end tests, (plus a few tests
that rely on mocked API calls), that execute via [Cypress](https://www.cypress.io/).

Cypress tests may be run against:

- A local Kibana instance, interactively or via the command line. Credentials
are specified via `kibana.dev.yml` or environment variables.
- A remote Elastic Cloud instance (override `baseUrl`), interactively or via
the command line. Again, credentials are specified via `kibana.dev.yml` or
environment variables.
- As part of CI (override `baseUrl` and pass credentials via the
`CYPRESS_ELASTICSEARCH_USERNAME` and `CYPRESS_ELASTICSEARCH_PASSWORD`
environment variables), via command line.

At present, Cypress tests are only executed manually. They are **not** yet
integrated in the Kibana CI infrastructure, and therefore do **not** run
automatically when you submit a PR.

## Smoke Tests

Smoke Tests are located in `siem/cypress/integration/smoke_tests`

## Test Helpers

_Test helpers_ are functions that may be re-used across tests.

- Reusable code and CSS selectors should be added to
`siem/cypress/integration/lib`, as described below.

### Reusable Test Helper Functions and CSS Selectors

The `cypress/integration/lib` directory contains code intended to be re-used
across many different tests. Add reusable test helper functions and CSS
selectors to directories under `cypress/integration/lib`.

- Files named `helpers.ts` (e.g. `siem/cypress/integration/lib/login/helpers.ts`)
contain functions (e.g. `login`) that may be imported and invoked from multiple tests.

- Files named `selectors.ts` export CSS selectors for re-use. For example,
`siem/cypress/integration/lib/login/selectors.ts` exports the following selector
that matches the Username text area in the Kibana login page:

```sh
export const USERNAME = '[data-test-subj="loginUsername"]';
```

## Mock Data

We prefer not to mock API responses in most of our smoke tests, but sometimes
it's necessary because a test must assert that a specific value is rendered,
and it's not possible to derive that value based on the data in the
envrionment where tests are running.

Mocked responses API from the server are located in `siem/cypress/fixtures`.

## Authentication

When running tests, there are two ways to specify the credentials used to
authenticate with Kibana:

- Via `kibana.dev.yml` (recommended for developers)
- Via the `CYPRESS_ELASTICSEARCH_USERNAME` and `CYPRESS_ELASTICSEARCH_PASSWORD`
environment variables (recommended for CI), or when testing a remote Kibana
instance, e.g. in Elastic Cloud.

Note: Tests that use the `login()` test helper function for authentication will
automatically use the `CYPRESS_ELASTICSEARCH_USERNAME` and `CYPRESS_ELASTICSEARCH_PASSWORD`
environment variables when they are defined, and fall back to the values in
`config/kibana.dev.yml` when they are unset.

### Content Security Policy (CSP) Settings

Your local or cloud Kibana server must have the `csp.strict: false` setting
configured in `kibana.dev.yml`, or `kibana.yml`, as shown in the example below:

```yaml
csp.strict: false
```

The above setting is required to prevent the _Please upgrade
your browser_ / _This Kibana installation has strict security requirements
enabled that your current browser does not meet._ warning that's displayed for
unsupported user agents, like the one reported by Cypress when running tests.

### Example `kibana.dev.yml`

If you're a developer running tests interactively or on the command line, the
easiset way to specify the credentials used for authentication is to update
 `kibana.dev.yml` per the following example:

```yaml
csp.strict: false
elasticsearch:
  username: 'elastic'
  password: '<password>'
  hosts: ['https://<server>:9200']
```

## Running Tests Interactively

Use the Cypress interactive test runner to develop and debug specific tests
by adding a `.only` to the test you're developing, or click on a specific
spec in the interactive test runner to run just the tests in that spec.

To run and debug tests in interactively via the Cypress test runner:

1. Disable CSP on the local or remote Kibana instance, as described in the
_Content Security Policy (CSP) Settings_ section above.

2. To specify the credentials required for authentication, configure
`config/kibana.dev.yml`, as described in the _Server and Authentication
Requirements_ section above, or specify them via environment variables
as described later in this section.

3. Start a local instance of the Kibana development server (only if testing against a
local host):

```sh
yarn start --no-base-path
```

4. Launch the Cypress interactive test runner via one of the following options:

- To run tests interactively against the default (local) host specified by
`baseUrl`, as configured in `plugins/siem/cypress.json`:

```sh
cd x-pack/legacy/plugins/siem
yarn cypress:open
```

- To (optionally) run tests interactively against a different host, pass the
`CYPRESS_baseUrl` environment variable on the command line when launching the
test runner, as shown in the following example:

```sh
cd x-pack/legacy/plugins/siem
CYPRESS_baseUrl=http://localhost:5601 yarn cypress:open
```

- To (optionally) override username and password via environment variables when
running tests interactively:

```sh
cd x-pack/legacy/plugins/siem
CYPRESS_baseUrl=http://localhost:5601 CYPRESS_ELASTICSEARCH_USERNAME=elastic CYPRESS_ELASTICSEARCH_PASSWORD=<password> yarn cypress:open
```

5. Click the `Run all specs` button in the Cypress test runner (after adding
a `.only` to an `it` or `describe` block).

## Running (Headless) Tests on the Command Line

To run (headless) tests on the command line:

1. Disable CSP on the local or remote Kibana instance, as described in the
_Content Security Policy (CSP) Settings_ section above.

2. To specify the credentials required for authentication, configure
`config/kibana.dev.yml`, as described in the _Server and Authentication
Requirements_ section above, or specify them via environment variables
as described later in this section.

3. Start a local instance of the Kibana development server (only if testing against a
local host):

```sh
yarn start --no-base-path
```

4. Launch the Cypress command line test runner via one of the following options:

- To run tests on the command line against the default (local) host specified by
`baseUrl`, as configured in `plugins/siem/cypress.json`:

```sh
cd x-pack/legacy/plugins/siem
yarn cypress:run
```

- To (optionally) run tests on the command line against a different host, pass
`CYPRESS_baseUrl` as an environment variable on the command line, as shown in
the following example:

```sh
cd x-pack/legacy/plugins/siem
CYPRESS_baseUrl=http://localhost:5601 yarn cypress:run
```

- To (optionally) override username and password via environment variables when
running via the command line:

```sh
cd x-pack/legacy/plugins/siem
CYPRESS_baseUrl=http://localhost:5601 CYPRESS_ELASTICSEARCH_USERNAME=elastic CYPRESS_ELASTICSEARCH_PASSWORD=<password> yarn cypress:run
```

## Reporting

When Cypress tests are run on the command line via `yarn cypress:run`,
reporting artifacts are generated under the `target` directory in the root
of the Kibana, as detailed for each artifact type in the sections below.

### HTML Reports

An HTML report (e.g. for email notifications) is output to:

```
target/kibana-siem/cypress/results/output.html
```

### Screenshots

Screenshots of failed tests are output to:

```
target/kibana-siem/cypress/screenshots
```

### `junit` Reports

The Kibana CI process reports `junit` test results from the `target/junit` directory.

Cypress `junit` reports are generated in `target/kibana-siem/cypress/results`
and copied to the `target/junit` directory.

### Videos (optional)

Videos are disabled by default, but can optionally be enabled by setting the
`CYPRESS_video=true` environment variable:

```
CYPRESS_video=true yarn cypress:run
```

Videos are (optionally) output to:

```
target/kibana-siem/cypress/videos
```
