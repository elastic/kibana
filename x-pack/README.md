# Elastic License Functionality

This directory tree contains files subject to the Elastic License. The files subject
to the Elastic License are grouped in this directory to clearly separate them
from files licensed under the Apache License 2.0.

# Development

By default, Kibana will run with X-Pack installed as mentioned in the [contributing guide](../CONTRIBUTING.md).

Elasticsearch will run with a basic license. To run with a trial license, including security, you can specifying that with the `yarn es` command.

Example: `yarn es snapshot --license trial --password changeme`

# Testing

## Running unit tests_bundle

You can run unit tests by running:

```
yarn test
```

If you want to run tests only for a specific plugin (to save some time), you can run:

```
yarn test --plugins <plugin>[,<plugin>]*    # where <plugin> is "reporting", etc.
```

#### Running single test file
Edit test file, changing top level `describe` to `describe.only`. Run tests with normal commands.

#### Debugging browser tests
```
yarn test:browser:dev
```
Initializes an environment for debugging the browser tests. Includes an dedicated instance of the kibana server for building the test bundle, and a karma server. When running this task the build is optimized for the first time and then a karma-owned instance of the browser is opened. Click the "debug" button to open a new tab that executes the unit tests.

Run single tests by appending `grep` parameter to the end of the URL. For example `http://localhost:9876/debug.html?grep=ML%20-%20Explorer%20Controller` will only run tests with 'ML - Explorer Controller' in the describe block.

#### Running server unit tests
You can run server-side unit tests by running:

```
yarn test:server
```

#### Running functional tests

The functional UI tests, the API integration tests, and the SAML API integration tests are all run against a live browser, Kibana, and Elasticsearch install. Each set of tests is specified with a unique config that describes how to start the Elasticsearch server, the Kibana server, and what tests to run against them. The sets of tests that exist today are *functional UI tests* ([specified by this config](test/functional/config.js)), *API integration tests* ([specified by this config](test/api_integration/config.js)), and *SAML API integration tests* ([specified by this config](test/saml_api_integration/config.js)).

The script runs all sets of tests sequentially like so:
* builds Elasticsearch and X-Pack
* runs Elasticsearch with X-Pack
* starts up the Kibana server with X-Pack
* runs the functional UI tests against those servers
* tears down the servers
* repeats the same process for the API and SAML API integration test configs.

To do all of this in a single command run:

```sh
node scripts/functional_tests
```

#### Running UI tests

The functional UI tests can be run separately like so:

```sh
node scripts/functional_tests --config test/functional/config
```

It does the same as the previous command, except that it only does setup/test/teardown for the UI tests.

#### Running API integration tests

API integration tests are run with a unique setup usually without UI assets built for the Kibana server.

API integration tests are intended to test _only programmatic API exposed by Kibana_. There is no need to run browser and simulate user actions, which significantly reduces execution time. In addition, the configuration for API integration tests typically sets `optimize.enabled=false` for Kibana because UI assets are usually not needed for these tests.

The API integration tests can be run separately like so:

```sh
node scripts/functional_tests --config test/api_integration/config
```

#### Running SAML API integration tests

We also have SAML API integration tests which set up Elasticsearch and Kibana with SAML support. Run API integration tests separately with SAML support like so:

```sh
node scripts/functional_tests --config test/saml_api_integration/config
```

#### Developing functional tests

If you are **developing functional tests** then you probably don't want to rebuild Elasticsearch and wait for all that setup on every test run, so instead use this command to build and start just the Elasticsearch and Kibana servers:

```sh
node scripts/functional_tests_server
```

After the servers are started, open a new terminal and run this command to run just the tests (without tearing down Elasticsearch or Kibana):

```sh
# make sure you are in the x-pack-kibana project
cd x-pack

# invoke the functional_test_runner from kibana project. try sending --help to learn more
node ../scripts/functional_test_runner
```

For both of the above commands, it's crucial that you pass in `--config` to specify the same config file to both commands. This makes sure that the right tests will run against the right servers. Typically a set of tests and server configuration go together.

Read more about how the scripts work [here](scripts/README.md).

For a deeper dive, read more about the way functional tests and servers work [here](packages/kbn-test/README.md).

### Issues starting dev more of creating builds

You may see an error like this when you are getting started:

```
[14:08:15] Error: Linux x86 checksum failed
    at download_phantom.js:42:15
    at process._tickDomainCallback (node.js:407:9)
```

That's thanks to the binary Phantom downloads that have to happen, and Bitbucket being annoying with throttling and redirecting or... something. The real issue eludes me, but you have 2 options to resolve it.

1. Just keep re-running the command until it passes. Eventually the downloads will work, and since they are cached, it won't ever be an issue again.
1. Download them by hand [from Bitbucket](https://bitbucket.org/ariya/phantomjs/downloads) and copy them into the `.phantom` path. We're currently using 1.9.8, and you'll need the Window, Mac, and Linux builds.
