# Notification Center plugin

The **Notification Center** is the in-product surface for notifications within search solution,
such as inference model status updates.
It is a **presentation + ingestion layer**, consumers evaluate their own state and push notifications to
the center using a structured idempotency key; this plugin stores and queries notifications for users
and renders them.

## Feature flags

The plugin is gated by two [core feature flags](../../../../../src/core/packages/feature-flags/README.mdx),
both **off by default**:

| Key                                    | Purpose                              |
| -------------------------------------- | ------------------------------------ |
| `notificationCenter.uiEnabled`         | Kibana UI visibility                 |
| `notificationCenter.types.modelStatus` | Inference model status notifications |

Individual notification _types_ (model status, etc.) are gated separately and land as
consumers are introduced.
Their definitions and rules are managed in the separate [`elastic/kibana-feature-flags`](https://github.com/elastic/kibana-feature-flags) repository

Flags default to `false` when LaunchDarkly value is unreachable.

To force a flag locally, add an override to your `kibana.dev.yml`:

```yaml
feature_flags.overrides:
  notificationCenter.uiEnabled: true
```

> ⚠️ Feature flags are dynamic config and cannot be used to decide plugin
> setup lifecycle

## Static plugin enablement

`xpack.notificationCenter.enabled` (default `false`) is set in `kibana.yml` config

```yaml
xpack.notificationCenter.enabled: true
```

Once enabled, the dynamic flags determine further plugin behavior

## Notification-type flag strategy

Each notification type has its own boolean feature flag defined.
e.g. A notification type can be enabled for 10% of deployments, or one customer,
independently of every other type.

The Notification Center owns the registry; consumers register a type and never
touch the Feature Flags service themselves.

### Registering a type is two edits:

1. Add an entry to `NOTIFICATION_TYPE_FLAGS` in
   [`common/feature_flags.ts`](./common/feature_flags.ts):
   ```ts
   export const NOTIFICATION_TYPE_FLAGS = {
     modelStatus: 'notificationCenter.types.modelStatus',
   } as const;
   ```
2. Open a PR against [`elastic/kibana-feature-flags`](https://github.com/elastic/kibana-feature-flags)
   adding a YAML file under `feature-flags/search/search-kibana/` that defines the
   flag with the same key:
   ```yaml
   notificationCenter.types.modelStatus:
     description: Enables the Model Status notification type in the Notification Center.
     prs:
       - https://github.com/elastic/kibana/pull/<this-pr>
     type: boolean
     variations:
       - true # ON
       - false # OFF (default)
     team-owner: '@elastic/search-kibana'
     deprecate-by: unknown
     evaluation-rules: {}
   ```

Flag gates can read from the registry, off by default:

```ts
await featureFlags.getBooleanValue(
  NOTIFICATION_TYPE_FLAGS.modelStatus,
  NOTIFICATION_TYPE_ENABLED_DEFAULT
);
```

Notifications of a certain type are shown only when the plugin is visible: `notificationCenter.uiEnabled`
and its own `notificationCenter.types.<typeId>` flag is on.

## Running tests

```bash
node scripts/jest --config x-pack/platform/plugins/shared/notification-center/jest.config.js
```
