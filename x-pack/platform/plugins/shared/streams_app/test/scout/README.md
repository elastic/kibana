## How to run tests

First start the servers:

```bash
// ESS
node scripts/scout.js start-server --stateful

// Serverless
node scripts/scout.js start-server --serverless=[es|oblt|security]
```

Then you can run the tests in another terminal.

### Running all tests (sequential)

To run all tests with a single config:

```bash
// ESS
npx playwright test --config x-pack/platform/plugins/shared/streams_app/test/scout/ui/playwright.config.ts --project=local --grep @ess

// Serverless
npx playwright test --config x-pack/platform/plugins/shared/streams_app/test/scout/ui/playwright.config.ts --project=local --grep @svlOblt
```

### Running sharded tests (faster CI execution)

Tests are split into 4 shards for faster CI execution. Each shard runs in a separate CI job with its own ES/Kibana instance.

| Config | Tests | Description |
|--------|-------|-------------|
| `core.playwright.config.ts` | 5 files | Enable/disable wired streams, list view |
| `routing.playwright.config.ts` | 9 files | Data routing rules, AI suggestions |
| `processing.playwright.config.ts` | 11 files | Data processing, pipeline suggestions |
| `schema.playwright.config.ts` | 12 files | Data retention, schema mapping, quality |

To run a specific shard locally:

```bash
// Core tests (enable/disable, list view)
npx playwright test --config x-pack/platform/plugins/shared/streams_app/test/scout/ui/core.playwright.config.ts --project=local --grep @ess

// Routing tests (routing rules, AI suggestions)
npx playwright test --config x-pack/platform/plugins/shared/streams_app/test/scout/ui/routing.playwright.config.ts --project=local --grep @ess

// Processing tests (processors, simulation)
npx playwright test --config x-pack/platform/plugins/shared/streams_app/test/scout/ui/processing.playwright.config.ts --project=local --grep @ess

// Schema tests (retention, mapping, quality)
npx playwright test --config x-pack/platform/plugins/shared/streams_app/test/scout/ui/schema.playwright.config.ts --project=local --grep @ess
```

For Serverless, replace `--grep @ess` with `--grep @svlOblt`.

### Why sharding?

Streams tests cannot run in parallel within a single Kibana instance because:

1. **Global lock** - All stream mutations go through a single `streams/apply_changes` lock
2. **Shared state** - Streams are global (not space-scoped) resources
3. **Lock contention** - Parallel tests would serialize at the lock level anyway

Sharding solves this by giving each shard its own ES/Kibana cluster, eliminating lock contention entirely.

### Test results

Test results are available in `x-pack/platform/plugins/shared/streams_app/test/scout/ui/.scout/`
