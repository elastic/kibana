# SavedObjectsTagging

Add tagging capability to saved objects

## API migration

The legacy tag CRUD endpoints under `/api/saved_objects_tagging` are deprecated. See `api_migration.md` for the `/api/tags` migration mapping.

## Integrating tagging on a new object type

In addition to use the UI api to plug the tagging feature in your application, there is a couple
things that needs to be done on the server:

### Add read-access to the `tag` SO type to your feature's capabilities

In order to be able to fetch the tags assigned to an object, the user must have read permission
for the `tag` saved object type. Which is why all features relying on SO tagging must update
their capabilities.

```typescript
features.registerKibanaFeature({
  id: 'myFeature',
  // ...
  privileges: {
    all: {
      // ...
      savedObject: {
        all: ['some-type'],
        read: ['tag'], // <-- HERE
      },
    },
    read: {
      // ...
      savedObject: {
        all: [],
        read: ['some-type', 'tag'], // <-- AND HERE
      },
    },
  },
});
```

### Update the SOT telemetry collector schema to add the new type

The schema is located here: `x-pack/platform/plugins/shared/saved_objects_tagging/server/usage/schema.ts`. You
just need to add the name of the SO type you are adding.

```ts
export const tagUsageCollectorSchema: MakeSchemaFrom<TaggingUsageData> = {
  // ...
  types: {
    dashboard: perTypeSchema,
    visualization: perTypeSchema,
    // <-- add your type here
  },
};
```

### Update the `taggableTypes` constant to add your type

Edit the `taggableTypes` list in `x-pack/platform/plugins/shared/saved_objects_tagging/common/constants.ts` to add
the name of the type you are adding.

## Merge duplicate tags (internal)

Internal-only workflow (`server/routes/merge`, `server/services/merge`, `server/tasks/tag_merge`) that lets a user
consolidate tags that share the same name into one canonical tag: references on tagged saved objects are rewritten
from one or more `fromIds` to a single `toId`, and the source tags can optionally be deleted once unreferenced.
Not part of the `@kbn/saved-objects-tagging-oss-plugin` public contract, and not exposed on `/api/tags`.

### Endpoints

- `POST /internal/saved_objects_tagging/tags/merge/preview` — affected count (restricted to taggable types the
  current user can update), plus `canStartMerge`/`canRequestDeleteSources` gate results.
- `GET /internal/saved_objects_tagging/tags/merge/preview/objects` — paginated listing of the objects a merge would
  touch.
- `POST /internal/saved_objects_tagging/tags/merge` — starts the job (409 if one is already running in this space).
- `GET /internal/saved_objects_tagging/tags/merge` — current job status for this space (`idle` if none exists).
- `POST /internal/saved_objects_tagging/tags/merge/cancel` — requests cooperative cancellation.

### Progress percent spans both phases when `deleteSources` is requested

`GET .../tags/merge`'s `progress.percent` (`computePercent` in `status.ts`) is not simply
`updatedCount / totalAffected`: when `deleteSources` is true, `finalizing` (deleting the source tags, which happens
strictly after every saved object is updated) is real remaining work, so `updating` only accounts for the first
half of the bar (0-50%) and `finalizing` the second half (50-100%, based on how many of `fromIds` have been
checked/deleted so far) — otherwise the bar would read 100% while the source tags haven't been touched at all.
When `deleteSources` is false, `updating` alone maps to the full 0-100% range, since there's no `finalizing` phase.

### Per-user execution via Task Manager

