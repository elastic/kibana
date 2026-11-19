### Layout

The Entity Store API Scout tests are split into 4 independent namespaces, each with its own Playwright
config and its own ES+Kibana server, so they can run in parallel in CI instead of as one large sequential
config:

- `lifecycle/api` — install/start/stop/status/uninstall, privilege checks, metadata data stream, `remove_v1`
  saved-object cleanup.
- `crud_and_resolution/api` — entity CRUD API, manual/automated resolution, alias resolution, history
  snapshots.
- `query_translation/api` — DSL/ESQL/Painless query-translation parity tests.
- `logs_extraction/api` — logs-based entity extraction, including cross-cluster search, broken mappings,
  volume cap, and pagination.

Fixtures, helpers, and ES archives shared by more than one namespace live in `common/` (not itself a Scout
namespace — it has no `playwright.config.ts`) and are re-imported from every namespace that needs them
(e.g. `../../common/fixtures/constants`). Fixtures used by only one namespace stay colocated with that
namespace's own `api/fixtures/`.

### Running

Stop local running elasticsearch and kibana (the server brings it up)

Start the server for ECH stateful
```sh
node scripts/scout.js start-server --location local --arch stateful --domain classic
```

Or serverless security
```sh
node scripts/scout.js start-server --location local --arch serverless --domain security_complete
```

And then run one of the namespace configs, e.g.
```sh
node scripts/playwright test --config x-pack/platform/plugins/shared/entity_store/test/scout/lifecycle/api/playwright.config.ts --project=local
node scripts/playwright test --config x-pack/platform/plugins/shared/entity_store/test/scout/crud_and_resolution/api/playwright.config.ts --project=local
node scripts/playwright test --config x-pack/platform/plugins/shared/entity_store/test/scout/query_translation/api/playwright.config.ts --project=local
node scripts/playwright test --config x-pack/platform/plugins/shared/entity_store/test/scout/logs_extraction/api/playwright.config.ts --project=local
```

### Generating archives

```sh
node scripts/es_archiver.js save \
  x-pack/platform/plugins/shared/entity_store/test/scout/common/es_archives/updates \
  ".entities.v2.updates.*" --raw --keep-index-names \
    --es-url=http://elastic:changeme@localhost:9200 \
  --kibana-url=http://elastic:changeme@localhost:5601
```

:warn: Keep the mappings empty because it should be created by the entity store
