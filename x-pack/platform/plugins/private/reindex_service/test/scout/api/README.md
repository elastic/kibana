# Reindex Service Scout API tests

- `tests/reindexing.spec.ts` — single-index reindex flows (create, settings parity, resume a
  paused operation, alias propagation, lookup-mode index, keep-old-index).
- `tests/batch_reindexing.spec.ts` — the batch reindex endpoint (`/batch`, `/batch/queue`),
  including a source index that starts closed.

The specs run on the default Scout servers and are tagged `stateful.classic`: they manipulate the
`.kibana` system index directly (seeding a paused reindex operation and cleaning operations up),
which is not available on serverless. The reindex-operation saved object is a hidden type with no
HTTP API for the paused-op setup, so those reads/writes use a `system_indices_superuser` client
(see `fixtures/helpers.ts`).

## Run

Local stateful:

```bash
node scripts/scout.js run-tests --arch stateful --domain classic \
  --config x-pack/platform/plugins/private/reindex_service/test/scout/api/playwright.config.ts
```

Or via the flaky test runner by commenting on a PR:

```
/flaky scoutConfig:x-pack/platform/plugins/private/reindex_service/test/scout/api/playwright.config.ts:25
```
