# Task Manager — Caller snapshot design

## Summary

When Task Manager runs a background task it materializes a "fake" `KibanaRequest`
so the task can act on behalf of the user that scheduled it. Historically that
fake request was hand-built from a handful of Task Manager-specific sibling
fields on the task SO (`task.apiKey`, `task.uiamApiKey`, `task.userScope`), with
the precedence rules duplicated between `task_runner.getFakeKibanaRequest` and
the API-key strategy. Every new identity hint (e.g. `profile_uid`) meant a new
Task Manager SO field, a new model version, and per-attribute knowledge inside
Task Manager.

This design moves identity capture and replay into a small Core/Security
contract — `CallerSnapshot` — and gives Task Manager exactly one new SO field
(`task.callerSnapshot`) that it persists byte-for-byte without inspecting.

This document describes the design and points at the implementation that lives
in this PR.

## Contract

`@kbn/core-security-server` exports `CallerSnapshot`, a Core/Security-owned
typed value that captures a point-in-time snapshot of the caller's identity
context. It is intended to be persisted alongside a deferred operation and
replayed later to reconstruct a scoped `KibanaRequest`.

```ts
export type CallerSnapshot = {
  readonly [callerSnapshotBrand]: never;
  readonly v: number;
  readonly authorization?: string;
  readonly spaceId?: string;
  readonly userProfileId?: string;
};
```

`CoreAuthenticationService` exposes four entry points:

| Method | Purpose |
|---|---|
| `captureCaller(request)` | Full mint from a live request. Async — resolves `userProfileId` via `getCurrentUser(request).profile_uid`. Returns `undefined` when no identity context can be captured. |
| `replayCaller(snapshot)` | Reconstructs a scoped `KibanaRequest` from a snapshot. Returns `undefined` when the snapshot has no usable auth-bearing field or carries an unrecognized `v`. |
| `stampCaller(parts)` | Narrow mint helper for migrations and tests. Takes a small `{ authorization?, spaceId?, userProfileId? }` shape. Used when constructing a snapshot from already-known fields (e.g. when migrating data from another column). |
| `adoptPersistedCaller(persisted)` | Persistence trust boundary. Forges the brand on a value read from storage after a structural check (`v` is a number). |

`CallerSnapshot` carries a `unique symbol` brand. The brand does not prevent
field reads — consumers may inspect documented fields if they need to (e.g. a
later migration that wants to copy `userProfileId` elsewhere). The brand makes
construction sites auditable: every place a `CallerSnapshot` is *minted* goes
through `captureCaller`, `stampCaller`, or `adoptPersistedCaller`. The on-disk
encoding is Core/Security's and may evolve additively.

This is the same pattern as `asSpaceId(value: string): SpaceId` — the brand
isn't a wall, it's a stamp at the boundary that makes the policy visible in
code review.

## Flow

1. **Schedule time** — `TaskScheduling.schedule(taskInstance, { request })`
   awaits `core.security.authc.captureCaller(request)` and stamps the result
   onto `taskInstance.callerSnapshot` before persisting. Errors from
   `captureCaller` are swallowed at debug log level — task scheduling must not
   fail because identity capture couldn't run; the runner already has a legacy
   fallback path.
2. **Run time** — `TaskManagerRunner` reads `task.callerSnapshot` through
   `core.security.authc.adoptPersistedCaller()` (the persistence trust
   boundary), then asks `core.security.authc.replayCaller(snapshot)` for a
   scoped `KibanaRequest` that the task definition's `createTaskRunner`
   receives. When no snapshot is present or `replayCaller` returns `undefined`,
   the runner falls back to the legacy api-key-based fake request path.

## Ownership boundary

Task Manager continues to own its api-key bookkeeping (`task.apiKey`,
`task.uiamApiKey`, `task.userScope`) — those columns are unchanged by this PR.
Specifically:

- `userScope.apiKeyId` is structurally indexed because the api-key invalidation
  task runs a `terms` aggregation on it (see `invalidate_api_keys_task` and
  `get_api_key_ids_to_invalidate`). That mapping is load-bearing.
- All other `userScope` siblings are TM-internal state (`uiamApiKeyId`,
  `apiKeyCreatedByUser`, `spaceId`) and stay where they are.

`CallerSnapshot` is the identity context bag, NOT a generic replacement for
the api-key columns. The two objects answer different questions:

| | Owner | Purpose | Queried? |
|---|---|---|---|
| `task.userScope` | Task Manager | api-key lifecycle bookkeeping | `userScope.apiKeyId` only |
| `task.callerSnapshot` | Core/Security | identity context for run-time replay | never |

A future PR may migrate Ryan's `userScope.userProfileId` (from #261423) into
`callerSnapshot.userProfileId`, but that is intentionally out of scope for this
spike.

## SO posture

- New top-level field `task.callerSnapshot` (typed object, `unknowns: 'allow'`
  inside the bag so additive identity hints round-trip during rolling
  upgrades).
- **No mapping change.** `taskMappings` has `dynamic: false`, so the new field
  is stored in `_source` and not indexed. That matches the existing convention
  for non-queried task SO fields (e.g. `userScope.spaceId`,
  `userScope.apiKeyCreatedByUser`).
- New model version `task|11` (additive only — `changes: []`). The encrypted
  registered-types snapshot (`check_registered_types.test.ts`) is updated to
  include `task|11`; the per-type encryption hash is unchanged because no AAD
  set or encrypted attribute changed.

