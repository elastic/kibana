# @kbn/change-history-service

Composes the `@kbn/change-history` client and core's user-activity tracker
(`core.userActivity.trackUserAction`) behind a single, `IChangeHistoryClient`-shaped API:
the caller instruments a change once, and each sink gates itself.

The two logs are **peers** — a change carrying a `userActivity` block produces a Kibana
user activity log entry even when the change-history write is skipped (uninitialized sink,
per-call `writeHistory: false`) or fails (ES error). One sink's unavailability never
suppresses the other.

Adopter guideline: don't gate the call — gate the history sink via `writeHistory`.

```ts
const client = new ChangeHistoryServiceClient({
  module: 'stack',
  dataset: 'alerting-rules',
  logger,
  kibanaVersion,
  trackUserAction: coreSetup.userActivity.trackUserAction,
});

await client.logBulk(
  [
    {
      objectType: 'alert',
      objectId: ruleId,
      snapshot,
      userActivity: {
        message: `User updated rule "${name}" (id: ${ruleId}).`,
        event: { action: 'alerting_rule_update', type: 'change', outcome: 'success' },
        object: { id: ruleId, name, type: 'rule', tags },
      },
    },
  ],
  { action: 'rule_update', username, spaceId, writeHistory: isHistoryEnabled }
);
```
