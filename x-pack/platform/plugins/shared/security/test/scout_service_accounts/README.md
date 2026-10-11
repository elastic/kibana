# Service account Serverless regression tests

These tests use real Elasticsearch and local UIAM through the `service_accounts`
Scout server configuration. Role loading and service account responses are not mocked.

- UI: opens the creation flyout, checks that it offers a description field, loads
  and selects multiple roles, and cancels. Runs on Security and Search.
- API: runs on Search because the local UIAM client certificate identifies an
  Elasticsearch project. Account creation uses the seeded organization-admin API
  key; Scout's browser admin is a project admin.
  - Creates an account through Kibana, and reads its persisted name, roles and
    description back.
  - Runs a workload bound to an account, and checks that it runs as the account,
    is limited to the account's roles, stays bound to its own space, and refuses
    a caller without `manage_security`.
  - Renews the workload's token after it expires, and denies renewal once the
    workload is unbound. Both tests wait 65 seconds to outlive a token.
  - Classifies an inbound request carrying a UIAM service account token as that
    account.

The config set loads the `service_accounts` test plugin from
`x-pack/platform/test/security_api_integration/plugins/service_accounts`. It
binds, unbinds and runs workloads over HTTP. It also sets UIAM's exchange token
lifetime to one minute, the shortest UIAM allows, so the renewal tests finish in
reasonable time.

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
The tests remove their native roles, spaces, workload bindings and created UIAM
accounts during teardown.
