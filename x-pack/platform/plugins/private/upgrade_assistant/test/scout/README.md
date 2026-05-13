# Upgrade Assistant Scout Tests

The `ui` tests use the custom `upgrade_assistant` Scout server config because the
Upgrade Assistant management app is registered during plugin setup only when
`xpack.upgrade_assistant.ui.enabled=true` is set at Kibana startup.

The `api` tests do not need that UI flag. They use the default Scout API server
setup and migrate the skipped FTR API coverage into skipped Scout specs.

Both `ui` and `api` specs intentionally remain skipped while
https://github.com/elastic/kibana/issues/266002 is unresolved. This preserves the
state of the migrated FTR suites.

The archive-heavy suites are still out of scope for this Scout tree:

- `x-pack/platform/test/upgrade_assistant_integration`
- `x-pack/platform/test/reindex_service`
