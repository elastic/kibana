## Test layout

The Scout UI suite for `streams_app` is split into two lanes that run as
separate Buildkite jobs concurrently. Both lanes use `workers: 1` (no
within-lane parallelism). The split exists to keep the suite off the CI
critical path.

```
ui/
├── playwright.config.ts            # sequential lane, ./tests
├── parallel.playwright.config.ts   # second lane, ./parallel_tests
├── tests/                          # 22 specs — see "What lives in tests/"
└── parallel_tests/                 # 34 specs — everything else
```

### What lives in `tests/`

Clusters that mutate global stream/routing state aggressively. Keeping them
together avoids cross-lane contamination of `logs.otel` children and shared
fixtures:

- `data_management/data_mapping/` — `clearStreamChildren('logs.otel')`,
  shared `logs.otel.parent`
- `data_management/data_quality.spec.ts` — `clearStreamChildren` +
  shared `logs.otel.nginx` fork
- `data_management/data_retention/` — shared `logs.otel.nginx` fork across
  the cluster (consolidated in PR #266329 as a `beforeAll` optimization)
- `data_management/data_routing/` — `clearStreamChildren` calls + the
  AI-suggestions sub-cluster (shared LLM proxy + connector setup)
- `enable_wired_streams_flow*.spec.ts` — flips global wired-streams mode

### What lives in `parallel_tests/`

Everything else — clusters with per-spec scoped state and proper `afterAll`
cleanup. Default lane for new work.

## Where to add new tests

**Rule:** find your feature's existing test directory and put your new spec
next to its siblings. The directory's lane is already determined.

**Adding a brand-new feature directory** (no existing siblings):
default to `parallel_tests/`. Move to `tests/` only if your tests need
exclusive access to global Kibana state — feature-flag toggles, mode flips,
bulk routing wipes (`clearStreamChildren`), or shared per-cluster fixtures.

**Cleanup expectation either lane:** every spec must clean up in `afterAll`
(or `afterEach`), not only in `beforeEach`. Documented in PR #242672 — required
for both lanes since file execution order is not guaranteed.

## How to run tests

First start the servers:

```bash
# ESS
node scripts/scout.js start-server --arch stateful --domain classic

# Serverless
node scripts/scout.js start-server --arch serverless --domain [search|observability_complete|security_complete]
```

Then run the tests in another terminal. Pick the config matching the lane you
want to run.

Sequential lane (`tests/`):

```bash
# ESS
npx playwright test --config x-pack/platform/plugins/shared/streams_app/test/scout/ui/playwright.config.ts --project=local --grep stateful-classic

# Serverless
npx playwright test --config x-pack/platform/plugins/shared/streams_app/test/scout/ui/playwright.config.ts --project=local --grep serverless-observability
```

Parallel lane (`parallel_tests/`):

```bash
# ESS
npx playwright test --config x-pack/platform/plugins/shared/streams_app/test/scout/ui/parallel.playwright.config.ts --project=local --grep stateful-classic

# Serverless
npx playwright test --config x-pack/platform/plugins/shared/streams_app/test/scout/ui/parallel.playwright.config.ts --project=local --grep serverless-observability
```

Or via the Scout CLI:

```bash
node scripts/scout run-tests --arch stateful --domain classic \
  --config x-pack/platform/plugins/shared/streams_app/test/scout/ui/parallel.playwright.config.ts
```

Test results are available in `x-pack/platform/plugins/shared/streams_app/test/scout/ui/output`.
