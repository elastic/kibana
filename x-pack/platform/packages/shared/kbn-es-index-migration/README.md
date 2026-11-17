# @kbn/es-index-migration

A shared way to keep an Elasticsearch index's shape in step with the code that expects it.

Kibana has a mature mechanism for migrating Saved Objects. It has none for Elasticsearch indices,
so teams built their own - five overlapping mechanisms exist today, none deprecated. The result is
that mapping changes silently never reach deployments that upgraded rather than installed fresh.

## The idea

A plugin **declares** its index versions. The library **reconciles** the real index against them,
and **reports** what happened.

The shift that makes it work is the question being asked:

```
install     "is it missing?  -> create it"      runs once, then skips forever
reconcile   "is it current?  -> close the gap"  runs always, no-ops when equal
```

An existence check cannot tell a new schema version from a deleted index, which is why
install-once never applies anything on upgrade.

## Usage

```ts
import { createMigrationRegistry, defineMigration, reconcile } from '@kbn/es-index-migration';

export const assetCriticalityMigration = defineMigration({
  id: 'asset-criticality',
  resource: { kind: 'index', name: (namespace) => getAssetCriticalityIndex(namespace) },
  baseline: 1,
  execution: 'auto',
  versions: {
    2: { change: 'additive', mappings: mappingsV2 },
    3: { change: 'data', run: backfillEventIngested },
  },
});
```

```ts
// setup - registration rejects a duplicate id, which would otherwise silently merge two
// migrations in status, metrics and logs.
this.registry = createMigrationRegistry({
  pluginId: 'securitySolution',
  taskManager: plugins.taskManager, // required for `auto`
  timeout: '45m',                   // optional, defaults to DEFAULT_TIMEOUT ('10m')
});
this.registry.register(assetCriticalityMigration);

// start
await this.registry.start({
  taskManager: plugins.taskManager,
  getEsClient: async () => (await core.getStartServices())[0].elasticsearch.client.asInternalUser,
  getNamespaces: () => listSpaceIds(),
  logger: this.logger,
  interval: '30m',                  // optional, defaults to DEFAULT_INTERVAL ('60m')
});
```

`timeout` belongs at setup because it is part of the task definition; `interval` belongs at start
because it is part of the schedule. Raise `timeout` when migrations are heavy (a large backfill,
many namespaces) and lower it when they are trivially fast, so a wedged run releases its slot
sooner.

For `lifecycle` or `triggered` migrations, skip the task wiring and call `reconcile` yourself:

```ts
const result = await reconcile({
  definition: assetCriticalityMigration,
  esClient,
  logger,
  namespace,
});
```

### `baseline`

Indices already running in customer clusters carry no version stamp, so the library cannot tell how
far behind they are. `baseline` says what to assume for an unstamped index. It is what makes
adoption possible without touching live data first.

### Change kinds

| Kind | Meaning | Who applies it |
|---|---|---|
| `additive` | The shape gains something | The library, in place |
| `data` | The documents themselves change | The plugin - declared and ordered here |

**There is deliberately no `breaking` kind.** Elasticsearch cannot change a field's type in place.
A change that needs one is performed by decomposing it across releases - add a new field, fill it
in, stop writing the old one - so old and new Kibana keep working throughout a rolling upgrade.
Allowing `breaking` to be declared would turn the guard into an escape hatch, and escape hatches in
this space get used.

### Execution

`execution` says **who pulls the trigger**, never how the work is done:

- `auto` - a background task runs it unattended
- `lifecycle` - the plugin calls `reconcile` from its own startup path
- `triggered` - runs only when an operator or API invokes it

`auto` needs a Task Manager, and the consumer supplies its own. That is what lets a package own a
background task without becoming a plugin, and Task Manager's claim then provides
once-per-cluster execution for free. One task type and one task instance per consuming plugin,
not per migration, so `registerTaskDefinitions` is called exactly once during setup while
migrations can still be registered afterwards.

