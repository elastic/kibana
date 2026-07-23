# Notification Center plugin

The **Notification Center** is the in-product surface for notifications within search solution,
such as inference model status updates.
It is a **presentation + ingestion layer**: consumers evaluate their own state and push notifications
to the center through submitter helper; this plugin builds the idempotency key, stores and
queries notifications for users, and renders them.

## Feature flags

The plugin is gated by two [core feature flags](../../../../../src/core/packages/feature-flags/README.mdx),
both **off by default**:

| Key                                              | Purpose                              |
| ------------------------------------------------ | ------------------------------------ |
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
   namespace, with a static `feature_flag` key. Use this convention for features flags:
   `notificationCenter.types.<namespace>.<typeId>`. omit `feature_flag` to send this type of notification without a feature flag check:
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
           kind: 'state',
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

`submit` performs the feature flag check itself. Flags default to off.
producers never call the Feature Flags service directly. Notifications of a type are shown only
when the NC plugin is enabled and the type's own `notificationCenter.types.<namespace>.<typeId>` flag is on.

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

## Notification kind and id

A notification's `notification_id` is a deterministic idempotency key so duplicates can be
collapsed at query time. **The Notification Center builds it** based on what's defined in the notification type registry;
producers never construct the id by hand and never track notification state themselves.

- **`state`** (default) — id `<namespace>:<type>:<entity>:<state>`. The notification represents
  the _current state_ of an entity; re-emitting the same state collapses to one entry, and a new
  `state` produces a new id. `submit` takes `{ entity, state }`.
  - e.g. `inference:modelStatus:my-endpoint:deprecated`
- **`timeseries`** — id `<namespace>:<type>:<event>:<epochMs>`. Each occurrence is distinct and
  written to the data stream.
  - e.g. `inference:modelStatus:memoryLimit:1750118400000`

A notification declares which variant it is with `kind` in the registry (`kind: 'timeseries'`). defaults to `state`.

## Submitting notifications (`forType`)

The server **setup** contract exposes `forType(ref)`, which binds a submitter to a registered
notification type.

- Pass a registry ref (`NOTIFICATION_TYPES.<namespace>.<type>`)
- the returned `submit` takes only the notification content and the type's id parts.
- NC supplies `namespace`, `type`, the `notification_id` (built from the type's `kind`), and `@timestamp`.

Re-pushing a `state` notification with the same parts appends another document; at query time
duplicates are collapsed and a separate cleanup-task keeps the index size under control. Invalid
content throws `NotificationValidationError` and nothing is written.

`submit` returns a promise with value: `{ status: 'submitted' | 'skipped_disabled' }`.
In the case of notification with a `feature_flag` that is disabled, submit resolves with `skipped_disabled`.

### Example usage

A plugin declares `notificationCenter` in `optionalPlugins` (or `requiredPlugins`) and calls
`forType` wherever its own logic lives.

```jsonc
// kibana.jsonc
{ "plugin": { "optionalPlugins": ["notificationCenter"] } }
```

```ts
// deprecation_check.ts
import { NOTIFICATION_TYPES, SEVERITY } from '@kbn/notification-center-plugin/common';
import type { NotificationCenterPluginSetup } from '@kbn/notification-center-plugin/server';

export const reportDeprecatedEndpoint = async (
  notificationCenter: NotificationCenterPluginSetup
) => {
  const endpoint = await findDeprecatedEndpoint();
  await notificationCenter.forType(NOTIFICATION_TYPES.inference.modelStatus).submit({
    entity: endpoint.id,
    state: 'deprecated',
    severity: SEVERITY.warning,
    title: `${endpoint.name} is deprecated`,
    description: `${endpoint.name} is deprecated and will be removed in a future release.`,
    // cta is optional — see common/notification_schema.ts
  });
};
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
