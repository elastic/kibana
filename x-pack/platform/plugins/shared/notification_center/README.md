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
| `notificationCenter.uiEnabled`                   | Kibana UI visibility                 |
| `notificationCenter.types.inference.modelStatus` | Inference model status notifications |

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

1. Add the type to `NOTIFICATION_REGISTRY` in
   [`common/notification_registry.ts`](./common/notification_registry.ts) under its
   namespace, with a static `feature_flag` key by convention
   `notificationCenter.types.<namespace>.<typeId>`. `NOTIFICATION_TYPE_FLAGS` is derived
   from these entries; omit `feature_flag` to send the type ungated:
   ```ts
   export const NOTIFICATION_REGISTRY = {
     inference: {
       display_name: 'Elastic Inference Service',
       description: 'Lifecycle changes to inference models.',
       types: {
         modelStatus: {
           display_name: 'Model status',
           description: 'A change to the lifecycle status of an inference model.',
           feature_flag: 'notificationCenter.types.inference.modelStatus',
         },
       },
     },
   } as const;
   ```
2. Open a PR against [`elastic/kibana-feature-flags`](https://github.com/elastic/kibana-feature-flags)
   adding a YAML file under `feature-flags/search/search-kibana/` that defines the
   flag with the same key:
   ```yaml
   notificationCenter.types.inference.modelStatus:
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

`submitNotification` performs the gate check itself, reading the derived flag off by default;
producers never call the Feature Flags service directly. Notifications of a type are shown only
when the plugin is visible (`notificationCenter.uiEnabled`) and the type's own
`notificationCenter.types.<namespace>.<typeId>` flag is on.

## Notification schema

The structure of the notification document is defined in [`common/`](./common):

- [`notification_schema.ts`](./common/notification_schema.ts) — the Zod
  `notificationSchema` for the document stored in the append-only
  `.kibana-notification-center` data stream. We use Zod because the shape is shared across
  server and browser code.

### Severity

`severity` is one of `info | warning | error | critical`. It is **optional on submit and
defaults to `info`**. Severity drives the per-document retention TTL applied by the cleanup task.

### Call-to-action (CTA)

`cta` is optional: `{ link, linkText }`. `link` must be an **internal** root-relative path
(starts with `/`), validated with `isInternalURL` from `@kbn/std` — external,
protocol-relative (`//host`), and backslash (`/\host`) URLs are rejected.

## Notification id conventions

A notification's `notification_id` is a deterministic idempotency key.
This ensures duplicate notifications can be collapsed at query time from the datastream.
Producers control de-duplication by how they construct the id. Notification state does
not need to be tracked by any other plugin.
Two conventions are provided in [`notification_id.ts`](./common/notification_id.ts):

- **Static-state** — `<producer>:<entity>:<state>`. Use when a notification
  represents the _current state_ of an entity; a new state produces a new id.

  ```ts
  buildStaticStateNotificationId({
    producer: 'inference',
    entity: 'my-endpoint',
    state: 'deprecated',
  });
  // => 'inference:my-endpoint:deprecated'  (re-push while still deprecated collapses to one entry)
  ```

- **Per-event** — `<producer>:<event>:<epochMs>`. Use when each occurrence is
  distinct; the epoch milliseconds segment makes every push unique without
  introducing colon collisions from ISO 8601 timestamps.

  ```ts
  buildEventNotificationId({
    producer: 'autoOps',
    event: 'memoryLimit',
    epochMs: Date.now(),
  });
  // => 'autoOps:memoryLimit:1750118400000'  (each occurrence is its own entry)
  ```

## Submitting notifications (`submitNotification`)

The server **setup** contract exposes `submitNotification(draft)`. It validates the draft
against `notificationWriteSchema`, stamps `@timestamp`, and appends one document to the
data stream. There is no HTTP creation path — plugins call `submitNotification` in-process.

Re-pushing the same `notification_id` appends another document; at display/query time,
duplicates are collapsed and a separate cleanup-task keeps the index size under control.
Invalid drafts throw `NotificationValidationError` and nothing is written.

`submitNotification` resolves to `{ status: 'submitted' | 'skipped_disabled' }`. A type whose
`feature_flag` is off (including when the LaunchDarkly value is unreachable — flags default to
`false`) is **not an error**: nothing is written and the call resolves with `skipped_disabled`.
Producers that need delivery guaranteed must ensure the type's flag is enabled.

### Example usage

A plugin declares `notificationCenter` in `requiredPlugins` and calls `submitNotification`
wherever its own logic lives.

```jsonc
// kibana.jsonc
{ "plugin": { "requiredPlugins": ["notificationCenter"] } }
```

```ts
// plugin.ts
class InferencePlugin {
  setup(core, { notificationCenter }) {
    registerDeprecationCheck(notificationCenter);
  }
}
```

```ts
// deprecation_check.ts
export async function registerDeprecationCheck(notificationCenter: NotificationCenterPluginSetup) {
  const endpoint = await findDeprecatedEndpoint();
  await notificationCenter.submitNotification({
    notification_id: buildStaticStateNotificationId({
      producer: 'inference',
      entity: endpoint.id,
      state: 'deprecated',
    }),
    namespace: 'inference',
    type: 'modelStatus',
    title: `${endpoint.name} is deprecated`,
    // ...plus `description`, `severity`, `cta` — see common/notification_schema.ts
    // namespace/type must be a registered pair — see common/notification_registry.ts
  });
}
```

### Checking it landed

Read it back from ES (Dev Tools → Console, or `curl` against Elasticsearch):

```
GET /.kibana-notification-center/_search
```

## Running tests

```bash
node scripts/jest --config x-pack/platform/plugins/shared/notification_center/jest.config.js
```
