# Resource bootstrap

Applies resources declared in files, such as a mounted volume, to Kibana at
startup. Nothing is loaded unless `xpack.resourceBootstrap.enabled` is `true`.

```yaml
xpack.resourceBootstrap.enabled: true
xpack.resourceBootstrap.path: /usr/share/kibana/bootstrap
```

Disabling it again leaves its records in Kibana: the `resource-bootstrap-status`,
`resource-bootstrap-ledger` and `resource-bootstrap-requests` saved objects, whose types are only
registered while it is enabled. Like the saved objects of any disabled plugin, they stop the next
upgrade's migration unless `migrations.discardUnknownObjects` is set to the version upgraded to.
The resources it applied stay as they are.

## How it works

The files are the configuration. The ledger and the status are what the bootstrap knows about
earlier runs, and one lock guards them.

1. Each start hashes the files and its settings, takes the next number from a request counter in
   Elasticsearch, and schedules one Task Manager task that asks for a run with that number and
   those hashes. It does not apply or write anything else.
2. The run takes the lock through `@kbn/lock-manager`, reads and hashes the files, applies them in
   kind order, prunes what left them when `prune` is on, and records the outcome. Only a run
   holding the lock writes the status or the ledger.
3. The outcome is written to a single saved object and served by the status route.

There is no hot reload. Changed files are applied by the run the next start asks for.

