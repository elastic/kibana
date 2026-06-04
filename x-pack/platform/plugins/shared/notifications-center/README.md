# Notifications Center plugin

The **Notifications Center** is the in-product surface for notifications such as
model-status events. Architecturally it is a **presentation + ingestion layer**,
not a state engine: consumers evaluate their own state and push notifications to
the center by a deterministic idempotency key; the center stores, de-duplicates,
and renders them.

This package is currently a **scaffold only** — nothing is user-visible. It
exists so later work (storage, the producer/`submit` contract, RBAC, UI,
preferences, telemetry, and the inference integration) has a clean shell to
build on, and so the plugin is proven to load behind off-by-default flags before
anything piles on top of it.

## Feature flags

The center is gated by two [core feature flags](../../../../../src/core/packages/feature-flags/README.mdx),
both **off by default**:

| Key | Purpose |
| --- | --- |
| `notificationsCenter.uiEnabled` | Master gate for everything user-visible in the UI. |

Individual notification _types_ (model status, etc.) are gated separately — see
[Notification-type flag strategy](#notification-type-flag-strategy) — and land as
consumers are introduced.

The keys and their variations are declared in-repo in
[`server/index.ts`](./server/index.ts) (exported as `featureFlags`) and mirrored
as constants in [`common/feature_flags.ts`](./common/feature_flags.ts). The
authoritative definitions — including the default variation served per
environment — live in the external `elastic/kibana-feature-flags` repository.

Every evaluation call passes a `false` fallback, so wherever no feature-flag
provider is attached (self-managed deployments, network-restricted Cloud, tests)
the plugin stays fully dark.

To force a flag locally, add an override to your `kibana.dev.yml`:

```yaml
feature_flags.overrides:
  notificationsCenter.uiEnabled: true
```

> ⚠️ Feature flags are dynamic config and must not be used to decide setup-time
> wiring (e.g. whether an HTTP route or app is registered). Always register, then
> branch on the flag at request/render time.

## Static enablement switch

`xpack.notificationsCenter.enabled` (default `false`) is a static opt-in. While
the center is incubating the plugin is off: core skips it entirely — neither the
server nor the browser plugin is instantiated. Enable it per deployment with:

```yaml
xpack.notificationsCenter.enabled: true
```

Once enabled, the feature flags above govern dynamic, per-deployment rollout.

## Notification-type flag strategy

Each notification _type_ (model status, license expiry, …) is gated by **its own
boolean feature flag**, rather than a single list of enabled types. This is the
idiomatic fit for the Feature Flags service — which has no array variation type
and exists to roll a single flag out by segment — so a type can be enabled for
10% of deployments, or one customer, independently of every other type.

**Flag keys are static string literals, never generated at runtime.** The full
set has to be knowable from static analysis so the keys can be created and
managed up front in the external provider (LaunchDarkly / the
`elastic/kibana-feature-flags` repo) and discovered by the flag code-references
scanner. A runtime key builder (`` `notificationsCenter.types.${id}` ``) would
hide keys from both — so the center keeps a static registry instead.

The Notifications Center owns the registry; consumers register a type and never
touch the Feature Flags service themselves. **Registering a type is two static
edits:**

1. Add a literal entry to `NOTIFICATION_TYPE_FLAGS` in
   [`common/feature_flags.ts`](./common/feature_flags.ts) — this also extends the
   derived `NotificationTypeId` union:
   ```ts
   export const NOTIFICATION_TYPE_FLAGS = {
     modelStatus: 'notificationsCenter.types.modelStatus',
   } as const;
   ```
2. Add the matching static `FeatureFlagDefinition` (same literal `key`) to the
   `featureFlags` export in [`server/index.ts`](./server/index.ts).

Gating then reads the literal from the registry, off by default:

```ts
await featureFlags.getBooleanValue(
  NOTIFICATION_TYPE_FLAGS.modelStatus,
  NOTIFICATION_TYPE_ENABLED_DEFAULT
);
```

A type is shown only when the master `notificationsCenter.uiEnabled` flag and its
own `notificationsCenter.types.<typeId>` flag are both on. No per-type flag is
declared yet — they arrive with their consumers.

## Running tests

```bash
node scripts/jest --config x-pack/platform/plugins/shared/notifications-center/jest.config.js
```
