# How to run Lens Scout tests

## Running tests

Run the server

```bash
node scripts/scout.js start-server --arch stateful --domain classic
```

Then you can run the tests in another terminal

```bash
node scripts/playwright test --project local --grep @local-stateful-classic --config x-pack/platform/plugins/shared/lens/test/scout/ui/  --ui
```

You can run the parallel tests in another terminal

```bash
node scripts/playwright test --project local --grep @local-stateful-classic --config x-pack/platform/plugins/shared/lens/test/scout/ui/parallel.playwright.config.ts
```

## TSVB Open in Lens coverage notes

The TSVB Open in Lens Scout tests verify that TSVB panels convert correctly to Lens.

The non-dashboard TSVB conversion specs focus on conversion logic. The following dashboard persistence flows are tracked separately in `ui/parallel_tests/open_in_lens/tsvb/tsvb_dashboard_open_in_lens.spec.ts`:

- Save and return to dashboard: does the converted panel persist after saving?
- Replace in dashboard: does the converted Lens panel replace the original TSVB panel?
- Save to library: can the converted visualization be saved as a library item?

