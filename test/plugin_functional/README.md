# Plugin Functional Tests

This folder contains plugin functional tests, i.e. functional tests that should be executed
against a Kibana instance with specific test plugins available.

To add a plugin to the instance, just place the plugin folder in the `plugins`
directory.

Add new test suites into the `test_suites` folder and reference them from the
`config.js` file. These test suites work the same as regular functional test
except that they are executed against a Kibana with all plugins (from the
`plugins` directory) installed.

## Run the test

To run these tests during development you can use the following commands:

```
# Start the test server (can continue running)
node scripts/functional_tests_server.js --config test/plugin_functional/config.js
# Start a test run
node scripts/functional_test_runner.js --config test/plugin_functional/config.js
```

## Run Kibana with a test plugin

In case you want to start Kibana with one of the test plugins (e.g. for developing the
test plugin), you can just run:

```
yarn start --plugin-path=test/plugin_functional/plugins/<plugin_folder>
```

If you wish to start Kibana with multiple test plugins, you can run:

```
yarn start --plugin-path=test/plugin_functional/plugins/<plugin_folder1> --plugin-path=test/plugin_functional/plugins/<plugin_folder2> ... 
```

If you wish to load up specific es archived data for your test, you can do so via the `es_archiver` script detailed in the [Scripts README.md](../../scripts/README.md#es-archiver) 

Another option, which will automatically use any specific settings the test environment may rely on, is to boot up the functional test server pointing to the plugin configuration file.

```
node scripts/functional_tests_server --config test/plugin_functional/config.js
```

*Note:* you may still need to use the es_archiver script to boot up any required data.
