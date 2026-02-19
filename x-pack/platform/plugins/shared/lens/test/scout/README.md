# Lens Scout tests

This directory contains Scout tests for the Lens plugin.

## Running the tests

### Run server
```
node scripts/scout.js start-server --arch stateful --domain classic
```

### Run tests
```
npx playwright test --project local --grep @local-stateful-classic --config x-pack/platform/plugins/shared/lens/test/scout/ui/  --ui
```