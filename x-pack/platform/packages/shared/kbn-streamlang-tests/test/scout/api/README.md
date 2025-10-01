## How to run tests

First start the servers with

```bash
// ESS
node scripts/scout.js start-server --stateful

// Serverless
node scripts/scout.js start-server --serverless=[es|oblt|security]
```

Then you can run the tests multiple times in another terminal with:

```bash
// ESS
npx playwright test --config x-pack/platform/packages/shared/kbn-streamlang-tests/test/scout/api/playwright.config.ts --project local --grep @ess

// Serverless
npx playwright test --config x-pack/platform/packages/shared/kbn-streamlang-tests/test/scout/api/playwright.config.ts --project local --grep @svl
```

Test results are available in `x-pack/platform/packages/shared/kbn-streamlang-tests/scout/api/output`
