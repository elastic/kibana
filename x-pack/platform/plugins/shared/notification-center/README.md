# Notification Center plugin

The **Notification Center** is the in-product surface for notifications such as
model-status events. Architecturally it is a **presentation + ingestion layer**,
not a state engine: consumers evaluate their own state and push notifications to
the center by a deterministic idempotency key; the center stores, de-duplicates,
and renders them.

## Feature flags

The center is gated by two [core feature flags](../../../../../src/core/packages/feature-flags/README.mdx),
both **off by default**:

| Key                             | Purpose                            |
| ------------------------------- | ---------------------------------- |
| `notificationCenter.uiEnabled` | Everything user-visible in the UI. |

Individual notification _types_ (model status, etc.) are gated separately — see
[Notification-type flag strategy](#notification-type-flag-strategy) — and land as
consumers are introduced.

The keys live in-repo as constants in [`common/feature_flags.ts`](./common/feature_flags.ts); Kibana only references
those keys and evaluates them. The authoritative definitions and rules are managed
via **GitOps** in the external [`elastic/kibana-feature-flags`](https://github.com/elastic/kibana-feature-flags)
repository, which transpiles the YAML to Terraform and applies it to
LaunchDarkly.

Every evaluation call passes a `false` fallback, so wherever no feature-flag
provider is attached (self-managed deployments, network-restricted Cloud, tests)
the plugin stays fully dark.

To force a flag locally, add an override to your `kibana.dev.yml`:

```yaml
feature_flags.overrides:
  notificationCenter.uiEnabled: true
```

> ⚠️ Feature flags are dynamic config and must not be used to decide setup-time
> wiring (e.g. whether an HTTP route or app is registered). Always register, then
> branch on the flag at request/render time.

## Plugin enablement switch

`xpack.notificationCenter.enabled` (default `false`) is set in `kibana.yaml` config

```yaml
xpack.notificationCenter.enabled: true
```

Once enabled, the feature flags above govern dynamic, per-deployment rollout.

## Notification-type flag strategy

Each notification _type_ (model status, license expiry, …) is gated by **its own
boolean feature flag**, rather than a single list of enabled types.
e.g. A notification type can be enabled for 10% of deployments, or one customer,
independently of every other type.

The Notification Center owns the registry; consumers register a type and never
touch the Feature Flags service themselves. **Registering a type is two edits:**

1. Add a literal entry to `NOTIFICATION_TYPE_FLAGS` in
   [`common/feature_flags.ts`](./common/feature_flags.ts) — this also extends the
   derived `NotificationTypeId` union:
   ```ts
   export const NOTIFICATION_TYPE_FLAGS = {
     modelStatus: 'notificationCenter.types.modelStatus',
   } as const;
   ```
2. Open a PR against [`elastic/kibana-feature-flags`](https://github.com/elastic/kibana-feature-flags)
   adding a YAML file under `feature-flags/search/search-kibana/` that defines the
   flag (same literal `key`). For example, `notificationCenterModelStatus.yml`:
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

Gating then reads the literal from the registry, off by default:

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
