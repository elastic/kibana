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

The functional tests are run against a live browser, Kibana, and Elasticsearch install. They build their own version of elasticsearch and x-pack-elasticsearch, run the builds automatically, startup the kibana server, and run the tests against them.

To do all of this in a single command run:

```sh
node scripts/functional_tests
```

If you are **developing functional tests** then you probably don't want to rebuild elasticsearch and wait for all that setup on every test run, so instead use this command to get started:

```sh
node scripts/functional_tests_server
```

After both Elasticsearch and Kibana are running, open a new terminal (without tearing down Elasticsearch, Kibana, etc.) and use the following to run the tests:

```sh
# this command accepts a bunch of arguments to tweak the run, try sending --help to learn more
node ../scripts/functional_test_runner
```

#### Running API integration tests

API integration tests are very similar to functional tests in a sense that they are organized in the same way and run against live Kibana and Elasticsearch instances.
The difference is that API integration tests are intended to test only programmatic API exposed by Kibana. There is no need to run browser and simulate user actions that significantly reduces execution time.

To build, run `x-pack-kibana` with `x-pack-elasticsearch` and then run API integration tests against them use the following command:

```sh
node scripts/functional_tests_api
```

If you are **developing api integration tests** then you probably don't want to rebuild `x-pack-elasticsearch` and wait for all that setup on every test run, so instead use this command to get started:

```sh
node scripts/functional_tests_server
```

Once Kibana and Elasticsearch are up and running open a new terminal and run this command to just run the tests (without tearing down Elasticsearch, Kibana, etc.)

```sh
# this command accepts a bunch of arguments to tweak the run, try sending --help to learn more
node ../scripts/functional_test_runner --config test/api_integration/config.js
```

You can also run API integration tests with SAML support. The `--saml` option configures both Kibana and Elasticsearch
with the SAML security realm, as required by the SAML security API.

Start the functional test server with SAML support:

```sh
node scripts/functional_tests_server --saml
```

Then run the tests with:
```sh
# make sure you are in the x-pack-kibana project
cd x-pack-kibana

# use a different config for SAML
node ../scripts/functional_test_runner --config test/saml_api_integration/config.js
```

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
