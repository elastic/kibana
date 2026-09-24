# Snapshot and Restore Scout tests

Scout tests for the Snapshot and Restore management app.

## UI tests

- `ui/tests/home_page.spec.ts` — repository details flyout cleanup flow.
- `ui/tests/home_page_empty_state.spec.ts` — empty state (no repositories registered).
- `ui/tests/restore_form.spec.ts` — restore wizard rendering.
- `ui/tests/logsdb_snapshot_restore.spec.ts` — create SLM policy, run it, verify a logsdb snapshot, and restore with rename.
- `ui/tests/source_only_logsdb.spec.ts` — source-only logsdb snapshot (partial) and restore rejection.
- `ui/tests/a11y.spec.ts` — accessibility checks across tabs, tables, and the create-policy wizard.

## API tests

- `api/tests/repositories.spec.ts` — `GET /api/snapshot_restore/repository_types` (module-only types `azure`/`gcs`/`s3`; the Scout stateful cluster runs cloud-enabled, so the on-prem `fs`/`url` types are not offered).
- `api/tests/policies.spec.ts` — SLM policy create/update and SLM status (`POST`/`PUT /policies`, `GET /policies/slm_status`). Local + Cloud: registers an `fs` repository locally, reuses the managed `found-snapshots` repository on Cloud.
- `api/tests/snapshots.spec.ts` — `GET /api/snapshot_restore/snapshots` pagination, sorting, and search, plus `POST /api/snapshot_restore/snapshots/bulk_delete`. Local only: relies on `fs` repositories.

## How to run tests

First start the servers with:

```bash
# ESS (stateful)
node scripts/scout.js start-server --arch stateful --domain classic
```

Then run the tests in another terminal with:

```bash
# UI tests
node scripts/playwright test --config x-pack/platform/plugins/private/snapshot_restore/test/scout/ui/playwright.config.ts --project local --grep stateful-classic

# API tests
node scripts/playwright test --config x-pack/platform/plugins/private/snapshot_restore/test/scout/api/playwright.config.ts --project local --grep stateful-classic
```

Or run a full cycle (boots servers + runs tests) with:

```bash
node scripts/scout run-tests --arch stateful --domain classic --config x-pack/platform/plugins/private/snapshot_restore/test/scout/api/playwright.config.ts
```