Two guards exist so the wiring cannot be silently wrong. Declaring `auto` without supplying a
`taskManager` throws, rather than producing a migration that never runs and never complains.
Calling `register` after `start` also throws, since Task Manager only accepts definitions during
setup and the task may already have run.

**Run history is persisted for `auto` only.** The other two modes hand their `ReconcileResult`
straight back to a caller who is standing there to receive it; `auto` fires with nobody watching,
so its outcome is kept in the task's state to stay answerable later. A consequence worth knowing:
the status of a `lifecycle` migration shows the version gap but not the last error, which lives in
the plugin's own startup logs. A missing error there does not mean success.

The library always owns classification, locking, idempotency, retry, status and metrics. The
consumer only chooses when it runs and how it orders against its own work. Both halves matter: if
consumers could override the first, every adopter would drift apart; if they could not control the
second, the biggest existing migrations could not adopt it at all.

## Two Elasticsearch behaviours this encodes

Both were confirmed against a live cluster, and both are easy to get wrong:

- **The version is read from and written to the concrete index, never the index template.** A
  template update does not touch indices that already exist, so a template's `_meta` always reports
  what the current code intends - it can never reveal that an index is behind.
- **`_meta` is replaced wholesale, not merged.** Every write therefore sends the complete object.
  A partial write would erase the version, and the next reconcile would fall back to `baseline` and
  re-apply everything.

## Scope: per-namespace or global

A resource either exists once per space, or once for the whole deployment:

```ts
// one index per space - the default, and the common case
resource: { kind: 'index', name: (namespace) => `.entities-${namespace}` }

// one index shared by every space
resource: { kind: 'index', scope: 'global', name: () => '.my-shared-index' }
```

A discriminated union rather than a flag, so a `global` resource **cannot** reference a namespace -
the type rejects it instead of relying on the author to remember. Getting this wrong is otherwise
invisible: a global index reconciled per namespace still ends up correct, because the first pass
stamps the version and the rest no-op, while quietly costing a request pair per space and
over-counting every metric.

With `scope: 'global'`, the sweep runs once, the concurrency guard treats it as one resource, and
status reports one entry.

## Reconciling every namespace

`reconcile` handles one namespace. `reconcileAll` sweeps them all:

```ts
const results = await reconcileAll({ definition, esClient, logger, namespaces });
```

Sequential rather than parallel - namespaces are independent indices, but a migration is never
latency-sensitive and a hundred spaces reconciling at once is a load spike for no benefit.

**One namespace cannot stop the others.** A space whose index is in a bad state should not leave
every other space un-migrated, so a failure is recorded against that namespace and the sweep
continues.

## Overlapping runs

Reconciles of the same migration and namespace are shared within a process: a second caller gets
the first one's promise rather than a second run. Applying the same additive mappings twice is
harmless, but a data step is the plugin's own code and may not be idempotent.

Across nodes, `auto` is covered by Task Manager's claim. `lifecycle` and `triggered` are driven by
their caller, so avoiding a concurrent run there is the caller's responsibility.

## Status

```ts
const status = await getMigrationStatus({ definition, esClient, namespaces, lastRun });
```

Derived from Elasticsearch each time rather than cached, because the index is the only thing that
knows what was applied to it. `versionsBehind` reports the furthest behind any namespace is -
sustained above zero is the signal that something is stuck.

`lastRunRecorded` is deliberately three-valued rather than a nullable error:

| Value | Meaning |
|---|---|
| `yes` | An `auto` migration that has run; `lastRun` holds the outcome |
| `never_run` | An `auto` migration that has not run yet |
| `not_applicable` | Not `auto`, so no record is kept - the error is in the plugin's own logs |

Without that distinction, a blank error on a `lifecycle` migration reads as "it succeeded" when it
actually means "we never kept a record."

## Status of the package

Concrete indices only. Still to come: the predefined metric set, and a data stream backend.
