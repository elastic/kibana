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

The non-dashboard TSVB conversion specs focus on conversion logic. The following dashboard persistence flows are tracked separately in `ui/parallel_tests/open_in_lens/tsvb/convert_from_dashboard.spec.ts`:

- Save and return to dashboard: does the converted panel persist after saving?
- Replace in dashboard: does the converted Lens panel replace the original TSVB panel?
- Save to library: can the converted visualization be saved as a library item?

The dashboard conversion spec is temporarily marked `fixme` while Scout stability is validated. The original stateful FTR suite was skipped for [#179307](https://github.com/elastic/kibana/issues/179307), while serverless FTR also covered these dashboard flows, so keep the skip temporary and confirm follow-up coverage before removing the old context.
