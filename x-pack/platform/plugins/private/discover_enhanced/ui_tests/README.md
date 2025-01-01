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
npx playwright test --config x-pack/platform/plugins/private/discover_enhanced/ui_tests/playwright.config.ts --grep @ess

// Serverless
npx playwright test --config x-pack/platform/plugins/private/discover_enhanced/ui_tests/playwright.config.ts --grep @svlSearch

// @svlOblt, @svlSecurity
```

Test results are available in `x-pack/platform/plugins/private/discover_enhanced/ui_tests/output`