The merge itself runs asynchronously (`saved_objects_tagging:tag_merge` task type, `server/tasks/tag_merge`), after
the HTTP request that started it has ended — but every reference rewrite must still be scoped to exactly what the
*starting user* is authorized to change, not to an internal/system identity. The start route
(`server/routes/merge/start.ts`) achieves this by passing the original `KibanaRequest` to `taskManager.schedule()`
as `{ request }` in the *second* argument (`ApiKeyOptions`), not by granting a key itself. Task Manager grants an
API key scoped to that request's own privileges internally and persists it as `apiKey`/`userScope` on the task —
those fields are **only** ever set this way: setting them directly on the object passed as the first argument does
nothing, because `taskInstanceToAttributes()` (in Task Manager's own `task_store.ts`) explicitly strips
`apiKey`/`userScope`/`uiamApiKey` from it. (An earlier version of this code got that backwards — hand-granted the
key and merged it onto the first argument — which silently scheduled tasks with no scoped request at all and
failed at run time with "missing its scoped request".) The `task` saved object type already encrypts `apiKey` at
rest, Task Manager rebuilds a scoped `fakeRequest` for every run and exposes it as `context.fakeRequest`, and it
invalidates the key automatically once the task is removed (`userScope.apiKeyCreatedByUser: false` marks it as
owned by the task, not the caller). No custom Encrypted Saved Objects type was needed for this — reuse this
mechanism (`schedule(taskInstance, { request })`) rather than reinventing per-user execution for future background
jobs in this plugin.

### Gate 2a: source-tag deletion safety model

Two independent authorization gates, both computed in `MergeService`:

- **Baseline start gate** (`checkStartGate`): the user must be able to manage tag objects (update *and* delete the
  `tag` type), and this specific merge must actually update at least one saved object the user can access —
  gated on `affectedCount` (from `computeAffectedCount`, already scoped to `updatableTypes`), not on "the user can
  update *some* taggable type somewhere." That distinction matters: a generic "can update at least one taggable
  type" check is nearly always true for any active editor and doesn't correlate with whether *these specific*
  `fromIds` are used by anything the user can actually update — a user who can only edit `dashboard` would pass
  a generic check even if the tags being merged are only ever applied to `map`/`lens` objects the user can't
  touch, letting them start a merge that provably does nothing. `affectedCount` is recomputed independently in
  both `preview.ts` and `start.ts` (never trusting a client-supplied value from an earlier preview call) so this
  can't drift or be bypassed. A merge with zero affected objects and no source deletion is a pure no-op anyway
  (nothing rewritten, tags stay separate); cleaning up a truly-unused duplicate tag already has a simpler
  existing path (the plain "Delete" row action), so this gate doesn't need a `deleteSources`-only carve-out.
- **Gate 2a** (`checkDeleteSourcesGate`): deleting the source tags is only offered when the user can update *every
  taggable type that actually has a live reference to `fromIds` right now* — not literally every taggable type
  registered in the deployment. A dashboard-only editor can request deletion when the only tagged objects are
  dashboards, even though they can't update `osquery-pack`/`slo_template`/etc. That `affectedTypes` set must come
  from `core.savedObjects.getUnsafeInternalClient()` (an unscoped scan across all known taggable types), *not* the
  per-user client: a per-user `find()` across multiple types silently narrows to the types the caller can `find`
  rather than throwing on the rest (`api-server-internal/src/lib/apis/find.ts`), so computing `affectedTypes` from
  a permission-scoped client would make this gate either trivially pass (if scoped to the caller's own
  `updatableTypes`) or vacuous. `preview.ts` and `start.ts` both run this scan independently, same as
  `affectedCount` above.

Even when Gate 2a passes and `deleteSources: true`, the task's `finalizing` phase re-checks each `fromId`
independently right before deleting it (`server/tasks/tag_merge/task_runner.ts`) — a tag is deleted only if a fresh
scan finds zero remaining references, never based on the `updating` phase's earlier count. That scan also uses the
unscoped internal client rather than the per-user one, for the same silent-narrowing reason as Gate 2a above: it's
the only thing standing between "the merging user can't see every type" and actually deleting a tag some other,
invisible-to-them object still references. The tag deletion call itself still goes through the user's own scoped
client, so it's still bound by their own delete privilege on the `tag` type (part of the baseline gate) — only the
*visibility* check for "is it safe to delete" is unscoped.

### Cancellation semantics

Cancellation is cooperative, not immediate. `POST .../cancel` only flips `state.cancelRequested` on the task (via
`taskManager.bulkUpdateState`) and nudges the task with `runSoon` in case it's idle between self-reschedules; the
task checks that flag itself at the start of every run. Concretely:

- Any object reference already rewritten before the flag is observed stays rewritten — there is no rollback.
- If canceled during `updating`, the job stops before finalizing (deleting source tags), even if `deleteSources`
  was requested — so a partially-completed job never deletes tags mid-merge.
- A timeout (`abortController.signal.aborted`) is handled the same way as an explicit cancel within a phase: the
  `finalizing` phase's per-`fromId` loop is sequential specifically so it can stop between tags rather than firing
  every delete concurrently and losing track of what happened.

Because this task carries an encrypted `apiKey`/`userScope` (see "Per-user execution" above), **any**
`taskManager.bulkUpdateState`/`bulkUpdateSchedules`/`bulkUpdate`-style call against it — not just `schedule()` — must
pass `{ request }` in its options. `TaskStore.getSoClientForUpdate` throws synchronously otherwise ("Request is not
defined but some of the tasks have API key or user scope..."), and since that throw happens before `cancelRequested`
is ever persisted, the symptom is exactly "cancel returns a 500, and the merge just keeps running to completion as
if cancel was never called." `cancel.ts` passes `req` for this reason.

**Every terminal-state return (`canceled`, `success`, and the pre-work-abort bail-out) must still include a
`runAt`.** This task has no `schedule`, and Task Manager's `TaskManagerRunner.processResultWhenDone` treats *any*
run that returns without `runAt` as "this one-shot task is finished" — it deletes the task's saved object
immediately, without ever persisting that run's returned `state`. Returning the terminal state without `runAt`
therefore doesn't just skip a reschedule, it throws the terminal state away entirely: the next status poll finds no
task at all and falls back to reporting `idle`, which reads as "merge failed" in the UI even though it actually
succeeded or was cleanly canceled. The fix is for every phase to set a `runAt` (as usual) even on the run that
transitions to a terminal state — the following no-op run (the `case 'complete'` branch in `task_runner.ts`, which
correctly has no `runAt`) is what actually triggers cleanup, once the terminal state has had a chance to persist
and be observed by at least one poll.

### Singleton per space

At most one merge job may run per Kibana space at a time. The `task` saved object type is namespace-`agnostic` (not
space-aware), so the space id is encoded directly in the deterministic task id (`getTagMergeTaskId(spaceId)` →
`saved_objects_tagging:tag_merge:<spaceId>`) rather than relying on saved-object space partitioning. The start route
uses this id both to detect an in-progress job (409) and to clean up ("remove") a previous, already-finished job
before scheduling a new one in the same space — there is no separate garbage-collection task for abandoned/finished
jobs; the next `start` call in that space is what reclaims it.

Because it's singleton per space, a job started for one duplicate-name group blocks starting a merge for any *other*
group until it finishes — there's no per-group concurrency. This is an intentional scope cut, not an oversight
(proposal.md's open questions explicitly flag the follow-on "job visibility and ownership across multiple users" as
unresolved), but it has two UI-visible consequences that needed their own fixes:

- **Reattaching to a running job.** The job keeps running server-side regardless of whether the flyout that started
  it is still open — closing it, or navigating away, never stops or fails it. But since the job isn't tied to any
  particular duplicate-name group, `MergeDuplicateTagsFlyout` checks `mergeClient.status()` on mount and jumps
  straight to the `running` step if one is already in progress, rather than starting fresh at tag selection (which
  would otherwise 409 on "Start merge" with no way to see the job that's actually blocking it). This is why `running`
  and `done` never reference the flyout's own `tags` prop for anything — they only ever describe the actual running
  job's `status.job`, which may belong to a different group than the one the flyout was opened for.
- **Which tag is it merging into?** Since the running job's canonical tag may not be part of the flyout's own `tags`
  prop, `MergeDuplicateTagsFlyout` also takes an `allTags` prop (every tag in the space) purely to resolve
  `status.job.toId` to a name via `buildTagNameLookup` (`public/management/utils/tag_name_lookup.ts`) — otherwise
  there'd be no way to tell the user which merge is actually running. `TagManagementPage` also polls
  `mergeClient.status()` independently (`MergeInProgressCallout`), so a running job — and which tag it's merging
  into — is visible on the page itself without opening the flyout at all.

### Client-side cache invalidation

A merge that deletes duplicate source tags does so server-side, inside the async Task Manager task — not through
the browser's `TagsClient`. That means the shared `TagsCache` (`public/services/tags/tags_cache.ts`, used by tag
pickers everywhere else in the app: Dashboard, Visualize, etc.) never learns about the deletion through its normal
`onDidDelete` hook, which only fires on client-initiated deletes; without an explicit refresh, deleted tags would
keep appearing in those pickers — and the now-stale duplicate-tags warning would keep showing on the Tag Management
page itself — until the cache's own periodic refresh interval or a full page reload. `TagManagementPage`'s
`refreshAfterMerge` (`public/management/tag_management_page.tsx`) works around this by calling both `fetchTags()`
(refreshes this page's own `allTags`, so `DuplicateTagsCallout` recomputes correctly once a source tag is gone) and
`tagClient.invalidateCache()` (refreshes the shared cache). `invalidateCache()` is a thin wrapper the
`ITagInternalClient` interface adds around the existing (but oddly-named, for this purpose)
`TagsClient.fetchAllFromNetwork()` — a method that already existed, but only as a dual-purpose "fetch tags *and*, as
a side effect, sync the cache" primitive used by the cache's own periodic refresh (`public/plugin.ts`), which
actually needs the returned tag list. `invalidateCache()` exists so a caller that only wants the side effect, and
doesn't care about the return value, doesn't have to know that "fetch all tags from the network" is also how you
refresh the cache.

`refreshAfterMerge` has two triggers, and both are needed: the flyout's own `onMerged` callback (fires when the
flyout that started or reattached to the job is open and reaches a terminal state), and the page's own
`mergeClient.status()` poll detecting a transition from `in_progress` to anything else (fires even if no flyout was
ever open to observe the job finish — e.g. the user started a merge, closed the flyout, and never reopened it).
Relying on the flyout alone left the page showing a stale `DuplicateTagsCallout` warning for an already-deleted tag
indefinitely whenever nothing was watching the job when it finished.
