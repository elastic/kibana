# Rollup Scout tests

UI tests for the Rollup Jobs management app (a deprecated, stateful-only feature):

- `ui/tests/rollup_jobs_wizard.spec.ts` — walks the create-rollup-job wizard from the empty-list deprecation prompt through save, and lists the new job, with a11y checks at each step.
- `ui/tests/hybrid_data_view.spec.ts` — creates a rollup data view over a regular + rollup index, and one over an alias to the rollup index, asserting the Rollup badge and the exposed fields.
- `ui/tests/tsvb.spec.ts` — a TSVB Metric panel reads a rollup index by name (`metrics:allowStringIndices`) and renders the rolled-up doc count.

Local + cloud stateful only: the Rollup UI does not exist on serverless.

De-scoped from the FTR suites:

- The CCS variant of the wizard test stays in FTR (`x-pack/platform/test/functional/apps/rollup_job/rollup_jobs.js`, run via `config.ccs.ts`) until Scout supports a real remote cluster — a self-referential remote can't detect `remote:pattern` mishandling, since the same indices also resolve locally. Tracked in elastic/kibana#281791.

## How to run tests

First start the servers with

```bash
node scripts/scout.js start-server --arch stateful --domain classic
```

Then run the tests in another terminal with:

```bash
node scripts/playwright test --config x-pack/platform/plugins/private/rollup/test/scout/ui/playwright.config.ts --project local --grep stateful-classic
```

Test results are available in `x-pack/platform/plugins/private/rollup/test/scout/ui/output`
