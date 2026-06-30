## How to run tests

First start the servers:

```bash
// ESS
node scripts/scout.js start-server --arch stateful --domain classic

// Serverless
node scripts/scout.js start-server --arch serverless --domain [search|observability_complete|security_complete]
```

Then you can run the tests in another terminal:

Some tests are designed to run sequentially:

````bash
# ESS
node scripts/playwright test --config x-pack/platform/plugins/shared/streams_app/test/scout/ui/playwright.config.ts --project=local --grep stateful-classic

Parallel lane (`parallel_tests/`):

```bash
# ESS
node scripts/playwright test --config x-pack/platform/plugins/shared/streams_app/test/scout/ui/parallel.playwright.config.ts --project=local --grep stateful-classic

Or via the Scout CLI:

```bash
node scripts/scout run-tests --arch stateful --domain classic \
  --config x-pack/platform/plugins/shared/streams_app/test/scout/ui/parallel.playwright.config.ts
````

Test results are available in `x-pack/platform/plugins/shared/streams_app/test/scout/ui/output`.
