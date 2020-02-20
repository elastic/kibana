# Interpreter Functional Tests

This folder contains interpreter functional tests.

Add new test suites into the `test_suites` folder and reference them from the
`config.ts` file. These test suites work the same as regular functional test.

## Run the test

To run these tests during development you can use the following commands:

```
# Start the test server (can continue running)
node scripts/functional_tests_server.js --config test/interpreter_functional/config.ts

# Start a test run
node scripts/functional_test_runner.js --config test/interpreter_functional/config.ts
```

# Writing tests

Look into test_suites/run_pipeline/basic.ts for examples

to update baseline screenshots and snapshots run with:

```
node scripts/functional_test_runner.js --config test/interpreter_functional/config.ts --updateBaselines
```
