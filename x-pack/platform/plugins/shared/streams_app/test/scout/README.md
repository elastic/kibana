## How to run tests

First start the servers:

```bash
// ESS
node scripts/scout.js start-server --stateful

// Serverless
node scripts/scout.js start-server --serverless=[es|oblt|security]
```

Then you can run the tests in another terminal:

Some tests are designed to run sequentially:

```bash
// ESS
npx playwright test --config x-pack/platform/plugins/shared/streams_app/test/scout/ui/playwright.config.ts --project=local --grep @ess

// Serverless
npx playwright test --config x-pack/platform/plugins/shared/streams_app/test/scout/ui/playwright.config.ts --project=local --grep @svlOblt
```

Test results are available in `x-pack/platform/plugins/shared/streams_app/test/scout/ui/output`
