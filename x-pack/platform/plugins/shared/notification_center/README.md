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
   adding a YAML file under `feature-flags/search/search-ml-ux/` that defines the
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
     team-owner: '@elastic/search-ml-ux'
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
defaults to `info`**. Severity drives retention in the daily cleanup task.
A notification can remain visible for up to one cleanup interval after its TTL expires.
In the case of duplicate "state" notification IDs with different severity values,
cleanup expires a notification as a group, deleting every copy through its newest expired copy so
an older, longer-lived severity cannot resurface.
Unknown future severity values are normalized to `info` on read, but the cleanup task does not
match them; those documents remain until the data stream's 180-day retention removes them.

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

## Reading notifications: what is a query param

The list route returns a **collapsed** set (one document per `notification_id`) bounded by a
result cap.

> **A query param exists only if it can be applied before truncation
> and maintain an accurate representation of collapsed notification state**

1. **Is it on the document?**
2. **Does it define the set, or pick a copy within it?**

   - e.g. a time window defines which copies form the group, so the newest one in
     it is the right representative. A filter on mutable state
     picks an arbitrary copy to stand for the group.

| Candidate           | On document | Defines the set                             | Where          |
| ------------------- | ----------- | ------------------------------------------- | -------------- |
| `namespace`, `type` | yes         | yes — both are encoded in `notification_id` | server param   |
| `from` / `to`       | yes         | yes — the window is the set                 | server param   |
| `severity`          | yes         | no — picks an arbitrary copy                | response field |
| read state, mute    | no          | n/a                                         | response field |

The server annotates per-user read state, it does not filter or order by it.

An older high-severity notification can now fall outside the cap; server-side pagination and/or a higher cap will address this.

### Read state

Read state is per user, lives in `userStorage`, and never touches the notification document. The
list route **annotates** each item with `isRead` and returns the same order to every caller.

- `readAllBefore` is a single timestamp marker for a user ("mark all as read")
  any notifications whose timestamp is at or before this show up as read.
  It is stamped on the user's first read, so a new user doesn't get a giant unread backlog.
- `_mark_all_read` advances the marker to now and clears the individual overrides
- `_mark_read` adds an override for a specific notification id with a timestamp.
  a later re-push of the same `notification_id` postdates the override and shows as unread again.
  marking it read again updates the override timestamp (i.e. this is not "mute")
- Callers with no user profile (API keys, headless consumers) get the list with `isRead` absent
  rather than a 403. The mark routes reject them, since there is no read state to write.

## Submitting notifications (`forType`)

The server **setup** contract exposes `forType(ref)`, which binds a submitter to a registered
notification type.

- Pass a registry ref (`NOTIFICATION_TYPES.<namespace>.<type>`)
- the returned `submit` takes only the notification content and the type's id parts.
- NC supplies `namespace`, `type`, the `notification_id` (built from the type's `kind`), and `@timestamp`.

Re-pushing a `state` notification with the same parts appends another document; at query time
duplicates are collapsed and a daily cleanup task enforces severity retention while keeping the
index size under control. Invalid
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
