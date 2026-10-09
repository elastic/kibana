## Test layout

The Scout UI suite for `streams_app` is split into **8 namespaces**, one per
feature area. Each namespace is an independent, auto-discovered Playwright
config (`<namespace>/ui/playwright.config.ts`) with its own `.meta` manifest
and CI scheduling unit. There is no within-namespace parallelism
(`workers: 1`, the default) — the namespaces exist to give CI independent
scheduling/retry/selective-testing units and CODEOWNERS a directory to own,
not to run tests concurrently.

```
test/scout/
├── common/ui/{fixtures,page_objects}/   # shared fixtures, NOT a namespace (no playwright.config.ts)
├── processing/ui/     14 specs   data processing / enrichment pipeline
├── routing/ui/         9 specs   data routing / partitioning (incl. AI suggestions)
├── lifecycle/ui/      10 specs   data retention — owned by @elastic/kibana-management
├── data_quality/ui/    1 spec    data quality tab — owned by @elastic/kibana-management
├── schema/ui/          3 specs   data mapping / schema editor
├── query_streams/ui/  11 specs   query streams (stateful-classic only)
├── core/ui/            9 specs   enablement, layout shell, list view, stream detail chrome
└── integrations/ui/    4 specs   cross-app surfaces (Discover, ES|QL, TSDB)
```

Each namespace has a single `tests/` directory and a single
`playwright.config.ts`. `global.setup.ts` / `global.teardown.ts` inside each
`tests/` dir enable/disable streams once per namespace run.

### Where to add new tests

**Rule:** find your feature's existing namespace and put your new spec next
to its siblings.

**No obvious namespace fits?** Default to `core/`. It is the base-app
namespace (the same role Discover's `core` namespace plays) and is meant to
be re-split into a new namespace once a sub-area grows past roughly a dozen
specs — don't let it silently regrow into a catch-all.

**Cleanup expectation:** every spec must clean up in `afterAll` (or
`afterEach`), not only in `beforeEach` — required since file execution order
within a namespace is not guaranteed.

**Shared fixtures** (`generators.ts`, `ai_suggestions_helpers.ts`,
`llm_proxy.ts`, the merged `test` fixture, `page_objects/`) live in
`common/ui/fixtures`. Each namespace's `ui/fixtures/index.ts` re-exports them
(`export * from '../../../common/ui/fixtures'`); namespace-specific helpers
(e.g. `lifecycle/ui/fixtures/data_lifecycle_helpers.ts`) live next to the
specs that use them.

## How to run tests

First start the server:

```bash
# ESS
node scripts/scout.js start-server --arch stateful --domain classic

# Serverless
node scripts/scout.js start-server --arch serverless --domain [search|observability_complete|security_complete]
```

Then run the tests in another terminal. Pick the config matching the namespace
you want to run — every namespace has exactly one config at
`test/scout/<namespace>/ui/playwright.config.ts`, where `<namespace>` is one of
`processing`, `routing`, `lifecycle`, `data_quality`, `schema`, `query_streams`,
`core`, `integrations`. `query_streams` only has stateful-classic specs, so it
is a no-op under `--grep serverless-observability`.

```bash
# ESS
node scripts/playwright test --config x-pack/platform/plugins/shared/streams_app/test/scout/<namespace>/ui/playwright.config.ts --project=local --grep stateful-classic

# Serverless
node scripts/playwright test --config x-pack/platform/plugins/shared/streams_app/test/scout/<namespace>/ui/playwright.config.ts --project=local --grep serverless-observability
```

For example, to run the routing specs against ESS:

```bash
node scripts/playwright test --config x-pack/platform/plugins/shared/streams_app/test/scout/routing/ui/playwright.config.ts --project=local --grep stateful-classic
```

Or via the Scout CLI:

```bash
node scripts/scout run-tests --arch stateful --domain classic \
  --config x-pack/platform/plugins/shared/streams_app/test/scout/routing/ui/playwright.config.ts
```

Test results are available in
`x-pack/platform/plugins/shared/streams_app/test/scout/<namespace>/ui/.scout/reports`,
with screenshots, videos and traces in the sibling `.scout/test-artifacts`.
