# Lens

## Testing

- Unit tests: `node scripts/jest --watch lens`
- Functional tests:
  - Run `node scripts/functional_tests_server`
  - Run `node ../scripts/functional_test_runner.js --config ./test/functional/config.js`
  - You may want to comment out all imports except for Lens in the config file.
