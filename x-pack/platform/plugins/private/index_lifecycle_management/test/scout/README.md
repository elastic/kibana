# Index Lifecycle Management Scout tests

Scout tests for the Index Lifecycle Management plugin (stateful only: ILM is disabled on serverless).

## UI tests

- `ui/tests/ilm_home_page.spec.ts` — the page header and Create policy button for a `manage_ilm` user, and creating a multi-phase policy that then shows in the list.
- `ui/tests/ilm_duplicate_managed_policy.spec.ts` — cloning a managed policy does not carry over the managed flag.
- `ui/tests/ilm_read_only_view.spec.ts` — a `read_ilm` user sees the policy list and detail flyout but cannot create policies.

## API tests

Cover the `api/index_lifecycle_management/*` routes (migrated from `x-pack/platform/test/api_integration/apis/management/index_lifecycle_management`):

- `api/tests/policies.spec.ts` — policy list (linked and hidden indices), create, edit (`_meta` preserved), delete, and 403 without `manage_ilm`.
- `api/tests/policies_searchable_snapshots.spec.ts` — creating a policy with searchable snapshot actions (`fs` repository locally, `found-snapshots` on Cloud).
- `api/tests/templates.spec.ts` — legacy template list, system template filtering, adding a policy to a template.
- `api/tests/indices.spec.ts` — adding, removing and retrying a policy on an index.
- `api/tests/explain.spec.ts` — hidden indices in the explain response.
- `api/tests/nodes.spec.ts` — node list and details by custom node attribute (local only).
- `api/tests/snapshot_policies.spec.ts` — SLM policy list with a policy it creates (local only).
- `api/tests/snapshot_repositories.spec.ts` — snapshot repository list with a repository it creates (local only).
- `api/tests/snapshot_repositories_cloud.spec.ts` — the managed `found-snapshots` repository is listed (Cloud only).

The local-only specs need a custom node attribute or `fs` repositories, neither of which Cloud allows.

The empty-list responses of the snapshot policies and repositories routes are covered by Jest route tests in `server/routes/api/snapshot_policies/register_fetch_route.test.ts` and `server/routes/api/snapshot_repositories/register_fetch_route.test.ts`, because a Scout test cannot assume a cluster with no SLM policies or repositories.

## How to run tests

First start the servers with:

```bash
node scripts/scout start-server --arch stateful --domain classic
```

Then run the tests in another terminal with:

```bash
# UI tests
node scripts/playwright test --config x-pack/platform/plugins/private/index_lifecycle_management/test/scout/ui/playwright.config.ts --project local --grep @local-stateful-classic

# API tests
node scripts/playwright test --config x-pack/platform/plugins/private/index_lifecycle_management/test/scout/api/playwright.config.ts --project local --grep @local-stateful-classic
```

Or run a full cycle (boots servers + runs tests) with:

```bash
node scripts/scout run-tests --arch stateful --domain classic --config x-pack/platform/plugins/private/index_lifecycle_management/test/scout/api/playwright.config.ts
```

Test results are available under the `.scout/` folder next to each Playwright config.
