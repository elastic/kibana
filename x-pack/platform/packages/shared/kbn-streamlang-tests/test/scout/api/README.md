## How to run tests

First start the servers with

```bash
// ESS
node scripts/scout.js start-server --arch stateful --domain classic

// Serverless
node scripts/scout.js start-server --arch serverless --domain [search|observability_complete|security_complete]
```

Then you can run the tests multiple times in another terminal with:

```bash
// ESS
npx playwright test --config x-pack/platform/packages/shared/kbn-streamlang-tests/test/scout/api/playwright.config.ts --project local --grep stateful-classic

// Serverless
npx playwright test --config x-pack/platform/packages/shared/kbn-streamlang-tests/test/scout/api/playwright.config.ts --project local --grep serverless
```

Test results are available in `x-pack/platform/packages/shared/kbn-streamlang-tests/scout/api/output`