The files are the source of truth: declared resources are aligned with them on every run,
including the spaces they are in, and changes made in Kibana are reverted. A `space` only updates the
fields its declaration sets (see [Kinds](#kinds)). Every start applies the
files again, even when they are unchanged, so a change someone made by hand to a declared resource
is reverted on the next restart. Re-applying is cheap: a resource the
bootstrap owns is left as it is when its declaration is unchanged and nobody changed it since the
bootstrap last wrote it (see [Planning](#planning)), so such a start mostly reads. A run skips
files that another run completed after reading them once this run was asked for, so replicas
that start together apply them once. Each completed run records the highest request number taken before it read the files,
and the counter orders requests the way Elasticsearch saw them, so the clocks of different Kibana
instances never decide whether a run is skipped. The
status shows the last run: `running` while it applies, then `completed` or `failed`.

Declared resources are expected to change only through the files. Nothing stops someone from
editing them in the UI or through the APIs, but the bootstrap does not coordinate with such
changes: one made while a run applies or prunes the same resource can be overwritten or deleted.
The bootstrap only notices changes made between runs, and only as described below.

Set `xpack.resourceBootstrap.reapplyOnStart: false` to apply only when the files, the settings or
the Kibana version change: a run whose files hash to the hash of the last `completed` run, with the
same `managed` and `prune` settings and the same Kibana version, applies nothing and leaves the
status as it is. Files whose last run was `failed` or `running` are still applied. Hand edits to
declared resources, and declared resources deleted by hand, then stay until one of those changes.

The served `hash` covers the files only; the run also records a hash of `managed`, `prune` and the
Kibana version inside Kibana. Changing any of them applies the files again on the next start,
whatever `reapplyOnStart` is, and a change of `managed` rewrites every owned resource of a kind that
honors it (see [Managed objects](#managed-objects)). After an upgrade, that run checks the files
against what the new version accepts, and leaves the owned resources nobody changed as they are (see
[Planning](#planning)).

## Planning

The bootstrap owns what it creates and records it in a ledger, one hidden saved object per owned
object. Before anything is written, each group of resources is compared with the ledger, as it was
when the run started, and with what is stored now:

| Owned | Stored now | Action |
| --- | --- | --- |
| no | missing | own it, then create it |
| no | exists | fail it: the bootstrap never takes over an object it did not create |
| yes | missing | create it again, after deleting it from the space it was declared in before if that changed |
| yes | exists, as last written | leave it as it is |
| yes | exists, anything else | write it, which reverts any change made by hand |

An object is owned before it is created, so a run stopped in between still owns it and the next
run creates it. When the create fails and the object is not there afterwards, or the create was
refused as a conflict, the bootstrap gives the entry up again, so it never owns an object someone
else created while the run applied. That covers a dashboard whose id already exists in another
space: dashboards are looked up in the space they are declared in, so it looks missing there, and
its create fails with a conflict. A kind that fails as a whole, for example before it writes
anything, is checked the same way. When the outcome of a create is unknown, because the run stopped
during it, or the objects could not be read after it, the entry stays and the id stays
owned, whether or not the create happened. The next run then treats it like any owned object: it
writes, moves or prunes whatever is stored under that id, even an object someone else created
there in the meantime, and gives the entry up only when a create fails again and leaves nothing
there, or is refused as a conflict. After each write the bootstrap records the declaration hash, the stored version and
`updated_at` right after the write, and the Kibana version. "As last written" means the same
declaration hash and the same stored version. Upgrading Kibana changes the version of the objects
its migrations rewrite but keeps their `updated_at`, so after an upgrade `updated_at` is compared
instead, and an upgrade does not rewrite every object. The declaration hash covers the document as
declared, keys in any order, its spaces, and `managed` for a kind that honors it. Anything that was
not recorded, or cannot be read after a write, counts as changed, so planning can only save writes,
never skip a change. When the stored objects of a group cannot be read, nothing of the group is
applied and the run is retried.

Only kinds with ownership take part. Every built-in kind has it (`space`, `data_view` and
`dashboard`); a kind without it is written on every run and never owned.

An object that exists but is not owned, for example one someone made by hand, fails without a
retry: delete it, or declare it with another id. This holds for spaces too, including `default`,
which Kibana creates, so the files cannot change a space they did not create. The ledger is the only record of what the
bootstrap owns, so if it is lost, every declared object that exists fails this way until it is
deleted.

The outcome is counted per kind in the status: `applied` resources were written, `created` of
them did not exist before, and `unchanged` ones were left as they were.

Runs apply one at a time, in the order they take the lock, and each applies the files it reads
then. Nothing orders one set of files against another, so the last run wins. Every replica must mount the same files: a
replica that restarts with older files applies them again, which undoes the newer run, and prunes
what the newer files kept when `prune` is on. Keep one set of files that is updated in place; do
not give each deployment its own. To make Kibana refuse older files instead, add a
[`REVISION` file](#revision).

Any instance that runs background tasks can claim a run, including one that is about to stop
during a rolling restart and still mounts the old files or runs the old version. So a run applies
only when the instance running it sees what the start that asked for it saw: the same file hash,
the same `managed` and `prune` settings and the same Kibana version. Otherwise it leaves the run
to another instance and tries again 30 seconds later, without using up an attempt, up to 10 times;
then it fails the run without a retry, with an error saying what differs. A run that a later start
asked for and that completed makes earlier runs skip without reading the files, even if a later
run fails. The highest successful request number is kept through running and failed status updates,
so an instance that claims a run of the old files after the rollout does not apply them.

The lock is held from reading the files to recording the outcome, and renewed until all of the
run's work has settled, including requests still in flight after Task Manager stopped it at
`xpack.resourceBootstrap.timeout`. A run that finds the lock taken tries again every 30 seconds,
without using up an attempt. Task Manager counts each wait as a successful run, so it also resets
the attempts: a run that failed before it had to wait gets `maxAttempts` attempts again.

A replica that dies while holding the lock blocks others until the lock expires, about 30 seconds.
The lock does not fence writes: if renewals fail for longer than that, for example while
Elasticsearch is unreachable from one replica only, another run can take the lock while requests
of the first are still in flight.

## File layout

All files sit directly in the mounted directory. There are no subdirectories, so a volume that
holds a flat set of files mounts as it is.

```
<path>/
  team.space.json                the space itself
  main.data_view.json            default space
  boards.dashboard.json          default space, or the spaces each dashboard names
```

- File names are `<name>.<kind>.<json|ndjson>`. JSON files hold one object or an array.
- A directory fails the run.
- Entries starting with `.` are ignored, which skips the hidden links some mounted volumes use to swap their content.
  Symlinks are followed.
- Files that change while they are read, such as a volume swapping its content, are read again,
  so a run never applies a mix of two versions. If they change during 3 reads in a row, the run
  fails with a `null` hash.
- Files naming an unregistered kind fail the run before anything is applied.
- An optional `REVISION` file orders sets of files (see [Revision](#revision)). It is not a
  resource file, so the naming rule does not apply to it.

### Revision

By default nothing orders one set of files against another (see [How it works](#how-it-works)).
To refuse older files, put a `REVISION` file next to them holding a non-negative integer of at most
15 digits, for example `42`, and raise it with every change of the files:

```
<path>/
  REVISION                       42
  main.data_view.json
```

- A run reads the revision with the files. When it is lower than the highest revision a run
  already started to apply, the run applies nothing, writes nothing, logs a warning and ends
  without an error, so the status keeps showing the newer run. A replica that restarts with an older
  mount is therefore refused.
- The highest revision is kept through `failed` runs, so files older than a failed run stay refused.
- The same revision is applied, so files that were edited without a new revision still apply, and
  a restart applies them again as usual.
- Without a `REVISION` file the files are ordered by the last run, as before. Files without one
  are applied whatever the status holds, and leave the recorded revision as it is. Adding the file later
  starts the order from its number.
- Rolling back on purpose means publishing the old files under a new, higher revision.
- The file is part of the hash, so raising the revision alone applies the files again, also with
  `reapplyOnStart: false`. A file that does not hold a valid number fails the run like an unreadable
  file, with a `null` hash.
- The revision is internal: the status route does not serve it.

### Spaces

A document names the spaces it is applied to in a top-level `spaces` array of space ids. The
field is removed before the kind validates the document, so each kind still takes exactly the
body of its dedicated API.

```json
{ "id": "overview", "title": "Overview", "spaces": ["marketing"] }
```

- Without `spaces`, the document goes to the default space.
- `spaces` must be a non-empty array of at most 100 ids that use `a-z`, `0-9`, `_` and `-`. Repeats and order are ignored.
- A space that does not exist when its resources are applied, after the `space` documents of the
  same files, is not an error: the resources are saved but cannot be seen in Kibana. The run logs a
  warning once for each such space, so check the logs for a mistyped id. The `space` kind tells the
  bootstrap which spaces exist. With the spaces plugin disabled, which only dev mode allows, no kind
  does, so only `default` exists, and the first other space a run names also logs a warning saying
  so.
- A kind with `spaces: 'isolated'`, such as `dashboard`, lives in one space, so a document names
  one. Naming several fails the run before anything is applied: dashboard ids are unique across
  spaces, so the same id cannot exist in two. To have the same dashboard in two spaces, declare it
  twice with different ids. Moving the declaration of a dashboard the bootstrap owns to another
  space deletes it from the space it was declared in before and creates it in the new one, as
  removing the declaration and adding it again would, so the history it had is lost. If it cannot
  be deleted there, it is not created in the new space and the run is retried. This holds for a
  dashboard owned before a create that was never confirmed too, since its id is owned (see
  [Planning](#planning)). A dashboard the bootstrap does not own is never deleted: declaring its
  id in another space fails with an error naming the space it is in.
- A kind with `spaces: 'shared'`, such as `data_view`, lives as one object in every space its
  document names, and only in those: spaces it was shared with by hand are removed on the next
  run. Listing its spaces in another order changes nothing.
- One object must be declared for one set of spaces. A data view id declared by documents that
  name different `spaces`, or a dashboard id declared in two spaces, fails the run before anything
  is applied, since each apply would undo the other.
- One object must also be declared once. Documents that declare the same id for the same spaces,
  in one file or in several, are each reported as invalid and none of them is applied, since the
  last would otherwise win on every run.
- A kind with `spaces: 'none'`, such as `space`, is global. A document of such a kind that names
  `spaces` fails the run before anything is applied.
- A space has to exist when a document names it. Spaces are applied first, so one declared in
  the same files is created before the documents that name it.

### Kinds

| Kind | Content |
| --- | --- |
| `data_view` | The `data_view` body of `POST /api/data_views/data_view`, so the whole spec that API accepts works, including `runtimeFieldMap`, `fieldFormats` and `fieldAttrs`. `id` is required, unlike in the API, so applies update the same data view. A data view whose name another data view already has in one of its spaces is reported as an error and not applied, instead of deleting the other one as the API's `override` would. When the files also declare that other data view under a new name, for any spaces, the run is retried after it gives the name up; two declared data views cannot swap names in one change, so rename one of them first. Two data views the files declare with the same name fail without a retry. It is one data view in every space its document names; `namespaces`, if given, must name the same spaces. A data view with its id that already exists in other spaces is moved into exactly the declared ones. Created without refreshing fields. Registered by the `data_views` plugin. |
| `space` | The body of `POST /api/spaces/space` (`id`, `name`, `description`, `color`, `initials`, `imageUrl`, `disabledFeatures`, and `solution` outside serverless). A space the bootstrap owns is updated as `PUT /api/spaces/space/{id}` updates it, so only the fields the declaration sets are written: see below. Never pruned. Registered by the `spaces` plugin, so it exists only when that plugin runs. |
| `dashboard` | `{ "id": "...", ...<body of PUT /api/dashboards/{id}> }`: the id next to the as-code dashboard body, exactly as that API takes it. Applied through the same upsert, so history is kept. `access_control` is rejected, since an access mode needs an owning user and these writes have none. Registered by the `dashboard` plugin. |

Spaces are applied first, then data views, then dashboards, so resources can be declared into a
space created in the same run and dashboards can reference the data views declared next to them.
Kinds not tied to a space, such as `space`, always apply before the others; after that each kind
follows the kinds it names in `dependsOn` (`dashboard` names `data_view`), and ties go by kind id.

There is no kind for saved objects in general: each kind wraps the dedicated API of one type, so
it gets that API's validation and behavior.

Spaces are global, so a `space` document cannot name `spaces`. They go through
the same `SpacesClient` as the API, so its rules apply, for example `xpack.spaces.maxSpaces`.

A space is owned like any other resource: one that exists and that the bootstrap did not create,
such as `default`, fails instead of being updated (see [Planning](#planning)). Updating a space
the bootstrap owns writes only what its declaration sets, so the files do not decide every field
of a space:

- `description`, `color`, `initials`, `imageUrl` and `solution` left out of the declaration keep
  their stored values. Removing one from the file does not clear it, and a value set by hand stays.
- In a space with a solution other than `classic` (a space without one counts as `classic`), the
  stored `disabledFeatures` are kept and the
  declared ones are ignored, so feature visibility changed by hand in such a space is not reverted.

To have the files decide a field, declare it. `name` and, in a `classic` space, `disabledFeatures`
are always written.

Spaces are never pruned: deleting a space also deletes every saved object inside it, far more
than the bootstrap created, so a space removed from the files stays in Kibana. It stays owned, so
declaring it again updates it.

### Trust boundary

The files are trusted input. Kinds apply them through internal clients, so Kibana's role-based
access control does not apply, and whoever can write to `path` can create or overwrite any
resource of a registered kind. Mount
the files read-only and restrict who can change them.

### Managed objects

`xpack.resourceBootstrap.managed` (default `true`) asks a kind to mark what it creates as
`managed`, the saved-object flag that lets applications stop users editing an object. It is a
request to each kind, and not every kind can honor it:

| Kind | Honors `managed` |
| --- | --- |
| `data_view` | Yes, it sets `managed` on the data view. |
| `dashboard` | **No.** The dashboard upsert has no way to set it, so dashboards are created with `managed: false` even when the setting is `true`. |
| `space` | **No.** Spaces have no such flag. |

So a dashboard declared in a file can still be edited in the UI, and an edit lasts until the next
apply overwrites it. Do not rely on `managed` to protect dashboards or spaces.

## Status

`GET /internal/resource_bootstrap/status` returns the record of the latest run. It needs the
superuser role, and as an internal route it is not a public API.

A run that completed:

```json
{
  "hash": "9f2c4e1a0b7d3c5e8f6a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6",
  "status": "completed",
  "startedAt": "2026-11-08T10:15:02.114Z",
  "finishedAt": "2026-11-08T10:15:09.870Z",
  "kinds": {
    "space": { "applied": 1, "created": 1, "unchanged": 0, "failed": 0 },
    "data_view": { "applied": 2, "created": 1, "unchanged": 5, "failed": 0, "pruned": 1 },
    "dashboard": { "applied": 0, "created": 0, "unchanged": 12, "failed": 0 }
  },
  "errors": []
}
```

Before any run:

```json
{ "status": "none", "hash": null, "kinds": {}, "errors": [] }
```

| Field | Content |
| --- | --- |
| `hash` | The hash of the files the run read (see below), or `null` when they could not be listed, broke a limit, did not match the naming rule or kept changing while they were read. |
| `status` | `none` before any run, `running` while one applies, then `completed` or `failed`. |
| `startedAt`, `finishedAt` | When the run started and ended; `finishedAt` is absent while it is `running`. Absent for `none`. |
| `kinds` | For each kind: `applied` resources were written, `created` of them did not exist before, `unchanged` ones were left as they were, `failed` ones were not applied, and `pruned`, when present, were deleted because they left the files. A resource is counted in `applied` or `unchanged`, not both. |
| `errors` | At most 100 errors, each `{ "kind", "spaceId", "id"?, "message" }`, with `message` cut to 1000 characters. `kind` is left out for errors of the whole run, such as a file that cannot be read, and `spaceId` for errors not tied to one space. |

A run of files that cannot be read ends `failed` with a `null` hash and `kinds` empty. A file with
invalid content still has a hash: the run ends `failed` with that hash and the problems in
`errors`. Until a run of new files starts, the record of the previous run is served, so a caller
waiting for some files to apply compares `hash` with the hash of those files and waits for
`completed`.

Each run that applies also logs its outcome, so the route is not needed to see what failed. A run
that completed logs the counts of each kind at `info`. A run that failed logs them at `warn` with
the first 10 errors, each with its kind, id and space:

```
Applying the bootstrap files mounted at /bootstrap (9f2c…) failed with 1 error: space: 1 applied, 1 created, 0 failed; data_view: 2 applied, 1 failed
- data_view "logs" in space "default": The data_view "logs" already exists and the bootstrap did not create it, so it is not applied. Delete it, or declare it with another id
```

### Hash

SHA-256, hex, over every non-hidden file ordered by relative POSIX path, feeding
`<relative path> NUL <content> NUL` for each.

## Pruning

Pruning deletes the owned objects that left the files. It is off by default because it deletes:

```yaml
xpack.resourceBootstrap.prune: true
```

It only ever deletes objects the ledger lists, never anything else in Kibana, and only when the run
applied everything without a single error and the files declare at least one resource, so an empty
mount, or one whose files were all emptied, cannot delete everything. Removing a kind's file, or
emptying it, removes its objects, like removing any other declaration.

A pruned object is deleted from every space it is in, whatever happened to it since the bootstrap
wrote it: an object the bootstrap owns stays its own, edited by hand or not, and the files decide
whether it exists. To keep an object, keep declaring it.

An object owned before a create that the bootstrap never confirmed is deleted too, since its id is
owned (see [Planning](#planning)); when the create never happened, there is nothing to delete and
the entry is forgotten.

A declaration that moves to another space keeps its object owned. An object that cannot be deleted
stays owned and is retried on the next run, and the failure is reported in the status
(`kinds.<kind>.pruned` counts what was deleted). With pruning off the ledger only grows, so enabling
it later also removes objects that left the files earlier. Entries of a kind that is no longer
registered, or whose `ownership` has no `remove`, such as `space`, are kept, since nothing can
delete their objects.

## Registering a kind

Owning plugins register their own resource types during `setup`. Registering later throws, because
the registry is frozen when this plugin starts. The `ResourceKind` contract and the helpers below,
`applyEach`, `toApplyError`, `createSavedObjectOwnership` and `NO_ATTRIBUTES`, come from the
`@kbn/resource-bootstrap-server` package; only the `ResourceBootstrapSetup` contract comes from this
plugin:

```ts
resourceBootstrap.registerResourceKind({
  // `a-z`, `0-9` and `_`, starting with a letter, at most 100 characters.
  id: 'my_kind',
  // Optional. Kinds to apply first, such as the ones its resources reference. A kind that is not
  // registered, for example because its plugin is disabled, is logged and left out of the order.
  // The names must not form a cycle, or Kibana with the bootstrap enabled fails to start.
  dependsOn: ['data_view'],
  // `isolated`: lives in the one space a document names. `shared`: one object in every space a
  // document names. `none`: global, applied once and before the others, so it may only depend on
  // other `none` kinds.
  spaces: 'isolated',
  // Throws a descriptive error for an invalid document. Runs at apply time, so it may build
  // schemas that depend on plugins registering later.
  parse: (document) => mySchema.validate(document),
  // Identifies a resource within its space. An id declared by more than one document of a group
  // is reported for each of them, and none is applied.
  idOf: (resource) => resource.id,
  // `declared` holds every valid resource of the kind in the files, for any spaces, such as one this
  // run applies elsewhere; it includes `resources`.
  apply: async ({ spaceId, spaces, resources, declared, managed, signal, logger }) => {
    // Idempotent upsert that does not rely on a user request. A `shared` kind makes each resource
    // live in exactly `spaces`. A kind without `ownership` also reports how many of the applied
    // resources it `created`, for the status; for the others the bootstrap counts that itself.
    return { applied: resources.length, errors: [] };
  },
  // Optional. Without it the kind is applied on every run, but never owned or pruned. Only for a
  // kind whose id names the same object in every space, as for a global object, one that can be
  // shared or one whose id is unique across spaces.
  ownership: {
    // `{ [id]: { version, updatedAt } }` for each id that exists, in every space the type can be
    // looked up in; `updatedAt` is optional. See Planning.
    versions: async ({ spaceId, ids }) => ({}),
    // Optional. Deletes the resources from every space they are in. Without it, owned objects that
    // leave the files are never pruned and stay owned. An `isolated` kind must have it, since a
    // declaration that moves to another space deletes the object from the space it was in.
    remove: async ({ spaceId, ids }) => ({ removed: ids.length, errors: [] }),
  },
});
```

For a kind with `spaces: 'none'`, `apply` receives no `spaceId` and no `spaces`, and its errors and
status entries carry no `spaceId`; `versions` and `remove` receive `spaceId: 'default'`, since a
client scoped to any space finds its objects. `spaces` is sorted, and for a `shared` kind, `spaceId`
is the first of `spaces`.

The top-level `spaces` field is reserved: the reader removes it from every document before `parse`
sees it, so a kind's spec cannot use a top-level field of that name.

Every error `apply` reports for a resource must carry the same id `idOf` returns. Set
`permanent: true` on an error that applying the same files again cannot fix, such as a declaration
that conflicts with an object only a person can change; a run whose errors are all permanent is not
retried. Set `conflict: true` on an error for a write refused because it conflicts with an object
already stored, so it created nothing: the bootstrap then gives up an object it owned only for that
create, even though an object with its id exists. `toApplyError` describes a thrown error, marks the
client errors a retry cannot fix permanent, and marks a 409 a conflict.
An id that `idOf` returns for more than one document of a group is reported for each of them, and
none is applied, whether or not the kind has `ownership`. An error without an id could belong to
any resource, so none of the group counts as written: nothing is recorded and the next run writes
them all again. `apply` must settle every write before it returns or throws: after a thrown error
the bootstrap reads which objects exist to decide which ids it still owns, so a write still in
flight would leave its object unowned.

`versions` must leave out the ids that do not exist, since the bootstrap creates exactly those, and
must throw when it cannot tell. Each `version` must change on every write. `updatedAt` is optional:
it must change on every write through the type's API and stay the same through Kibana upgrades, so
the first run after an upgrade does not rewrite every object. An owned id names one object in
every space: one id declared for different spaces fails the run before anything is applied, and a
declaration that moves to another space keeps its object owned. An owned id may be at most 1000
characters long, the most the ledger records; a longer one fails its document as invalid. Each kind
owns its own objects, so two kinds must not store the same objects: each would prune what the other
declares. `remove` must treat ids that no longer exist as success.

A kind that stores each resource as a saved object of one type that is not single-space can take
its whole `ownership` from `createSavedObjectOwnership`. `shareable` says
whether the type can live in several spaces: only then can its objects be looked up in every space,
so `versions` looks in all of them and `remove` deletes through a space the object is still in. A
space-isolated type is looked up in the declared space. A kind that must delete through its own
API, as `dashboard` does, gives its own `remove` after the spread.

Kinds write without a user request. With security enabled, the spaces extension of a saved objects
client checks every space a lookup names (`namespaces` on `find`, `'*'` on `bulkGet`) against the
user of its request, so such a lookup through `getUnsafeInternalClient()` fails. Look objects up
across spaces through `getUnsafeInternalClient({ excludedExtensions: [SPACES_EXTENSION_ID] })`
instead, and pass it as `getLookupClient` for a shareable type. That client ignores
`asScopedToNamespace`, so write through the client scoped to the space:

```ts
ownership: {
  ...createSavedObjectOwnership({
    type: 'my-type',
    shareable: true,
    getClient: async (spaceId) => clientFor(spaceId),
    getLookupClient: async () =>
      coreStart.savedObjects.getUnsafeInternalClient({ excludedExtensions: [SPACES_EXTENSION_ID] }),
  }),
},
```

A kind that writes its resources one at a time can build its `apply` result with `applyEach`. It
checks `signal` before each write, so a timeout stops the run instead of being reported as a failure
of the resource that happened to be next. Each error is reported under the resource's id: a thrown
one is described by `toApplyError`, or by `describeError` when given, and `write` can return the
details of a resource it refuses without throwing:

```ts
apply: async ({ resources, signal }) =>
  applyEach({
    resources,
    signal,
    idOf: ({ id }) => id,
    write: async (resource) => {
      if (isInvalid(resource)) {
        return { message: 'why it is refused', permanent: true };
      }
      await upsert(resource);
    },
  }),
```

A kind that loops on its own must call `signal.throwIfAborted()` outside the `try` that records
per-resource errors, for the same reason.

The one kind whose resources are the spaces themselves, `space`, also gives `spaceExists`, which
resolves whether a space exists and throws when it cannot tell. The bootstrap uses it only to warn
about resources applied into a missing space. Only one kind may give it, and that kind must have
`spaces: 'none'`, or registering it throws.

To add a kind to a plugin, the plugin needs:

1. a kind file, for example `server/resource_bootstrap/<kind>_kind.ts`, that returns the object above;
2. `resourceBootstrap` as an optional plugin in `kibana.jsonc`, and both
   `@kbn/resource-bootstrap-plugin` and `@kbn/resource-bootstrap-server` in `tsconfig.json` and
   `moon.yml`;
3. the optional `resourceBootstrap` setup dependency in its server types, and a
   `resourceBootstrap?.registerResourceKind(...)` call in `setup`;
4. a row in the kinds table above.

## Validation errors

Each resource is validated on its own, so problems in different resources are all reported in
one run. A single resource with several problems reports only the first one, because
`@kbn/config-schema` stops at the first failure. Fix that one, restart, and the next shows up.
Each error names the file and the entry in it, counted from 1, such as
`Invalid data_view resource in main.data_view.ndjson entry 3: ...`. An id declared more than once
names every place it is declared.

## Limits

The source is checked before any file is read, so one that is too big is rejected without being
loaded into memory. When a limit is exceeded nothing is applied and the status is `failed` with an
`null` `hash` and a message saying which limit, the same as for unreadable files.

| Setting | Default | Maximum | Limits |
| --- | --- | --- | --- |
| `xpack.resourceBootstrap.maxFiles` | 1000 | 10000 | The number of entries in the directory, misnamed ones included; hidden entries do not count. |
| `xpack.resourceBootstrap.maxFileSize` | `10mb` | `100mb` | The size of a single file. It must not exceed `maxTotalSize`. |
| `xpack.resourceBootstrap.maxTotalSize` | `50mb` | `500mb` | All the files together. Everything read is held in memory. |
| `xpack.resourceBootstrap.timeout` | `10m` | `2h` (minimum `10s`) | How long one run may take before Task Manager stops it. Read when Kibana starts. |
| `xpack.resourceBootstrap.maxAttempts` | 3 | 100 (minimum 1) | How many times Task Manager attempts one run before giving up. It replaces `xpack.task_manager.max_attempts` for this task. Read when Kibana starts. |

These limits are **not** capped, so keep them in mind for large sets:

- The number of resources. A run applies them one after another and is stopped when it reaches
  `timeout`. The stop takes effect before the next resource, so the one in progress finishes.
  Runs on a test cluster took roughly one to one and a half seconds per resource, which
  suggests a few hundred resources per run at the default `10m`. That is an estimate from a few
  runs, not a measurement, so raise `timeout` for large sets.
- Owned resources: the ledger has one document per resource and every run reads all of them, so
  very large sets make each run read more.
- Reported errors: at most 100 are kept in the status. Problems with the files are cut to 100 as
  well, the last one saying how many were left out. A message longer than 1000 characters is cut,
  in the status and in the logs, and ends with `…`.

## Failed runs

A run in which any resource failed is recorded as `failed` and then retried by Task Manager, up to
`xpack.resourceBootstrap.maxAttempts` attempts with its default backoff. When the attempts are used
up the task is dropped and nothing schedules it again until the next Kibana start, so the status
stays `failed` until then. A transient outage, such as Elasticsearch being unavailable for longer
than the retries last, therefore needs a restart to recover.

- Files that cannot be read, such as a missing directory or an I/O error, and files that are wrong,
  such as a bad name or invalid JSON, fail the run without a retry. Restart Kibana to try again.
- A run whose instance keeps seeing other files, settings or another Kibana version than the start
  that asked for it, 10 times 30 seconds apart, fails without a retry (see [Planning](#planning)).
  Make every instance mount the same files and run the same settings, then restart.
- A start that cannot schedule its run, for example because Task Manager is briefly unavailable,
  logs a warning and tries again, waiting 1 second at first and doubling up to 5 minutes, until it
  succeeds or Kibana stops. Until then the status still shows the previous run, since only a run
  writes it.
- A run whose only errors are an unregistered kind, documents that fail validation, one object
  declared for different spaces or more than once, or errors a kind marks permanent also fails
  without a retry, since applying the same files again gives the same result. So does a declared
  object that exists but that the bootstrap did not create (see [Planning](#planning)). The
  permanent errors of the kinds here are a data view whose `namespaces` differ from its `spaces` or
  whose name a data view the files do not declare, or declare with the same name, has, a
  dashboard whose id exists in another space, and a write the API rejects as a bad request (400,
  413 or 422), such as a body it does not accept or `xpack.spaces.maxSpaces` reached. Other client
  errors, such as a 401 or 403 from an expired credential or a write block on the index, are
  retried.
- If the ledger cannot be read or written, or the stored objects of a group cannot be read, the run
  is reported as `failed` and retried. An object owned before its create failed is created by the
  next run.
