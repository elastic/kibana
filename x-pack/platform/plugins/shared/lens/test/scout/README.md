# How to run Lens Scout tests

## Namespaces

The Lens Scout suite is split into [namespaces](https://www.elastic.co/docs/extend/kibana/testing/setup-scout#scout-namespaces) so that each Playwright config carries a homogeneous set of environment tags.

```
lens/test/scout/
├── common/ui/fixtures/   shared page objects, helpers, constants and archives
├── core/                 the Lens editor itself, plus the public visualizations API
├── smokescreen/     critical Lens editor flows, meant to run on every deployment type
├── open_in_lens/         agg-based and TSVB conversion into Lens
└── tsdb/                 time series / downsampled index behavior
```

`common/` holds no tests and no config; it only exists so the four namespaces can share fixtures. Each namespace re-exports it from its own `ui/fixtures/index.ts`, which is why specs import from `'../fixtures'` regardless of which namespace they live in.

| Config | Environments |
|---|---|
| `core/ui/parallel.playwright.config.ts` | stateful only |
| `core/ui/playwright.config.ts` | stateful only |
| `core/api/playwright.config.ts` | all |
| `smokescreen/ui/parallel.playwright.config.ts` | stateful only, serverless to follow |
| `open_in_lens/ui/parallel.playwright.config.ts` | all |
| `tsdb/ui/playwright.config.ts` | all |

`smokescreen/` is the only namespace intended to grow beyond stateful: its specs will switch to `tags.deploymentAgnostic` once they have been verified on serverless. See [`smokescreen/README.md`](./smokescreen/README.md) for what belongs there.

## Running tests

### Stateful

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

# Smokescreen
node scripts/playwright test --project local --config x-pack/platform/plugins/shared/lens/test/scout/smokescreen/ui/parallel.playwright.config.ts

# Open in Lens conversions
node scripts/playwright test --project local --config x-pack/platform/plugins/shared/lens/test/scout/open_in_lens/ui/parallel.playwright.config.ts

# TSDB
node scripts/playwright test --project local --config x-pack/platform/plugins/shared/lens/test/scout/tsdb/ui/playwright.config.ts
```

Add `--ui` to any of these to open the Playwright UI runner.

### Serverless

Only the configs marked `all` in the table above have serverless coverage: `core/api`, `open_in_lens` and `tsdb`. The two `core/ui` configs and `smokescreen` are stateful-only, so they would match nothing here.

Start a project type — `search`, `observability_complete` or `security_complete`:

```bash
node scripts/scout.js start-server --arch serverless --domain search
```

Then run against it, passing the tag for the domain you started:

```bash
node scripts/playwright test --project local \
  --grep @local-serverless-search \
  --config x-pack/platform/plugins/shared/lens/test/scout/open_in_lens/ui/parallel.playwright.config.ts
```

`--grep` matters here in a way it doesn't on stateful. Playwright does not filter by tag on its own, and every Lens test carries `@local-stateful-classic`, so omitting it on stateful is harmless. On serverless it would also pick up the stateful-only specs, which are not meant to run there. Use `@local-serverless-observability_complete` or `@local-serverless-security_complete` for the other two domains.

`node scripts/scout.js run-tests --arch serverless --domain search --config <path>` boots the stack and applies the matching `--grep` for you, which is handy for a one-off run.

After moving or adding specs, refresh the generated manifests under each namespace's `.meta/`:

```bash
node scripts/scout update-test-config-manifests
```
