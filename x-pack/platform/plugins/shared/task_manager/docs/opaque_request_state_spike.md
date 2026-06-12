# Task Manager opaque request-state spike

## Summary

Alternative to the profile-id persistence approach in
[#261423](https://github.com/elastic/kibana/pull/261423).

Instead of storing identity attributes (for example `profileId`) as Task
Manager model fields, Task Manager stores a single opaque `requestState`
bag and asks Core/Security to hydrate a scoped request at execution time.

This document describes the design and points at the implementation that
lives in this PR.

## Flow

1. **Schedule time** — Core serializes request identity context into an
   opaque object via `core.security.authc.serializeRequest(request)`. Today
   the bag captures the `Authorization` header and `spaceId`; new identity
   hints (for example `profile_uid`, cloud user metadata) can be added
   here without changes to Task Manager. Task Manager persists the bag
   under `task.requestState` without inspecting individual fields.
2. **Run time** — Task Manager passes the persisted `requestState` to
   `core.security.authc.hydrateRequest(requestState)`. Core/Security
   materializes a scoped `KibanaRequest`, which the task runner forwards
   as `RunContext.fakeRequest`.

## Implementation in this PR

### Core security (`src/core/packages/security`)

- `OpaqueRequestState` is exported from `@kbn/core-security-server`. It is
  intentionally typed as `Record<string, unknown>` so the contract surface
  stays small and consumers cannot reason about individual fields.
  (An optional follow-up commit replaces this with a branded nominal type
  for stronger producer/consumer isolation; see the PR description.)
- `CoreAuthenticationService` gains `serializeRequest(request)` and
  `hydrateRequest(requestState)`.
- A default no-op implementation is provided when no security delegate is
  registered.

### Security plugin (`x-pack/platform/plugins/shared/security`)

`buildSecurityApi` provides the real implementation:

- `serializeRequest` extracts the `Authorization` header and `spaceId`
  (when available) and stamps a version marker so future hydrators can
  detect (and ignore) shapes they don't understand.
- `hydrateRequest` rebuilds a `KibanaRequest` via the existing
  `kibanaRequestFactory` / `FakeRawRequest` plumbing.

### Task Manager (`x-pack/platform/plugins/shared/task_manager`)

- `TaskInstance.requestState?: OpaqueRequestState` is added to the public
  task interface and to `SerializedConcreteTaskInstance`.
- The task SO schema gets a new permissive model version (`v11`) that
  accepts `requestState` as a free-form record. No mappings change is
  required because `requestState` is not indexed (`taskMappings` uses
  `dynamic: false`).
- `TaskPollingLifecycle` and `TaskManagerRunner` accept a `getCoreAuthc`
  accessor and prefer `coreAuthc.hydrateRequest(task.requestState)` when
  the task has one, falling back to the legacy ApiKey-based fake request
  path otherwise.
- The task plugin wires `core.security.authc` into the polling lifecycle
  in `start()`.

## Compatibility posture

The opaque `requestState` bag is treated as additive-by-default:

- Newer Kibana versions may write extra keys.
- Older Kibana versions ignore unknown keys (`unknowns: 'ignore'` in the
  v11 schema's `forwardCompatibility`) rather than stripping/rejecting
  them.
- The hydrator stamps a version marker (`v: 1`) so future producers can
  evolve the shape without breaking older nodes.

This keeps rolling upgrades safe and avoids unnecessary model-version
breaks for additive request metadata.

## Relationship to #261423

PR #261423 solves a real gap (profile context for fake requests), but it
does so by adding Task Manager-specific persisted profile state and
migration surface.

This spike proposes a different ownership boundary:

- **#261423**: Task Manager stores explicit identity fields.
- **This spike**: Task Manager stores opaque request state; Core/Security
  owns identity hydration.

Both approaches can provide profile context; this spike targets lower
future maintenance cost.

## Scope of this spike PR

The goal is to demonstrate the contract and integration shape, not to
ship production-ready coverage of every Task Manager flow:

- Subtask propagation (`runNow`) is unchanged — `requestState` flows on a
  task because it is just another `TaskInstance` field that the existing
  store/serializer round-trips.
- No new unit tests are added beyond making the existing suites continue
  to compile; the new code paths are exercised through the contract
  additions and existing task-runner tests.
- The ESO `check_registered_types` snapshot will need to be regenerated
  with `-u` to acknowledge the new `task|11` model version. The schema
  change is additive and not encrypted, so this is mechanical.
