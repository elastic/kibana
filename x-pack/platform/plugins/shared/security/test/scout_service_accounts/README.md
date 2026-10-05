# Service account Serverless regression tests

These tests use real Elasticsearch and local UIAM through the `service_accounts`
Scout server configuration. Role loading and service account responses are not mocked.

- UI: opens the creation flyout, loads and selects multiple roles, checks that
  Serverless omits the description field, and cancels. Runs on Security and Search.
- API: creates an account through Kibana, reads its persisted name and roles back,
  and rejects descriptions on Serverless. Runs on Search because the local UIAM
  client certificate identifies an Elasticsearch project. Account creation uses
  the seeded organization-admin API key; Scout's browser admin is a project admin.

Local built-in roles are file-based and are not returned by Elasticsearch's role
query API. The UI test therefore creates native roles. It still exercises the
flyout's `includeReservedRoles=true` request and the real ES query/sort parser.

Start the stack once:

```sh
node scripts/scout start-server --arch serverless --domain search --serverConfigSet service_accounts
```

Then run both suites:

```sh
node scripts/playwright test --config x-pack/platform/plugins/shared/security/test/scout_service_accounts/ui/playwright.config.ts --project local --grep local-serverless-search
node scripts/playwright test --config x-pack/platform/plugins/shared/security/test/scout_service_accounts/api/playwright.config.ts --project local --grep local-serverless-search
```

For the Security UI regression, start the stack with `--domain security_complete`
and use `--grep local-serverless-security_complete` for the UI command.
The tests remove their native roles and created UIAM accounts during teardown.
