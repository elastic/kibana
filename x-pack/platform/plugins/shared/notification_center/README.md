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

## Reading notifications: what is a query param

The list route returns a **collapsed** set (one representative document per
`notification_id`) **bounded** by a result cap. The cap is what keeps the route safe, and it
is also what decides which narrowing operations can honestly be exposed as query params.

> **Tenet — a query param exists only if the server can apply it before the result cap.
> Everything else is a field on the response that clients facet.**

A filter applied *before* collapse-and-cap bounds the filtered set, so `?namespace=x` means
"the newest N notifications in namespace x" — a real search. A filter applied *after* the cap
narrows an already-truncated window: it can come back empty while matches exist just outside
the window, and running it on the client instead loses nothing, because the client sees the
same window. So the only narrowing worth doing server-side is the kind that changes **which
items survive truncation**.

Two admission tests, in order:

1. **Is it on the document?** Per-user state is not in the index — read state and mute live in
   `userStorage`. Not a param.
2. **Is it invariant across every copy of the `notification_id`?** A doc-level filter on
   mutable state changes which copy represents the collapsed group. `severity` is mutable
   (a condition can escalate on re-push), so it is not a param.

Only yes-to-both qualifies:

| Candidate | On document | Invariant per id | Where |
| --- | --- | --- | --- |
| `namespace`, `type` | yes | yes — both are encoded in `notification_id` | server param |
| `from` / `to` | yes | selects which copies form the group | server param |
| `severity` | yes | no — mutable across copies | response field |
| read state, mute | no | n/a | response field |

Corollary: **the server annotates per-user state; it does not filter or order by it.** The
list carries `isRead` for the caller but is ordered by recency alone, so the sequence is
identical for every caller and a client tracking read state optimistically has nothing to
reconcile.

### Scalability fallbacks

`truncated: true` in a response is the tripwire. If it starts appearing in practice, escalate
in this order — the first three preserve the tenet, the last two deliberately change its
premise:

1. **Tighten retention.** Shrink the severity TTL horizons. This reduces the population rather
   than the window, and it is the control already designed for the job.
2. **Add a doc-level invariant filter** that consumers actually scope by, so the cap bounds a
   smaller meaningful set. `kind` is the obvious candidate: it is registry metadata rather than
   a stored field, so the server expands it to a set of `type` values and filters pre-cap.
   Admission still requires passing both tests above.
3. **Raise the cap.** Cheap and bounded, but the cost is linear in payload and client memory.
   Appropriate while the whole set is still plausibly "one user's current state".
4. **Server-side paging.** The real fix once the set exceeds what a client should hold, but it
   is in tension with client-side faceting: you cannot facet over a set you hold one page of.
   Note also that `search_after` does not compose cleanly with `collapse` — the representative
   is the newest copy, so every older copy of an already-returned group sorts *after* it and
   re-forms that group on a later page, represented by a stale copy. Paging a collapsed set is
   awkward because the set is a query-time projection, not a stored thing. Reaching this rung is
   the signal to move to (5), not to bolt cursors or post-collapse filters onto this shape.

   Consumers should therefore treat **de-duplication by `notification_id`, keeping the first
   occurrence, as a permanent client-side invariant**. It costs nothing today, and it stays
   necessary under any paging scheme: on a live feed a re-pushed notification legitimately
   resurfaces at the top, so the server can never promise id-uniqueness across a paging
   session. Page by cursor, never by offset — new arrivals shift every offset.
5. **Materialize current state** — an index keyed by `notification_id` holding the latest state,
   updated on submit. This is what makes mutable attributes and per-user state legitimately
   filterable before a cap, and it is the only route to real `severity` or unread *search*
   rather than window narrowing.

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
