## How to run tests

First start the servers with

```bash
// ESS
node scripts/scout.js start-server --arch stateful --domain classic
```

Then you can run the tests multiple times in another terminal with:

```bash
// ESS
npx playwright test --config x-pack/platform/plugins/private/painless_lab/test/scout/ui/playwright.config.ts --project local --grep stateful-classic
```

Test results are available in `x-pack/platform/plugins/private/painless_lab/test/scout/ui/output`
