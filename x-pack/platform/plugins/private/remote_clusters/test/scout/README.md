# Remote Clusters Scout tests

UI tests for the Remote Clusters management app:

- `ui/tests/remote_clusters_crud.spec.ts` — walks the add-cluster wizard from the empty-list prompt through submit, with a11y checks at each step.
- `ui/tests/remote_clusters_edit_delete.spec.ts` — list, details, edit, and delete flows for sniff- and proxy-mode clusters, with a11y checks merged in.

Local stateful only: the Remote Clusters UI is disabled on serverless.

## How to run tests

First start the servers with

```bash
# ESS
node scripts/scout.js start-server --arch stateful --domain classic
```

Then run the tests in another terminal with:

```bash
# ESS
node scripts/playwright test --config x-pack/platform/plugins/private/remote_clusters/test/scout/ui/playwright.config.ts --project local --grep stateful-classic
```

To check for flakiness, run the suite repeatedly (e.g. x30):

```bash
node scripts/playwright test --config x-pack/platform/plugins/private/remote_clusters/test/scout/ui/playwright.config.ts --project local --grep stateful-classic --repeat-each 30
```

Test results are available in `x-pack/platform/plugins/private/remote_clusters/test/scout/ui/output`
