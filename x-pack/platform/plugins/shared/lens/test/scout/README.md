# How to run Lens Scout tests

## Namespaces

The Lens Scout suite is split into [namespaces](https://www.elastic.co/docs/extend/kibana/testing/setup-scout#scout-namespaces) so that each Playwright config carries a homogeneous set of environment tags. Scout schedules environments per config rather than per test, so a config that mixes `@local-stateful-classic` with deployment-agnostic tests is spun up in every environment — including ones where the stateful-only tests can never run. Keeping the tags homogeneous is what stops the Flaky Test Runner from fanning a stateful-only suite out across four environments.

```
lens/test/scout/
├── common/ui/fixtures/   shared page objects, helpers, constants and archives
├── core/                 the Lens editor itself, plus the public visualizations API
├── open_in_lens/         agg-based and TSVB conversion into Lens
└── tsdb/                 time series / downsampled index behavior
```

`common/` holds no tests and no config; it only exists so the three namespaces can share fixtures. Each namespace re-exports it from its own `ui/fixtures/index.ts`, which is why specs import from `'../fixtures'` regardless of which namespace they live in.

| Config | Environments |
|---|---|
| `core/ui/parallel.playwright.config.ts` | stateful only |
| `core/ui/playwright.config.ts` | stateful only |
| `core/api/playwright.config.ts` | all |
| `open_in_lens/ui/parallel.playwright.config.ts` | all |
| `tsdb/ui/playwright.config.ts` | all |

When adding a spec, put it in the namespace whose tag set matches. A deployment-agnostic test added to `core/ui` would drag that config back into all four environments and undo the split.

## Running tests

Start the server once and leave it running:

```bash
node scripts/scout.js start-server --arch stateful --domain classic
```

Then run a config against it from another terminal:

```bash
# Lens editor, parallel
node scripts/playwright test --project local --config x-pack/platform/plugins/shared/lens/test/scout/core/ui/parallel.playwright.config.ts

# Lens editor, sequential (these override feature flags server-wide, so they cannot run in parallel)
node scripts/playwright test --project local --config x-pack/platform/plugins/shared/lens/test/scout/core/ui/playwright.config.ts

# Public visualizations API
node scripts/playwright test --project local --config x-pack/platform/plugins/shared/lens/test/scout/core/api/playwright.config.ts

# Open in Lens conversions
node scripts/playwright test --project local --config x-pack/platform/plugins/shared/lens/test/scout/open_in_lens/ui/parallel.playwright.config.ts

# TSDB
node scripts/playwright test --project local --config x-pack/platform/plugins/shared/lens/test/scout/tsdb/ui/playwright.config.ts
```

Add `--ui` to any of these to open the Playwright UI runner.

After moving or adding specs, refresh the generated manifests under each namespace's `.meta/`:

```bash
node scripts/scout update-test-config-manifests
```

## TSVB Open in Lens coverage notes

The TSVB Open in Lens Scout tests verify that TSVB panels convert correctly to Lens.

The non-dashboard TSVB conversion specs focus on conversion logic. The following dashboard persistence flows are tracked separately in `open_in_lens/ui/parallel_tests/tsvb/convert_from_dashboard.spec.ts`:

- Save and return to dashboard: does the converted panel persist after saving?
- Replace in dashboard: does the converted Lens panel replace the original TSVB panel?
- Save to library: can the converted visualization be saved as a library item?

The dashboard conversion spec is temporarily marked `fixme` while Scout stability is validated. The original stateful FTR suite was skipped for [#179307](https://github.com/elastic/kibana/issues/179307), while serverless FTR also covered these dashboard flows, so keep the skip temporary and confirm follow-up coverage before removing the old context.
