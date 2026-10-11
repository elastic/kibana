# Proposal: migrate value lists to lookup indices

## What value lists are

Value lists are named sets of values that security users keep in Kibana. Each list
has a type (keyword, ip, ip_range, and others) and holds many items of that type. A
user creates a list, fills it with items, and references the list from detection rule
exceptions.

Today value lists live in two shared data streams per space: `.lists-<space>` for the
list metadata and `.items-<space>` for every item of every list in that space. The
items index has one field per supported type, and each item fills the single field
that matches its list type.

For example, two lists of different types in the `default` space:

```
// .lists-default: one document per list (metadata)
{ "id": "malicious-domains", "type": "keyword",  "name": "Malicious domains" }
{ "id": "corp-ranges",       "type": "ip_range", "name": "Corporate ranges" }

// .items-default: every item of every list, keyed by list_id.
// Only the field matching the list type is set, the other 22 type fields are null.
{ "list_id": "malicious-domains", "keyword":  "evil.example.com" }
{ "list_id": "malicious-domains", "keyword":  "bad.example.org" }
{ "list_id": "corp-ranges",       "ip_range": "10.0.0.0/24" }
```

Detection rules use value lists mainly through exceptions. An exception entry of type
`list` tells a rule to include or exclude events whose field value belongs to the
list. Small lists compile into the rule query as a terms or range filter. Large lists
apply after the query, page by page, by searching the items index for the values seen
in each page. Indicator match rules can also use the items index itself as a threat
index.

## Problems today

**Access is all or nothing per space.** Value list access is granted for a whole Kibana
space, not per list. Anyone with read in a space can read every value list in that space,
and anyone with write can edit or delete every one of them. There is no way to grant
access to some lists and withhold others, because all lists share the same two indices.

**The model does not fit an ES|QL future.** As rules move to ES|QL, membership is
naturally a join against an index, and the shared items index cannot be joined cleanly:
its key would depend on the list type (`keyword` for one list, `ip` for another), every
list's items share the index so a join spans all of them unless it filters `list_id`, and
a value in two lists matches twice. It is also a data stream, not the lookup mode index
that `LOOKUP JOIN` needs. So membership today relies on custom code that reads items and
rebuilds filters, and one index per list is what gives ES|QL a clean index to join later.

## Proposal: one lookup index per list

Store each value list in its own lookup mode index. A lookup index is single shard and
exists for joins. The index holds only the values of that one list, in a simple shape:
a single `value` column for equality lists, and two bound columns (`range_start`,
`range_end`) for range lists.

Equality membership then becomes a lookup on `value`. Range membership becomes a lookup
on the two bounds. The index is read live, so an edit to a list takes effect on the next
rule run, the same as today, in a storage shape that a later ES|QL migration can join
directly with a `LOOKUP JOIN`. That ES|QL migration is a separate step; this proposal is
the storage swap that enables it.

## Supported types

Value lists are a general feature, not only an exceptions feature. Users create lists of
any of the 23 element types today, and the new implementation supports all of them for
storage and management, at parity. Each list becomes a lookup index with a column of its
own type: a single `value` column for scalar types, the source and coalesced bounds for
range types, and the native column for the rest. Create, add items, export, and delete
work for every type.

Membership in exceptions is a subset, the same subset as today: keyword, ip, and
ip_range. These are the types the join can evaluate, so they produce working exception
behavior. The other types are stored and managed like any list, but do not drive
exception membership. That matches today, where those types are storable but not
functional as exceptions.

The subset can grow with no new machinery. Any equality scalar (numeric, date, boolean)
is a typed `value` column with an equality join. Any range type (date_range and the
numeric ranges) reuses the two bounds and coalesce path. Geo is the only family the join
cannot express, because a spatial predicate is not allowed in the join condition, so geo
lists stay storable but not joinable, as today. Text uses match semantics, not a join
key, so it also stays storable only.

## Why lookup indices work for us

Value list size telemetry supports this layout. Across 796 reporting clusters and 3,745
lists, half of all lists hold 15 items or fewer, 90% hold 676 or fewer, and 99% hold
about 39,000 or fewer. Only 20 lists (0.53%) hold more than 100,000 items, and only two
hold more than one million.

The largest list observed is a customer ip list of about 151.6 million items. That is
near 7% of the roughly 2.1 billion document limit of a single shard. So a single shard
index per list has enough capacity for every list we see today, with wide headroom.

