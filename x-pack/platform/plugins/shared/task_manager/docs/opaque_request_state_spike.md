# Task Manager opaque request-state spike

## Summary

This spike demonstrates an alternative to the profile-id persistence approach in [#261423](https://github.com/elastic/kibana/pull/261423).

Instead of storing identity attributes (for example `profileId`) as Task Manager model fields, Task Manager stores one opaque `requestState` bag and asks Core HTTP/Security to hydrate a scoped request at execution time.

## Proposed flow

1. **Schedule time**
   - Task Manager receives a real `KibanaRequest`.
   - Core serializes request identity context into an opaque object:
     - api key reference/material already required for background execution
     - `spaceId`
     - optional identity hints (for example `profile_uid`)
   - Task Manager persists `requestState` without inspecting individual fields.

2. **Run time**
   - Task Manager passes persisted `requestState` to `asScopedRequest(requestState)`.
   - Core/Security hydrates a scoped request and resolves final identity from trusted auth sources.
   - Task execution consumes a normal scoped `KibanaRequest`.

## Why this demonstrates lower long-term complexity

- Task Manager no longer needs per-attribute persistence (`profileId`, future cloud/user attributes, etc.).
- New identity attributes can evolve in Core/Security without repeated Task Manager model-version churn.
- Subtask propagation remains generic because Task Manager forwards one opaque state bag.
- Request hydration logic remains centralized in Core/Security instead of Task Manager-specific fake-request enrichment paths.

## Model-version behavior for this approach

For the opaque `requestState` object, read validation should be permissive for additive fields:

- newer Kibana versions may write extra keys
- older Kibana versions should ignore unknown keys rather than strip/reject them
- trusted-boundary data should round-trip without field-specific Task Manager awareness

This keeps rolling upgrades safer and avoids unnecessary model-version breaks for additive request metadata.

## Relationship to #261423

PR #261423 solves a real gap (profile context for fake requests), but it does so by adding Task Manager-specific persisted profile state and migration surface.

This spike proposes a different ownership boundary:

- **#261423**: Task Manager stores explicit identity fields.
- **This spike**: Task Manager stores opaque request state; Core/Security owns identity hydration.

Both approaches can provide profile context; this spike targets lower future maintenance cost.
