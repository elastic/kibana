# @kbn/evals-suite-streams

## Running the suite

Start scout:

```bash
node scripts/scout.js start-server --stateful
```

Now run the tests exactly like a normal Scout/Playwright suite in another terminal:

```bash
node scripts/playwright test --config x-pack/platform/packages/shared/kbn-evals-suite-streams/playwright.config.ts
```
