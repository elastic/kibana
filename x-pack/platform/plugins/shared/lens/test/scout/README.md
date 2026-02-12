# Lens Scout tests

This directory contains Scout tests for the Lens plugin.

## Running the tests

### Run server
```
node scripts/scout.js start-server --stateful
```

### Run tests
```
npx playwright test --project local --grep @ess --config x-pack/platform/plugins/shared/lens/test/scout/ui/  --ui
```