## Compatibility posture

- Tasks scheduled before this PR have no `callerSnapshot`; the runner falls
  back to the legacy api-key-based fake request path unchanged.
- Tasks scheduled by code paths that don't pass a `request` to
  `taskManager.schedule()` (every plugin other than the ones converted in a
  future PR) also fall back. There is no regression and no behavior change for
  them.
- The version marker (`v: 1`) inside the bag lets future producers evolve the
  shape additively; the schema is `unknowns: 'allow'` inside `callerSnapshot`
  so older nodes preserve unknown additive keys during rolling upgrades.

## Implementation in this PR

### Core security (`src/core/packages/security`)

- `CallerSnapshot` type exported from `@kbn/core-security-server`.
- `CoreAuthenticationService` gains `captureCaller`, `replayCaller`,
  `stampCaller`, `adoptPersistedCaller`.
- Default no-op delegate covers the case where no security implementation is
  registered.

### Security plugin (`x-pack/platform/plugins/shared/security`)

- `buildSecurityApi` provides the real implementations in `build_delegate_apis.ts`:
  - `captureCallerImpl` is async; it extracts the `Authorization` header and
    `spaceId` from the live request and resolves `userProfileId` via
    `getAuthc().getCurrentUser(request)?.profile_uid` (best-effort — errors are
    swallowed).
  - `replayCallerImpl` rebuilds a `KibanaRequest` via the existing
    `kibanaRequestFactory` / `FakeRawRequest` plumbing. Refuses to fabricate a
    request when no auth-bearing field is present.

### Task Manager (`x-pack/platform/plugins/shared/task_manager`)

- `TaskInstance.callerSnapshot?: CallerSnapshot` is added to the public task
  interface and the serialized shape.
- `taskSchemaV11` accepts a typed `callerSnapshot` object with
  `unknowns: 'allow'`.
- `TaskScheduling` gains a `getCoreAuthc` accessor. `schedule` and
  `bulkSchedule` await `captureCaller(request)` when a request is provided and
  stamp the result onto the task before persisting. `bulkSchedule` captures
  once and stamps the same snapshot on every task in the batch.
- `TaskManagerRunner` goes through `adoptPersistedCaller` at the persistence
  trust boundary, then `replayCaller` to produce the fake request.
- The task plugin wires `core.security.authc` into both `TaskScheduling` and
  `TaskPollingLifecycle` (the latter is forwarded to each runner).

## Tests

- `build_delegate_apis.test.ts` — 42 tests covering `captureCaller`,
  `replayCaller`, `stampCaller`, `adoptPersistedCaller`, round-trip, and the
  `userProfileId` resolution behavior including the throw/null cases.
- `task_model_versions.test.ts` — round-trip of `callerSnapshot` through the
  v11 schema, additive unknown keys preserved, forward-compat with future `v`.
- `task_scheduling.test.ts` — new describe block: producer wiring across
  `schedule` and `bulkSchedule`, error swallowing, no-getCoreAuthc case.
- `task_runner.test.ts` — new describe block: consumer trust-boundary via
  `adoptPersistedCaller`, fallback when `replayCaller` returns `undefined`.
- `integration_tests/caller_snapshot_capture.test.ts` — Jest integration test
  with a real `TaskScheduling` + `TaskManagerRunner` and mocked Core/Security
  authc, asserting the full `captureCaller → persist → adoptPersistedCaller →
  replayCaller → fakeRequest` flow.

## Relationship to #261423

PR #261423 solves the immediate product gap — making `profile_uid` available
on Task Manager fake requests — by adding `userScope.userProfileId` as a new
sibling field. This PR doesn't replace that work; it provides a Core/Security
contract that future PRs can use to migrate `userProfileId` (and any future
identity hint) into a single bag without further Task Manager-specific
plumbing.

The recommended sequencing:

1. **#261423 lands first** with `userScope.userProfileId` (unmapped, matching
   the existing `userScope.spaceId` / `userScope.apiKeyCreatedByUser`
   convention).
2. **This PR lands second** to introduce the `CallerSnapshot` contract and
   wire Task Manager to use it. The contract is a no-op for pre-existing
   tasks; new tasks scheduled with a request get a `callerSnapshot`.
3. **A follow-up migrates** Ryan's `userProfileId` from `userScope` to
   `callerSnapshot` via a `stampCaller` call in a TM model version. Old key
   stays writable for one model version for rollback; new code reads from
   `callerSnapshot` first, falls back to `userScope.userProfileId`. Once the
   legacy key is no longer needed it is dropped from the schema.

## Out of scope

- **Other `taskManager.schedule()` callers** in Alerting, Actions, Reporting,
  ML, Fleet, etc. keep using the legacy path. They continue to work because
  the runner falls back when `callerSnapshot` is absent. Per-plugin conversion
  is a follow-up.
- **Removing `task.apiKey` / `task.uiamApiKey` sibling fields** is not in
  scope. They keep working for tasks that have them, and the API-key strategy
  keeps writing them. Once all `schedule()` callers route through
  `captureCaller`, those columns can be deprecated in a separate cleanup PR.
- **Other Core/Security consumers** of `captureCaller`/`replayCaller` (e.g.
  reporting's scheduled exports, async-search reconnection) are valid future
  users but out of scope here.
- **Removing `userScope.userProfileId`** (post-#261423) is part of the
  follow-up migration described above, not this PR.
