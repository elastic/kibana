# Notification Center plugin

The **Notification Center** is the in-product surface for notifications within search solution,
such as inference model status updates.
It is a **presentation + ingestion layer**: consumers evaluate their own state and push notifications
to the center through submitter helper; this plugin builds the idempotency key, stores and
queries notifications for users, and renders them.

## What gates what

Three independent gates, at different scopes and with different operators:

| Gate                                            | Scope                 | Decides                                                              |
| ----------------------------------------------- | --------------------- | -------------------------------------------------------------------- |
| `xpack.notificationCenter.enabled` (kibana.yml)  | deployment, static    | whether the plugin exists at all — routes, data stream, cleanup task, `submit()` |
| `notificationCenter.uiEnabled` (LaunchDarkly)    | deployment, dynamic   | whether the UI may render; the operator shutoff, flippable without a restart |
| `notificationCenter.types.<ns>.<type>` (LaunchDarkly) | deployment, dynamic | whether `submit()` accepts that type — **server-side only**       |
| `notificationCenter:*` (advanced settings)       | space, user-editable  | which notifications the UI displays                                   |

The UI renders a notification only when `uiEnabled` **and** the space's master switch **and** its
namespace switch **and** its type switch all pass. Everything is off until launch, when
`uiEnabled` and the advanced-setting defaults flip to `true`.

The advanced settings are read in exactly one place — [`public/lib/ui_visibility.ts`](./public/lib/ui_visibility.ts).
They must never reach `submit()`, the routes or the cleanup task; keying per-space data behaviour
on a user-editable saved object is the anti-pattern this split avoids.

### Static plugin enablement

`xpack.notificationCenter.enabled` (default `false`) is set in `kibana.yml` config

```yaml
xpack.notificationCenter.enabled: true
```

Once enabled, the dynamic flags determine further plugin behavior

### Feature flags

[Core feature flags](../../../../../src/core/packages/feature-flags/README.mdx) are **off by
default**, including when the LaunchDarkly value is unreachable. Individual notification _types_
are gated separately and land as consumers are introduced. Their definitions and rules are managed
in the separate [`elastic/kibana-feature-flags`](https://github.com/elastic/kibana-feature-flags)
repository.

To force a flag locally, add an override to your `kibana.dev.yml`:

```yaml
feature_flags.overrides:
  notificationCenter.uiEnabled: true
```

> ⚠️ Feature flags are dynamic config and cannot be used to decide plugin
> setup lifecycle

### Space opt-in (advanced settings)

Three levels of boolean advanced setting, all derived from `NOTIFICATION_REGISTRY` and registered
in [`server/ui_settings.ts`](./server/ui_settings.ts) under a `Notification Center` category:

| Key                                             | Turns off                               |
| ----------------------------------------------- | --------------------------------------- |
| `notificationCenter:enabled`                    | the Notification Center in this space   |
| `notificationCenter:types:<namespace>`          | every type in one namespace             |
| `notificationCenter:types:<namespace>:<type>`   | one type                                |

The registry-derived keys form one tree mirroring the type's LaunchDarkly key
(`notificationCenter.types.<namespace>.<type>`), with the namespace key parenting its type keys —
the same shape as core's `dateFormat` and `dateFormat:dow`.

Rows are namespace-scoped (no `scope: 'global'`), which is what makes them per-space, and ship as
`technicalPreview`. Registering a type adds its rows automatically.

Two consequences worth knowing:

- The rows are visible regardless of LaunchDarkly. In a deployment where a type's flag is off, its
  toggle is editable but inert — nothing of that type is ever submitted.
- **Serverless hides all of them.** `setupProjectSettings(SEARCH_PROJECT_SETTINGS)` makes core
  stamp `readonly` + `readonlyMode: 'strict'` on every setting missing from that allowlist, and
  NC's keys cannot be added while `xpack.notificationCenter.enabled` defaults to `false`
  (`validateAllowlist` throws at boot for an allowlisted key that is not registered). Use the
  stateful stack to exercise real toggling. `uiSettings.overrides` in `kibana.dev.yml` still works
  on serverless — `applyOverrides` runs regardless of readonly mode — but an overridden setting
  pins rather than defaults, so it cannot then be changed in the UI.

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
- `_unread_status` answers "is there anything unread" as a single boolean for the bell badge,
  resolved against the same collapsed representatives as the list. It is a read, so it stamps
  `readAllBefore` for a first-time user just as the list does.

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

## Seeding a local dev stack

`./scripts/seed_notifications.js` appends a fixed chunk of notifications to the data stream, so
the list route and the bell have something to show without waiting for a real producer.

It is a dev script: it assumes Kibana is already running with
`xpack.notificationCenter.enabled: true`, and that you pass it a matching pair of URLs. Point it
somewhere else and it will happily seed somewhere else.

```bash
SEED=x-pack/platform/plugins/shared/notification_center/scripts/seed_notifications.js

node $SEED --help

# stateful
node $SEED --kibana-url http://localhost:5611/kbn --es-url http://localhost:9201 \
  --include-unregistered

# serverless: its own credentials, and Elasticsearch on HTTPS
node $SEED --kibana-url http://localhost:5601 --es-url https://localhost:9200 \
  --es-username elastic_serverless

node $SEED --kibana-url http://localhost:5611/kbn --es-url http://localhost:9201 --clean
```

`--kibana-url` must include the base path, which a dev Kibana mounts itself under. The script
reads the list route once before writing anything: that is what makes the plugin create the data
stream, and writing first would let Elasticsearch auto-create a plain index under the same name,
permanently blocking the plugin from creating it.

The credentials are used for both Elasticsearch and Kibana, which is why serverless needs
`elastic_serverless`: SAML is only the default _UI_ provider there, and basic auth still works.

The plugin's `notificationWriteSchema` rejects an unknown `namespace` or `type`. `--include-unregistered`
writes those directly to the cluster to exercise the read path and the UI against a mixed feed.

Every fixture is backdated, and a user's catch-up marker is stamped at `now` the first time they
open the bell — which is always after seeding — so the whole chunk would otherwise arrive already
read. The script therefore logs in as the Elasticsearch user and backdates that marker to 30 days
ago, leaving the newer fixtures unread. `--read-horizon` takes an age (`12h`) or a date
(`2026-09-01`) instead, and `--clean` drops the marker and per-id overrides. Read state is per user profile:
if you browse Kibana as somebody other than `--es-username`, their bell is unaffected.

## Running tests

```bash
node scripts/jest --config x-pack/platform/plugins/shared/notification_center/jest.config.js
```
