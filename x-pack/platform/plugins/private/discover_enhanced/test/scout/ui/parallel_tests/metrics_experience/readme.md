# Metrics Experience E2E Tests

Scout UI tests for the Metrics in Discover feature.

We follow Scout Best Practices for test structure and conventions.

## Key decisions

- **Tests close to Discover**: We keep tests in `discover_enhanced` because Metrics in Discover is part of the Discover experience and reuses the existing Scout config, fixtures, and setup. If needed, we can split in the future.
- **Feature subfolder** (`metrics_experience/`): Groups related specs together.
- **Page object** (`MetricsExperiencePage`): Centralized locators and actions. Reusable across future specs (flyout, charts, breakdown). Avoids duplicating selectors.
- **`spaceTest` for parallel isolation**: Each spec runs in its own Kibana space, enabling `workers: 2` without conflicts.
- **`test.step()` for multi-step flows**: Groups related assertions within a single test. Note: steps are NOT visible in the Scout dashboard; only suite/test titles appear.
- **Global setup for data**: ES archives and the dynamic test index are loaded in `global.setup.ts`, not in individual specs. This prevents stability issues when parallel tests create/delete indexes or ingest data against the same ES instance.
- **Tags**: Tests are tagged with `METRICS_EXPERIENCE_TAGS` (`stateful.all` + `serverless.observability.complete` + `serverless.security.complete`).

## Reference PRs

- [PR #252738](https://github.com/elastic/kibana/pull/252738): Scout setup, grid activation tests
- [PR #253076](https://github.com/elastic/kibana/pull/253076): Grid navigation (pagination, search)

## Folder structure

```
discover_enhanced/test/scout/ui/
├── fixtures/                        # Shared across all discover_enhanced tests
│   ├── constants.ts                 # Time ranges, queries, data views, tags
│   ├── page_objects/
│   │   └── metrics_experience.ts    # Page object for metrics UI
│   └── generators/
│       └── metrics_tsdb_index.ts    # Dynamic TSDB index creation
├── parallel_tests/
│   ├── global.setup.ts              # Loads archives + creates test index
│   └── metrics_experience/          # Feature subfolder (you are here)
│       ├── grid.spec.ts             # Grid activation, command compatibility, chart actions
│       ├── grid.navigation.spec.ts  # Pagination and search
│       └── insights_flyout.spec.ts  # Flyout tabs, content, dimensions pagination
```

## Data strategy

Two approaches are used:

- **Static data** (`TSDB_LOGS` archive): For `grid.spec.ts`. Enough for grid activation and chart actions tests. No dynamic data generation needed, uses the shared archive loaded in global setup.
- **Dynamic data** (`test-metrics-experience` index): For `grid.navigation.spec.ts` and `insights_flyout.spec.ts`. Contains enough metrics to fill multiple pages and 30 dimensions to trigger flyout pagination. Created via `metrics_tsdb_index.ts` generator. Handles parallel creation races with `resource_already_exists_exception`.

## How to add a new test

1. Decide if it fits in an existing spec or needs a new one
2. Use the page object (`MetricsExperiencePage`) for locators. Add new ones there if needed.
3. Add constants to `constants.ts`
4. If custom data is needed, extend the generator or create a new one
5. Use `spaceTest.step()` for multi-step journeys within a single test
6. Tag your test with `testData.METRICS_EXPERIENCE_TAGS` to ensure it runs in the correct environments

## Detecting flaky tests

When adding or modifying tests, run the flaky test runner to verify stability before merging. Trigger it via a PR comment:

```
/flaky scoutConfig:<scout config path>:<retry count>
```

For the metrics experience tests:

```
/flaky scoutConfig:x-pack/platform/plugins/private/discover_enhanced/test/scout/ui/parallel.playwright.config.ts:30
```

25-30 runs is considered safe to call tests "stable". See [example in PR #253076](https://github.com/elastic/kibana/pull/253076#issuecomment-3913203928) where 30/30 runs passed.

## Running tests locally

First, start a server in a separate terminal. Use stateful OR serverless depending on which environment you want to test:

```bash
# For stateful tests
node scripts/scout start-server --arch stateful --domain classic

# For serverless observability tests
node scripts/scout start-server --arch serverless --domain observability_complete
```

Then, in another terminal, run the tests:

```bash
npx playwright test \
  x-pack/platform/plugins/private/discover_enhanced/test/scout/ui/parallel_tests/metrics_experience/ \
  --config x-pack/platform/plugins/private/discover_enhanced/test/scout/ui/parallel.playwright.config.ts \
  --project local --trace on
```
