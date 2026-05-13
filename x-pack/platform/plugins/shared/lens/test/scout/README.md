# How to run Lens Scout tests


Run the server

```bash
node scripts/scout.js start-server --arch stateful --domain classic
```

Then you can run the tests in another terminal

```bash
npx playwright test --project local --grep @local-stateful-classic --config x-pack/platform/plugins/shared/lens/test/scout/ui/  --ui
```

You can run the parallel tests in another terminal

```bash
npx playwright test --project local --grep @local-stateful-classic --config x-pack/platform/plugins/shared/lens/test/scout/ui/parallel.playwright.config.ts
```
