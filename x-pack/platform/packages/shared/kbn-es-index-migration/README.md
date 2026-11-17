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
  execution: 'lifecycle',
  versions: {
    2: { change: 'additive', mappings: mappingsV2 },
    3: { change: 'data', run: backfillEventIngested },
  },
});

// Once, at plugin setup. Registration rejects a duplicate id, which would otherwise
// silently merge two migrations in status, metrics and logs.
const registry = createMigrationRegistry();
registry.register(assetCriticalityMigration);

// At the point your plugin chooses to run it.
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

- `lifecycle` - the plugin calls `reconcile` from its own startup path
- `triggered` - runs only when an operator or API invokes it

A third mode, `auto`, is the eventual goal: a shared background task running migrations
unattended. It is deliberately not in the type yet. Running migrations nobody asked for needs a
registry spanning plugins, owning a Kibana lifecycle and a Task Manager task - none of which a
package can provide. A registry here is per-plugin, which is enough for the two modes above.

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

## Status

Phase 1 - concrete indices only. Still to come: the gate that verifies a change declared `additive`
really is, cluster-wide coordination with per-namespace fan-out, the predefined metric set, and a
data stream backend.
