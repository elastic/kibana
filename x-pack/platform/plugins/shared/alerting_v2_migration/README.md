# alertingVTwoMigration

Migrates classic (v1) alerting rules to universal (v2) alerting rules. Owns the rule migration registry and client, and the classic-to-universal rule migration Agent Builder skill.

## Registering a rule type migration

Classic rule type owners make their rules migratable during plugin setup:

```ts
alertingVTwoMigration?.ruleMigrations.register({
  ruleTypeId: '.es-query',
  convertParams: convertEsQueryParams,
  defaultActionPolicy: { subject, message },
});
```

## Migrating rules

`getRuleMigrationClientWithRequest(request)` returns a client that converts classic rules into v2 rules and action policies, creating them with the request's credentials in its space.

## Agent Builder

When `agentBuilder` is available, the plugin registers the `classic-to-universal-rule-migration` skill. Its `platform.alerting.get_classic_rule` tool reads a classic rule through the classic alerting rules client, so the classic rule type and consumer privileges apply.