The distribution also shows most lists are tiny, which raises the one real concern with
one index per list: many small indices add shard and cluster state overhead, and the per
node shard limit (1,000 by default) is shared with the data indices. Telemetry shows this
is not a problem in practice. Across 784 clusters the count of value lists per cluster is
small: median
2, 90th percentile 10, 99th percentile 49, and a single largest of 237. So for almost
every cluster value lists take tens of shards, a small slice of the budget, and only one
cluster reaches a few hundred while still staying within the limit. One index per list is
therefore the design, and it is good enough for the fleet as it stands. If a cluster ever
grows to many hundreds of lists on few nodes, sharing the small unrestricted lists into
one index is a possible fallback, but the numbers do not call for it and it would trade
away per list access control, so it is out of scope here.

The type mix supports the design. Almost all lists are the functional types: keyword,
ip, and ip_range together are about 97 percent of lists. Range lists (ip_range) are about
12 percent, present in roughly a third of clusters with lists, so the source and coalesced
range storage matters for a real but minority slice.

## Why one index per list, not one shared index

A fair question is why not keep every list in one shared index with a `list_id` column
and filter it in the join, instead of one index per list. Correctness is not the reason.
A shared index does work if the `list_id` filter goes inside the join condition, for
example `ON field == value AND list_id == "listA"`, which Elasticsearch accepts and which
returns one row per event with no fan out. Filtering `list_id` after the join is a trap,
because a value that is in two lists survives a not in list A filter (it still matched
another list's row), so the filter has to be in the join.

The reasons to go per list are access, scale, and isolation.

- Access. This is the main goal of the change. You cannot grant read on one list and not
  another when all lists are documents in one index, so a shared index reproduces today's
  all or nothing per space model. Per list indices allow plain Elasticsearch index
  privileges per list. Approximating this on a shared index needs document level security
  to filter `list_id`, a licensed feature with per query overhead and far more moving
  parts than an index privilege.
- Scale. Lookup indices are single shard. One shared index holds every list's items in
  one shard, and the largest single list observed is about 151.6 million items, so a whole
  space in one shard reaches the single shard ceiling and becomes a hotspot. Per list puts
  each list in its own shard, so the limit applies per list.
- Load. Every rule that references any list would join the one shared shard, and each per
  row lookup scans the full shared index filtered by `list_id`. Per list joins a small
  index and spreads load across shards.
- Isolation. Per list TTL, drop on delete, mapping, and blast radius. A shared index
  couples the lifecycle and failure modes of every list.

A per list lookup index is also what lets a future ES|QL rule use the list directly with
a `LOOKUP JOIN`, which is the migration this storage swap sets up.

## One match per value

A later step is to have ES|QL rules use value lists directly through a `LOOKUP JOIN`. A
list becomes an index the rule query joins, for both membership and exclusion. The lookup
index shape, and the one match per value rule below, exist to set that up. This is future
work, not part of the V1 storage swap.

`LOOKUP JOIN` is a left join, so for each event it returns one row per matching list
document. If a value matched two documents, the event would produce two rows, and the
rule could raise duplicate alerts. So every value must match at most one document. This
is why the joinable form is deduplicated and its ranges do not overlap: one document per
distinct equality value, and ranges merged into disjoint intervals so any value falls in
at most one. This does not change membership, because a value list is a set and the
merged intervals cover the same points, so every rule produces the same alerts.

At the same time we keep the authored items as they are, duplicates and overlaps and all,
as separate source documents. They are the user input, and they drive export and listing.
So a range list holds two forms: the authored form, which can repeat and overlap, for
fidelity, and the derived disjoint form, which the join uses. Equality lists need only the
first, because a set has no overlap to merge, so they only drop exact repeats.

## Migration plan

**Feature flag.** A flag controls whether new value lists are created in lookup indices.
While the flag is off, nothing changes and every new list is legacy. While the flag is
on, every new list is created as a lookup list, and existing legacy lists can be
migrated. The flag is the storage default for new lists, not a per list choice on the
create request.

**Existing lists stay as they are.** Migration is opt in, per list. A legacy list keeps
living in the shared `.lists-<space>` and `.items-<space>` streams, and behaves exactly
as today, until the user triggers its migration. A cluster that never enables the flag,
or a user who never triggers a migration, sees no change at all.

**Two origins of lookup lists.** A lookup list exists in one of two ways. First, a list
created directly as a lookup list while the flag is on. Second, a legacy list that the
user migrated. The difference matters for naming, see below.

**Migration action.** When the user triggers migration for a list, the action creates
its lookup index, copies its items into the new shape (equality values into `value`,
ranges into `range_start` and `range_end`), and sets the list `storage.type` to
lookup. The copy also normalizes items: it drops duplicate values and merges
overlapping ranges, so each value matches at most one document. This keeps the same
membership result while letting a join return one row per value. Once `storage.type` is
lookup, the ListClient routes every read and write for that list to the lookup index.
The list id and the exception references never change, so rules and exceptions keep
resolving the same list.

**Index naming.** A lookup index name uses the space id and the list id, for example
`.value-list-<spaceId>-<listId>`. It never uses the space name or the list display
name, because both are mutable. The space id is fixed for the life of the space, so a
space rename does not affect index names. A list created directly as a lookup list has
an id we control, so its name is always legal. A migrated legacy list may have a free
form id from before, so the migration validates the id, or hashes it for the index name
and keeps the real id in the registry. This id check applies only at migration time.

**Both versions coexist.** Legacy lists and lookup lists live at the same time. Every
list carries a storage descriptor in its `.lists-<space>` document, and a missing
descriptor reads as legacy. The APIs and the rule types work with both. A user can
migrate lists one at a time, or not at all.

**Legacy item cleanup.** After a list migrates, its rows in the shared `.items-<space>`
stream are no longer read. The migration can delete them once it verifies the copy, or
keep them for a short rollback window during which setting `storage.type` back to data
stream restores the legacy list, and delete them on a later pass. The shared streams shrink as lists
migrate, and we can retire them only when no legacy list remains.

**Exceptions reference either.** An exception entry references a list by id and type, as
it does today. Nothing in the exception changes when a list migrates. The reference
resolves the same way for both storage kinds.

**Rule executors support both.** All list access already uses one client, the
ListClient. We keep its method signatures and add a resolve step inside it. The client
reads the list metadata once, learns the storage kind, and uses the matching internal
strategy to read the list. Every rule type that tests membership (custom query,
threshold, EQL, ES|QL, ML, new terms, and indicator match exceptions) keeps calling the
same client methods and does not change. ES|QL rules keep working exactly as today,
through the same filter they use now.

The one path that needs more than the storage descriptor is indicator match when it
uses a value list as a threat index. There the query shape itself differs by storage. We give
the client a resolve method that returns a threat source plan for the list. For a
legacy list the plan uses the shared items index, as today. For a lookup list the plan
uses the list index and maps the field to `value`. Indicator match runs the plan and
never branches on storage itself. One place owns the difference, and both cases work.
This path is not a corner case: telemetry shows 144 clusters and 454 rules use a value
list as a threat index today, so supporting both storage kinds here is a real
requirement.

**Endpoints stay stable.** The public list and item endpoints keep one contract and
select the storage inside. Clients never choose a legacy or a lookup endpoint. We add
only a migration action and a read only storage field on the list metadata, so the UI
can show state and offer migration.

## Registry and storage descriptor

**The registry is the existing list container.** We do not add a new store. The
`.lists-<space>` container already holds one document per list with its metadata, and
already supports find and sort. We extend that document with a `storage` field. This
plays the registry role for every list, legacy or new, so `_find` keeps querying
`.lists-<space>` as it does today.

**No upgrade migration.** A list created before the feature has no `storage` field, and
the resolve step reads a missing `storage` as `{ type: 'data_stream' }`. So every
pre-existing list is correct with zero writes. The new field reaches the mapping through
the path that already runs on startup, where the plugin reapplies the list templates, so
the schema change is additive and needs no data move.

**Metadata for every list stays in `.lists-<space>`.** Only items diverge by storage.
Legacy lists keep their items in the shared `.items-<space>`. Lookup lists keep their
metadata in `.lists-<space>` like every other list, and hold their items in the per list
index. So `.lists-<space>` is the one place that names all value lists, whatever their
storage.

**The storage descriptor.** Each list document carries:

```
storage: {
  type: 'data_stream' | 'lookup_index' | 'regular_index' | ... ,
  locator: { ... }   // the concrete location, e.g. { index: '.value-list-<spaceId>-<listId>' }
}
```

`storage.type` names the storage kind. `storage.locator` holds the real location, stored
and not derived, so a naming change or a new storage kind needs no convention rewrite.
Legacy lists use `{ type: 'data_stream' }`, or no `storage` field at all, which reads the
same, with items in the shared `.items-<space>`. New lookup lists use
`{ type: 'lookup_index', locator: { index } }`, with items in the per list index.

**Metadata and items are separate.** Metadata always lives in the `.lists-<space>`
document. Items live where `storage` says. A migration rewrites items and changes `storage`, and leaves
metadata, id, and exception references untouched. A later move to a different storage
kind is the same operation with a new `storage.type` and a new strategy.

### Resolution through the ListClient

The ListClient stays the single entry point and keeps its method names. It gains one
private step, `resolveList(id)`, which reads the `.lists-<space>` document once (cached
per request) and returns the metadata plus a store strategy chosen by `storage.type`.
Every public method then falls into one of three groups.

**Item methods resolve and dispatch.** These read or write a single list's values:
`searchListItemByValues`, `getListItemByValues`, `getListItemByValue`, `getListItem`,
`findListItem`, `findAllListItems`, `createListItem`, `updateListItem`, `patchListItem`,
`deleteListItem`, `deleteListItemByValue`, `importListItemsToStream`,
`exportListItemsToStream`. Each resolves the list, then calls the matching method on the
store strategy. The data stream strategy does what the code does today against
`.items-<space>`. The lookup strategy reads and writes the per list index in the `value`
or bounds shape, and normalizes on writes. Callers see the same signatures and results.

**Container methods use the registry.** These read or write list metadata: `getList`,
`findList`, `createList`, `createListIfItDoesNotExist`, `updateList`, `patchList`,
`deleteList`. Reads return the `.lists-<space>` document. `findList` queries
`.lists-<space>`, as it does today, so it spans legacy and new lists in one place.
`createList` writes the document, sets `storage.type` from the flag or the request, and
provisions the storage: it ensures the shared streams for a data stream list, or creates
the per list index for a lookup list. `updateList` and `patchList` write metadata only,
with no item movement. `deleteList` runs the existing exception reference checks, deletes
the document, and removes the item storage, which is the list rows in `.items-<space>`
for a legacy list, or the whole per list index for a lookup list.

**Infrastructure methods stay with the shared streams.** These are space level, not per
list: `getListName`, `getListItemName`, the index and data stream existence checks,
`createListBootStrapIndex`, the template and policy getters and setters, the data stream
migration methods, and the delete index, template, and policy methods. They manage the
shared legacy streams and remain while any legacy list exists. `createList` reuses a per
list provisioning path when `storage.type` is lookup. The shared stream methods can be
retired only when no legacy list remains.

**Indicator match reuses the same resolution.** When a rule uses a value list as a
threat index, indicator match asks the resolved list for a threat source plan. A legacy
list returns a plan that uses the shared items index, as today. A lookup list returns a
plan that uses the per list index and maps the field to `value`. The resolution is the
same `resolveList` step, so this path stays in step with the rest.

**One resolution detail.** A few item methods take only an item id, not a list id:
`getListItem`, `updateListItem`, `patchListItem`, `deleteListItem`. In the shared stream
the item carries its `list_id` and lives in one index, so a search by id finds it. In
the lookup model an item id alone does not name its index. So these methods first
resolve the owning list, either from a list id the route already holds, or by locating
the item, and then dispatch to the strategy. Equality lists make this direct, because
the item id is the value.

## V1 rule execution per rule type

The goal of this work is to swap value list storage and keep V1 rule execution working
unchanged, so a later ES|QL migration can build on it. In V1 nothing about the rule
engines changes. The ListClient resolves the list, reads from the lookup index, and the
two existing execution paths run against it:

- Inline, for a small list: the exception builder reads the list values and builds the
  same terms or range filter on the event field. For a range list it reads the coalesced
  bounds and emits one range clause per interval.
- Post filter, for a large list: the executor queries the per list index once per page of
  results, a terms on `value` for equality, or `range_start <= v AND range_end >= v` for a
  range. Only custom query without suppression, indicator match, and ML use this path.

| Rule type | Small list | Large list | With lookup indices |
|---|---|---|---|
| Custom query (no suppression) | inline | post filter | both repoint to the per list index; the post filter is cheaper (one small single-type index, no `list_id` filter) |
| Custom query (suppression) | inline | skipped, warns | small repoints; large still skipped |
| Indicator match | inline | post filter | both repoint; plus the threat index case below |
| Threshold | inline | skipped, warns | small repoints; large still skipped |
| EQL | inline | skipped, warns | small repoints; large still skipped |
| ES\|QL | inline (DSL filter) | skipped, warns | small repoints; large still skipped; works as today |
| ML | inline | post filter | both repoint |
| New terms | inline | skipped, warns | small repoints; large still skipped |

The swap is transparent to every rule type. The engines that apply large value lists
today (custom query without suppression, indicator match, ML) keep doing so, now against
a smaller, cleaner index.

### Indicator match threat index

Today the rule points its threat index at the shared `.items-<space>`, filters the threat
query by `list_id`, and the executor applies a sort special case. With a migrated list the
items live in the per list index, so the resolved threat source plan points the same threat
search at that index and maps the source field to `value`. That plan is cleaner than
today: it needs no `list_id` filter, because the index is the list, and it drops the sort
special case, which existed only to cope with the shared stream. Legacy lists keep the
current path, lookup lists use the new plan, both are supported.

### Limitations that disappear now

- The ip_range dash notation cap and the dash versus CIDR asymmetry. Today the builder
  turns each dash range into its own clause and refuses an exception above 200 of them,
  while CIDR ranges are exempt. In the lookup model ranges are coalesced disjoint bounds,
  so the builder emits one clause per interval with no dash versus CIDR split and no per
  dash explosion. Range lists are handled uniformly by size, like any other list.
- The sparse items index and cross list scans. The post filter now queries a small single
  type per list index with no `list_id` filter, instead of the shared index that holds
  every list's items across 23 mostly null fields.
- Deleting a list drops one index, instead of a delete by query over the shared stream.

### Limitations that remain in V1

Be clear about the boundary. The storage swap does not change which engines apply large
value lists. Large value list exceptions are still skipped on threshold, EQL, ES|QL, new
terms, and custom query with suppression, with the same warning, and the small versus
large split still applies to these engines. These are out of scope for the storage swap
and are what the later ES|QL migration is meant to address.

One thing the swap does make easier: because a per list index is small and cheap to
query, extending the existing post filter to the engines that skip today is cheaper to
justify. That is still a code change per rule type, not a free effect.

## Export, import, and range storage

**Two document kinds for range lists.** An equality list stores one document per value,
keyword, with the value as the document id. A range list stores two kinds of document in
the one index, told apart by a `kind` field:

```
kind:        keyword    # "source" | "coalesced"
value:       keyword    # authored string, verbatim   (source docs)
range_start: ip         # join bound                   (coalesced docs)
range_end:   ip         # join bound                   (coalesced docs)
```

A source document keeps the authored value exactly as the user typed it and carries no
bounds. A coalesced document carries the disjoint bounds and no value. Storing the
authored string as a keyword also avoids the Elasticsearch `ip_range` dash notation
limit, because we never ask Elasticsearch to parse the authored string.

**Sources are the source of truth, coalesced is a derived cache.** A write edits the
source documents, then rebuilds the coalesced documents from the sources: read the
sources, sort by start, merge overlaps and, for discrete types, adjacents, then replace
the coalesced documents with deterministic ids so the rebuild is idempotent. Adding an
overlapping range, and deleting one that splits an interval, both fall out of the
rebuild with no special case. Because the coalesced documents are a pure function of the
sources, they are always rebuildable. If they drift or are lost, a repair job recomputes
them from the sources. The sources are the only thing we must not lose.

**Adding a range, step by step.** When a user adds a range, the write does two things.
First it indexes one source document with the authored value, verbatim, and nothing else
changes yet. Then it rebuilds the coalesced documents from the sources:

1. Read every source document of the list.
2. Parse each authored value into bounds. A CIDR becomes its network and broadcast
   bounds, a dash range becomes its two ends, a bare value becomes a zero width interval.
3. Sort by start and merge. While the next start is at or below the current end, or is the
   next value after it, extend the current interval. Ip, integer, and date are discrete,
   so adjacent intervals merge too. Double and float are continuous, so only overlaps
   merge.
4. Replace the coalesced documents. Delete the old coalesced documents and index the new
   ones, each with a deterministic id derived from its bounds, so a repeated rebuild
   produces the same documents.

A worked example. A list holds `10.0.0.0/24`, `10.0.0.128-10.0.1.255`, and `192.168.1.5`,
which coalesce to `10.0.0.0-10.0.1.255` and `192.168.1.5`. The user adds two ranges,
`10.0.1.128-10.0.2.50`, which overlaps the first interval, and `172.16.0.0/16`, which is
disjoint. Step one writes two new source documents. Step two reads all five sources and
produces three coalesced documents: `10.0.0.0-10.0.2.50`, `172.16.0.0-172.16.255.255`,
and `192.168.1.5`. Membership then matches an address in the extended interval that was
outside before, and matches the new range, while export still returns all five authored
strings unchanged. This behavior is confirmed against Elasticsearch.

Rebuild from the sources, rather than editing the coalesced documents in place, is what
makes every case correct with no special handling. An overlapping add folds into one
interval, a disjoint add becomes a new interval, and a delete that would split an interval
is handled because the rebuild reads only the sources that remain. The deterministic ids
make the rebuild idempotent, so a repeat leaves the same documents. Cost and consistency
are as noted above: a full rebuild is cheap for normal lists, large lists rebuild only the
affected interval or batch on import, and the rebuild runs inside the write with a refresh
so the window where coalesced lags the sources is small.

**Membership never reads sources.** Two guarantees hold, one structural and one by
routing. Source documents have no bounds, so the join `ON v >= range_start AND v <=
range_end` can never match them, and they stay invisible to it. The DSL membership path
adds a `kind: coalesced` filter, so it never reads a source document either. Because
coalescing makes the intervals disjoint, at most one coalesced document contains any
value, so the join returns one row per event and does not produce duplicate alerts.
These behaviors are confirmed against Elasticsearch.

**Export reads only sources.** Export streams the source documents and writes each
authored value verbatim, so the output regenerates the user input, notation and entry
boundaries intact. CIDR returns as CIDR, a dash range returns as the dash range, a bare
value returns as itself. The coalesced documents are never exported. The file format
matches today, so a re-import produces an equivalent list.

**Why not export the coalesced form.** Coalescing is lossy. Many inputs map to the same
merged set, so it has no inverse. Given only the merged interval you cannot recover the
CIDR range and the dash range that produced it. That is why the sources are kept.

**Equality export.** Deduplication keeps one document per distinct value, so export
emits the set the user meant, one line per value. Duplicates in an input do not survive,
because a value list is a set.

## RBAC

**Today access is all or nothing per space.** Value list access rides the Security
feature privilege. The list and item APIs require `lists-all`, `lists-read`, or
`lists-summary`, and those
are bundled into the Security feature `all` and `read` privileges: `all` grants full
create, read, update, and delete on value lists, `read` grants read only. There is no
separate value lists toggle and no per list control. A user with Security `all` in a
space can create, edit, and delete every value list in that space, and `read` sees them
all. Enforcement is at the Kibana feature layer, through the API privileges, not through
Elasticsearch index privileges, and end users never query the `.lists-*` and `.items-*`
indices directly. Space isolation comes from the space in the index name and from the
feature being granted per space.

**Existing RBAC still applies, unchanged.** The public list and item endpoints keep the
same required privileges, so the same Security `all` and `read` cover both legacy and
lookup lists. Management access does not change, and space scoping continues through the
space id in the index name. A cluster that never migrates sees the same model.

**New capability: per list access.** Because each lookup list is its own index under a
known naming pattern, we can grant Elasticsearch read on specific list indices to
specific roles. A role can read one list and not another. The shared items index cannot
offer this, because all lists share one index, so there is no way to grant read on one
list alone. This is the per list control the current model lacks.

**The catch: rule execution privileges.** Per list index privileges only take effect if
the reader is the user or the rule. In the ES|QL future a rule joins a lookup index under the
rule user, so the rule must have read on every list it references, and that read is
exactly what a per list privilege would grant or deny. So per list RBAC and the ES|QL
join model fit together, but they need wiring: rule creation has to ensure the rule user
can read the lists the rule references, and surface a clear message when it cannot. Today
rule execution reads value lists through an internal path that does not check per list
privileges, so this is a feature to design, not a free effect of the storage change.

**Recommended path.** Keep the Security feature privilege as the management control, so
nothing regresses. Offer per list Elasticsearch read privileges as an opt in advanced
control for the ES|QL era, and design the rule execution privilege model alongside it, so
a rule that references a restricted list either has the read privilege or fails with a
clear message. This gives the granularity the shared index never could, without changing
the default experience.
