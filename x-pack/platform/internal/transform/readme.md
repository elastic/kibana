# Documentation for Transforms UI developers

This plugin provides access to the transforms features provided by Elastic.

## Requirements

To use the transforms feature, you must have at least a Basic license. For more 
info, refer to 
[Set up transforms](https://www.elastic.co/guide/en/elasticsearch/reference/current/transform-setup.html).


## Setup local environment

### Kibana

1. Fork and clone the [Kibana repo](https://github.com/elastic/kibana).

1. Install `nvm`, `node`, `yarn` (for example, by using Homebrew). See 
   [Install dependencies](https://www.elastic.co/guide/en/kibana/master/development-getting-started.html#_install_dependencies).

1. Make sure that Elasticsearch is deployed and running on `localhost:9200`.

1. Navigate to the directory of the `kibana` repository on your machine.

1. Fetch the latest changes from the repository.

1. Checkout the branch of the version you want to use. For example, if you want 
   to use a 7.9 version, run `git checkout 7.9`. (Your Elasticsearch and Kibana 
   instances need to be the same version.)

1. Run `nvm use`. The response shows the Node version that the environment uses. 
   If you need to update your Node version, the response message contains the 
   command you need to run to do it.

1. Run `yarn kbn bootstrap`. It takes all the dependencies in the code and 
   installs/checks them. It is recommended to use it every time when you switch 
   between branches.

1. Make a copy of `kibana.yml` and save as `kibana.dev.yml`. (Git will not track
   the changes in `kibana.dev.yml` but yarn will use it.)
   
1. Provide the appropriate password and user name in `kibana.dev.yml`.

1. Run `yarn start` to start Kibana.

1. Go to http://localhost:560x/xxx (check the terminal message for the exact 
   path).

For more details, refer to this [getting started](https://www.elastic.co/guide/en/kibana/master/development-getting-started.html) page.

### Adding sample data to Kibana

Kibana has sample data sets that you can add to your setup so that you can test 
different configurations on sample data.

1. Click the Elastic logo in the upper left hand corner of your browser to 
   navigate to the Kibana home page.

1. Click *Load a data set and a Kibana dashboard*.

1. Pick a data set or feel free to click *Add* on all of the available sample 
   data sets.

These data sets are now ready to be used for creating transforms in Kibana.

## Running tests

### Jest tests

Documentation: https://www.elastic.co/guide/en/kibana/current/development-tests.html#_unit_testing

Run the test following jest tests from `kibana/x-pack/plugins/transform.

New snapshots, all plugins:   

```
yarn test:jest
```
 
Update snapshots for the transform plugin: 

```
yarn test:jest -u
```

Update snapshots for a specific directory only: 

```
yarn test:jest public/app/sections
```

Run tests with verbose output: 

```
yarn test:jest --verbose
```

### Functional tests

Before running the test server, make sure to quit all other instances of 
Elasticsearch.

Run the following commands from the `x-pack` directory and use separate terminals
for test server and test runner. The test server command starts an Elasticsearch
and Kibana instance that the tests will be run against.

Functional tests are broken up into independent groups with their own configuration.
Test server and runner need to be pointed to the configuration to run. The basic
commands are

    node scripts/functional_tests_server.js --config PATH_TO_CONFIG
    node scripts/functional_test_runner.js --config PATH_TO_CONFIG

With PATH_TO_CONFIG and other options as follows.

1. Functional UI tests with `Trial` license:

    Group | PATH_TO_CONFIG
    ----- | --------------
    creation - index pattern | `test/functional/apps/transform/creation/index_pattern/config.ts`
    creation - runtime mappings, saved searches | `test/functional/apps/transform/creation/runtime_mappings_saved_search/config.ts`
    edit, clone | `test/functional/apps/transform/edit_clone/config.ts`
    feature controls | `test/functional/apps/transform/feature_controls/config.ts`
    permissions | `test/functional/apps/transform/permissions/config.ts`
    actions | `test/functional/apps/transform/actions/config.ts`

1.  Functional UI tests with `Basic` license:

    Group | PATH_TO_CONFIG
    ----- | --------------
    creation - index pattern | `test/functional_basic/apps/transform/creation/index_pattern/config.ts`
    creation - runtime mappings, saved searches | `test/functional_basic/apps/transform/creation/runtime_mappings_saved_search/config.ts`
    edit, clone | `test/functional_basic/apps/transform/edit_clone/config.ts`
    feature controls | `test/functional_basic/apps/transform/feature_controls/config.ts`
    permissions | `test/functional_basic/apps/transform/permissions/config.ts`
    actions | `test/functional_basic/apps/transform/actions/config.ts`

1. API integration tests with `Trial` license:

    - PATH_TO_CONFIG: `test/api_integration/apis/transform/config.ts`

1. API integration tests with `Basic` license:

    - PATH_TO_CONFIG: `test/api_integration_basic/config.ts`
    - Add `--include-tag transform` to the test runner command
   
1.  Accessibility tests:

    We maintain a suite of accessibility tests (you may see them referred to elsewhere as `a11y` tests). These tests render each of our pages and ensure that the inputs and other elements contain the attributes necessary to ensure all users are able to make use of Transforms (for example, users relying on screen readers).

         node scripts/functional_tests_server --config test/accessibility/config.ts
         node scripts/functional_test_runner.js --config test/accessibility/config.ts --grep=transform

    Transform accessibility tests are located in `x-pack/test/accessibility/apps/group2`.
