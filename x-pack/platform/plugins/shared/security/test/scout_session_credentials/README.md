# Session credential recovery tests

This suite tests session renewal through scoped Elasticsearch clients and API-key grants.
It covers concurrent calls, late failures from cached clients, repeated expiry, and external credentials
with a session cookie.

The `session_credentials` stateful configuration uses a 15-second Elasticsearch token lifetime and
loads the Security `test_endpoints` plugin. Its authentication routes exercise credential recovery
and Task Manager grants within the same incoming request. These tests require local control of token
lifetimes and do not run against Cloud deployments.

```bash
node scripts/scout run-tests --arch stateful --domain classic --config x-pack/platform/plugins/shared/security/test/scout_session_credentials/api/playwright.config.ts
```
