# Proposal: migrate value lists to lookup indices

## What value lists are

Value lists are named sets of values that security users keep in Kibana. Each list has a type (keyword, ip, ip_range, and others) and holds many items of that type. A user creates a list, fills it with items, and references the list from detection rule exceptions.

Today value lists live in two shared data streams per space: `.lists-<space>` for the list metadata and `.items-<space>` for every item of every list in that space. The items index has one field per supported type, and each item fills the single field that matches its list type.

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

Detection rules use value lists mainly through exceptions. An exception entry of type `list` tells a rule to include or exclude events whose field value belongs to the list. Small lists compile into the rule query as a terms or range filter. Large lists apply after the query, page by page, by searching the items index for the values seen in each page. Indicator match rules can also use the items index itself as a threat index.

## Problems today

**Access is all or nothing per space.** Value list access is granted for a whole Kibana space, not per list. Anyone with read in a space can read every value list in that space, and anyone with write can edit or delete every one of them. There is no way to grant access to some lists and withhold others, because all lists share the same two indices.

**The model does not fit an ES|QL future.** As rules move to ES|QL, membership is naturally a join against an index, and the shared items index cannot be joined cleanly: its key would depend on the list type (`keyword` for one list, `ip` for another), every list's items share the index so a join spans all of them unless it filters `list_id`, and a value in two lists matches twice. It is also a data stream, not the lookup mode index that `LOOKUP JOIN` needs. So membership today relies on custom code that reads items and rebuilds filters, and one index per list is what gives ES|QL a clean index to join later.

## Proposal: one lookup index per list

Store each value list in its own lookup mode index. A lookup index is single shard and exists for joins. The index holds only the values of that one list, in a simple shape: a single `value` column for equality lists, and two bound columns (`range_start`, `range_end`) for range lists.

Equality membership then becomes a lookup on `value`. Range membership becomes a lookup on the two bounds. The index is read live, so an edit to a list takes effect on the next rule run, the same as today, in a storage shape that a later ES|QL migration can join directly with a `LOOKUP JOIN`. That ES|QL migration is a separate step; this proposal is the storage swap that enables it.

## Supported types

Value lists are a general feature, not only an exceptions feature. Users create lists of any of the 23 element types today, and the new implementation supports all of them for storage and management, at parity. Each list becomes a lookup index with a column of its own type: a single `value` column for scalar types, the source and coalesced bounds for range types, and the native column for the rest. Create, add items, export, and delete work for every type.

Membership in exceptions is a subset, the same subset as today: keyword, ip, and ip_range. These are the types the join can evaluate, so they produce working exception behavior. The other types are stored and managed like any list, but do not drive exception membership. That matches today, where those types are storable but not functional as exceptions.

The subset can grow with no new machinery. Any equality scalar (numeric, date, boolean) is a typed `value` column with an equality join. Any range type (date_range and the numeric ranges) reuses the two bounds and coalesce path. Geo is the only family the join cannot express, because a spatial predicate is not allowed in the join condition, so geo lists stay storable but not joinable, as today. Text uses match semantics, not a join key, so it also stays storable only.

## Why lookup indices work for us

Value list size telemetry supports this layout. Across 803 clusters that report value list telemetry, 788 hold at least one list, about 4,000 lists in all. Half of all lists hold 17 items or fewer, 90% hold 761 or fewer, and 99% hold about 50,000 or fewer. Only 22 lists (about 0.6%) hold more than 100,000 items, and only four hold more than one million.

The largest list observed is a customer ip list of about 154.2 million items. That is near 7% of the roughly 2.1 billion document limit of a single shard. So a single shard index per list has enough capacity for every list we see today, with wide headroom.

The distribution also shows most lists are tiny, which raises the one real concern with one index per list: many small indices add shard and cluster state overhead, and the per node shard limit (1,000 by default) is shared with the data indices. Telemetry shows this is not a problem in practice. Across the 788 clusters with lists the count of value lists per cluster is small: median 2, 90th percentile 10, 99th percentile 59, and a single largest of 239. So for almost every cluster value lists take tens of shards, a small slice of the budget, and only one cluster reaches a few hundred while still staying within the limit. One index per list is therefore the design, and it is good enough for the fleet as it stands. If a cluster ever grows to many hundreds of lists on few nodes, sharing the small unrestricted lists into one index is a possible fallback, but the numbers do not call for it and it would trade away per list access control, so it is out of scope here.

The type mix supports the design. Almost all lists are the functional types: keyword, ip, and ip_range together are about 97 percent of lists. Range lists (ip_range) are about 12 percent, present in roughly a third of clusters with lists, so the source and coalesced range storage matters for a real but minority slice.

## Why one index per list, not one shared index

A fair question is why not keep every list in one shared index with a `list_id` column and filter it in the join, instead of one index per list. Correctness is not the reason. A shared index does work if the `list_id` filter goes inside the join condition, for example `ON field == value AND list_id == "listA"`, which Elasticsearch accepts and which returns one row per event with no fan out. Filtering `list_id` after the join is a trap, because a value that is in two lists survives a not in list A filter (it still matched another list's row), so the filter has to be in the join.

The reasons to go per list are access, scale, and isolation.

- Access. This is the main goal of the change. You cannot grant read on one list and not another when all lists are documents in one index, so a shared index reproduces today's all or nothing per space model. Per list indices allow plain Elasticsearch index privileges per list. Approximating this on a shared index needs document level security to filter `list_id`, a licensed feature with per query overhead and far more moving parts than an index privilege.
- Scale. Lookup indices are single shard. One shared index holds every list's items in one shard, and the largest single list observed is about 154.2 million items, so a whole space in one shard reaches the single shard ceiling and becomes a hotspot. Per list puts each list in its own shard, so the limit applies per list.
- Load. Every rule that references any list would join the one shared shard, and each per row lookup scans the full shared index filtered by `list_id`. Per list joins a small index and spreads load across shards.
- Isolation. Per list TTL, drop on delete, mapping, and blast radius. A shared index couples the lifecycle and failure modes of every list.

A per list lookup index is also what lets a future ES|QL rule use the list directly with a `LOOKUP JOIN`, which is the migration this storage swap prepares.

## One match per value

A later step is to have ES|QL rules use value lists directly through a `LOOKUP JOIN`. A list becomes an index the rule query joins, for both membership and exclusion. The lookup index shape, and the one match per value rule below, exist to set that up. This is future work, not part of the V1 storage swap.

`LOOKUP JOIN` is a left join, so for each event it returns one row per matching list document. If a value matched two documents, the event would produce two rows, and the rule could raise duplicate alerts. So every value must match at most one document. This is why the joinable form is deduplicated and its ranges do not overlap: one document per distinct equality value, and ranges merged into disjoint intervals so any value falls in at most one. This does not change membership, because a value list is a set and the merged intervals cover the same points, so every rule produces the same alerts.

At the same time we keep the authored items as they are, duplicates and overlaps and all, as separate source documents. They are the user input, and they drive export and listing. So a range list holds two forms: the authored form, which can repeat and overlap, for fidelity, and the derived disjoint form, which the join uses. Equality lists need only the first, because a set has no overlap to merge, so they only drop exact repeats.

## Why not store the lists in regular indices and use a WHERE IN at ES|QL time

Since the direction is ES|QL, a fair alternative to the lookup index plus `LOOKUP JOIN` is this: store each list in a regular index, and at ES|QL time test membership with a subquery, `WHERE field IN (FROM list_index | KEEP value)`. This reads another index, and it does not require a lookup mode index, so `WHERE IN` against a regular index is a real option worth taking seriously rather than dismissing. We still choose the lookup index and `LOOKUP JOIN`, for the reasons below.

**It does not scale, because it materializes the whole list.** The subquery collects its entire column into one set to test against, and Elasticsearch caps that materialized sub-result, so a large list overflows it and the query fails with `sub-plan execution results too large`. Raising the cap only moves the wall, because holding the whole value set per query is the cost. `LOOKUP JOIN` streams the join against the lookup index instead of materializing the list, which is what lets it carry a large list.

**Ranges cannot use `IN` at all.** `IN` tests membership in a set of discrete values, but a range list is a set of intervals, so no `IN` form asks whether a value falls inside one. Range membership needs the predicate `value >= range_start AND value <= range_end`, which in ES|QL is a `LOOKUP JOIN`, and that requires a lookup mode index (a join against a regular index fails with "Lookup Join requires a single lookup mode index"). So range lists force a lookup index regardless of what we do for equality.

**Net.** `WHERE IN` over a regular index is a genuine ES|QL option for equality lists, and we are not rejecting it out of a misunderstanding. We reject it because it does not scale (the subquery materializes the whole list and hits a hard size limit), because it cannot express range membership at all, and because adopting it would still leave `LOOKUP JOIN` as the mechanism for ranges. Storing every list in a lookup index and joining it is the one design that covers equality and ranges, small and large, with a single scalable operation.

## Migration plan

**Feature flag.** A flag controls whether new value lists are created in lookup indices. While the flag is off, nothing changes and every new list is legacy. While the flag is on, every new list is created as a lookup list, and existing legacy lists can be migrated. The flag is the storage default for new lists, not a per list choice on the create request.

**Existing lists stay as they are.** Migration is opt in, per list. A legacy list keeps living in the shared `.lists-<space>` and `.items-<space>` streams, and behaves exactly as today, until the user triggers its migration. A cluster that never enables the flag, or a user who never triggers a migration, sees no change at all.

**Two origins of lookup lists.** A lookup list exists in one of two ways. First, a list created directly as a lookup list while the flag is on. Second, a legacy list that the user migrated. The difference matters for naming, see below.

**Migration action.** Migration for a list is triggered by an endpoint the `lists` plugin exposes in its API (where the endpoint lives, and how it produces the referencing-rule warning, is explained later below). When called for a list, the action creates its lookup index, copies its items into the new shape (equality values into `value`, ranges into `range_start` and `range_end`), and sets the list `storage.type` to lookup. The copy also normalizes items: it drops duplicate values and merges overlapping ranges, so each value matches at most one document. This keeps the same membership result while letting a join return one row per value. Once `storage.type` is lookup, the ListClient routes every read and write for that list to the lookup index. The list id and the exception references never change, so rules and exceptions keep resolving the same list.

**Index naming.** A lookup index name uses the space id and the list id, for example `.value-list-<spaceId>-<listId>`. It never uses the space name or the list display name, because both are mutable. The space id is fixed for the life of the space, so a space rename does not affect index names. The list id is not safe to drop into an index name directly: it is a `NonEmptyString` with no character rule, so a list can be created with an id that is illegal in an index name, for example one with uppercase, spaces, or reserved characters (the create API accepts `Weird ID_With CAPS!` verbatim). This applies to any list, whether created directly as a lookup list or created as a legacy list and migrated later, because the id is user supplied in both cases. So the index name is derived from the id, not taken from it: sanitize or hash the id into a legal name and keep the real id in the list metadata. This derivation runs whenever a lookup index is provisioned, at direct creation and at migration alike.

**Both versions coexist.** Legacy lists and lookup lists live at the same time. Every list carries a storage descriptor in its `.lists-<space>` document, and a missing descriptor reads as legacy. The APIs and the rule types work with both. A user can migrate lists one at a time, or not at all.

**Legacy item cleanup.** After a list migrates, its rows in the shared `.items-<space>` stream are no longer read. The migration can delete them once it verifies the copy, or keep them for a short rollback window during which setting `storage.type` back to data stream restores the legacy list, and delete them on a later pass. The shared streams shrink as lists migrate, and we can retire them only when no legacy list remains.

**Exceptions reference either.** An exception entry references a list by id and type, as it does today. Nothing in the exception changes when a list migrates. The reference resolves the same way for both storage kinds.

**Rule executors support both.** All list access already uses one client, the ListClient. We keep its method signatures and add a resolve step inside it. The client reads the list metadata once, learns the storage kind, and uses the matching internal strategy to read the list. Every rule type that tests membership (custom query, threshold, EQL, ES|QL, ML, new terms, and indicator match exceptions) keeps calling the same client methods and does not change. ES|QL rules keep working exactly as today, through the same filter they use now.

The one path that does not go through the ListClient is indicator match when it uses a value list as a threat index. The rule hardcodes the threat index as a literal index name (`threat_index`), read verbatim at execution, with no value list indirection, so migration cannot transparently rewrite it to read the lookup index. This is not a corner case: telemetry shows 143 clusters and 467 rules use a value list as a threat index today. The handling, non-destructive migration plus a warning about referencing rules, is in the indicator match threat index section below.

**Endpoints stay stable.** The public list and item endpoints keep one contract and select the storage inside. Clients never choose a legacy or a lookup endpoint. We add only a migration action and a read only storage field on the list metadata, so the UI can show state and offer migration.

## Registry and storage descriptor

**The registry is the existing list container.** We do not add a new store. The `.lists-<space>` container already holds one document per list with its metadata, and already supports find and sort. We extend that document with a `storage` field. This plays the registry role for every list, legacy or new, so `_find` keeps querying `.lists-<space>` as it does today.

**No upgrade migration.** A list created before the feature has no `storage` field, and the resolve step reads a missing `storage` as `{ type: 'data_stream' }`. So every pre-existing list is correct with zero writes. The field is additive, and the mapping is `strict`, so it has to be in place before the first write that sets `storage` (the first lookup list created or the first list migrated). The provisioning flow that already creates the list indices applies it, and startup is a reliable trigger for that flow: a version upgrade restarts the Kibana process and runs the plugin start lifecycle, and enabling the flag is a config change that also requires a restart. It handles both cases by whether the data stream exists:

- New installation: the data stream does not exist yet, and the field is in the container index template, so the flow creates `.lists-<space>` from the template with `storage` already mapped. Nothing more is needed.
- Existing installation: the data stream already exists with the old mapping, so the flow applies a one-time additive `PUT mapping` to add the field, gated on the data stream existing and the feature flag being enabled. The `PUT mapping` is idempotent, so repeating it is harmless, and it is safe under a rolling multi node upgrade because an old node never writes `storage`.

**Metadata for every list stays in `.lists-<space>`.** Only items diverge by storage. Legacy lists keep their items in the shared `.items-<space>`. Lookup lists keep their metadata in `.lists-<space>` like every other list, and hold their items in the per list index. So `.lists-<space>` is the one place that names all value lists, whatever their storage.

**The storage descriptor.** Each list document carries:

```
storage: {
  type: 'data_stream' | 'lookup_index' | 'regular_index' | ... ,
  locator: { ... }   // the concrete location, e.g. { index: '.value-list-<spaceId>-<listId>' }
}
```

`storage.type` names the storage kind. `storage.locator` holds the real location, stored and not derived, so a naming change or a new storage kind needs no convention rewrite. Legacy lists use `{ type: 'data_stream' }`, or no `storage` field at all, which reads the same, with items in the shared `.items-<space>`. New lookup lists use `{ type: 'lookup_index', locator: { index } }`, with items in the per list index.

**Metadata and items are separate.** Metadata always lives in the `.lists-<space>` document. Items live where `storage` says. A migration rewrites items and changes `storage`, and leaves metadata, id, and exception references untouched. A later move to a different storage kind is the same operation with a new `storage.type` and a new strategy.

**Storage is read-only through the public API.** The `storage` field is set when a list is provisioned (at create, or at migration through an internal update), and the public update and patch endpoints never write it. So a user cannot repoint a list's storage by hand, and the field only ever changes through a code path that also moves the items to match.

### Resolution through the ListClient

The ListClient stays the single entry point and keeps its method names. It gains one private step, `resolveList(id)`, which reads the `.lists-<space>` document once and returns the metadata plus a store strategy chosen by `storage.type`. This read can be memoized on the ListClient instance, which is safe because the ListClient is constructed per request, not shared: the route handler context builds a new `ListClient` on each `getListClient()` call, holding the request scoped `asCurrentUser` client, so a memo on the instance cannot outlive the request or serve another request's metadata. If that lifecycle ever changed to a long lived client, the memo would need to be scoped to the request rather than the instance, or dropped. Every public method then falls into one of three groups.

**Item methods resolve and dispatch.** These read or write a single list's values: `searchListItemByValues`, `getListItemByValues`, `getListItemByValue`, `getListItem`, `findListItem`, `findAllListItems`, `createListItem`, `updateListItem`, `patchListItem`, `deleteListItem`, `deleteListItemByValue`, `importListItemsToStream`, `exportListItemsToStream`. Each resolves the list, then calls the matching method on the store strategy. The data stream strategy does what the code does today against `.items-<space>`. The lookup strategy reads and writes the per list index in the `value` or bounds shape, and normalizes on writes. Callers see the same signatures and results.

**Container methods use the registry.** These read or write list metadata: `getList`, `findList`, `createList`, `createListIfItDoesNotExist`, `updateList`, `patchList`, `deleteList`. Reads return the `.lists-<space>` document. `findList` queries `.lists-<space>`, as it does today, so it spans legacy and new lists in one place. `createList` writes the document, sets `storage.type` from the feature flag alone, never from user input, since the storage kind is not a create option, and provisions the storage: it ensures the shared streams for a data stream list, or creates the per list index for a lookup list. `updateList` and `patchList` write metadata only, with no item movement. `deleteList` runs the existing exception reference checks, deletes the document, and removes the item storage, which is the list rows in `.items-<space>` for a legacy list, or the whole per list index for a lookup list.

**Infrastructure methods stay with the shared streams.** These are space level, not per list: `getListName`, `getListItemName`, the index and data stream existence checks, `createListBootStrapIndex`, the template and policy getters and setters, the data stream migration methods, and the delete index, template, and policy methods. They manage the shared legacy streams and remain while any legacy list exists. `createList` reuses a per list provisioning path when `storage.type` is lookup. The shared stream methods can be retired only when no legacy list remains.

**Indicator match as a threat index is outside this resolution.** A rule that uses a value list as a threat index hardcodes the threat index as a literal index name, so it does not call the ListClient and is not chosen by storage descriptor. New rules can reference the per list index directly; existing rules keep reading `.items` after migration. This is handled by the migration action, not by `resolveList`, in the indicator match threat index section.

**One resolution detail.** A few item methods take only an item id, not a list id: `getListItem`, `updateListItem`, `patchListItem`, `deleteListItem`. In the shared stream the item carries its `list_id` and lives in one index, so a search by id finds it. In the lookup model an item id alone does not name its index. So these methods first resolve the owning list, either from a list id the route already holds, or by locating the item, and then dispatch to the strategy. For equality lists an item's `_id` is a hash of its value (`sha256(value)`), so a known value maps straight to its document id with no search, though the value or its owning list cannot be recovered from the id alone.

## V1 rule execution per rule type

The goal of this work is to swap value list storage and keep V1 rule execution working unchanged, so a later ES|QL migration can build on it. In V1 nothing about the rule executors changes. The ListClient resolves the list, reads from the lookup index, and the two existing execution paths run against it:

- Inline, for a small list: the exception builder reads the list values and builds the same terms or range filter on the event field. For a range list it reads the source values and emits one range clause per source range.
- Post filter, for a large list: the executor queries the per list index once per page of results, a terms on `value` for equality, or `src_start <= v AND src_end >= v` against the source documents for a range. Only custom query without suppression, indicator match, and ML use this path. Both paths read the source documents, which are the truth, so membership is correct even while the coalesced projection lags.

| Rule type | Small list | Large list | With lookup indices |
|---|---|---|---|
| Custom query (no suppression) | inline | post filter | both paths read the per list index; the post filter is cheaper (one small single-type index, no `list_id` filter) |
| Custom query (suppression) | inline | skipped, warns | small list reads the per list index; large still skipped |
| Indicator match | inline | post filter | both paths read the per list index; plus the threat index case below |
| Threshold | inline | skipped, warns | small list reads the per list index; large still skipped |
| EQL | inline | skipped, warns | small list reads the per list index; large still skipped |
| ES\|QL | inline (DSL filter) | skipped, warns | small list reads the per list index; large still skipped; works as today |
| ML | inline | post filter | both paths read the per list index |
| New terms | inline | skipped, warns | small list reads the per list index; large still skipped |

The swap is transparent to every rule type. The rule types that apply large value lists today (custom query without suppression, indicator match, ML) keep doing so, now against a smaller, cleaner index.

### Indicator match threat index

Indicator match does not go through the ListClient for its threat index. The rule hardcodes the threat index as a literal index name and reads it verbatim, so there is no value list indirection to resolve at execution, and migration cannot rewrite the rule for the user.

The executor matches events against the threat index by equality only. For each threat mapping entry it builds a `match` clause, a `terms` clause, or a negated `must_not match` clause on the mapped field, and never a `range` clause. So only a list whose items are exact values (keyword, ip, and the other equality types) works as a threat index: the executor compares the event field to the stored value and matches when they are equal.

The author of a new rule would set `threat_index` to the list's own lookup index and map the source field to `value`. The `list_id` filter they need today would no longer be necessary, because the index is the list.

An existing rule stores `.items-<space>` and a `list_id` filter in its parameters, and migration cannot rewrite the rule to read the new lookup index instead. So migration is non-destructive here: it does not delete the migrated list's items from `.items`, so the rule continues to match. The limitation is that it now matches against a frozen copy, because edits after migration are written only to the lookup index, so the rule drifts from the live list until it is updated to read the lookup index.

To make that visible, the migration endpoint scans for rules that reference the list and returns a warning in the same response as the migration result. It never blocks the migration, and it never fails the migration if the scan itself fails. The warning returned by the endpoint is one of:

- Indicator match rules whose threat index is `.items-<space>` and whose threat query references the `list_id`: return their rule ids, since these read a frozen copy of the list until they are updated to read the lookup index.
- No direct reference found, but rules read `.items-<space>` as a threat index: a weaker warning, that some of these rules may reference this list.
- The scan errored or timed out: a generic warning, that the rules could not be checked and rules using `.items-<space>` as a threat index should be reviewed by hand.
- The scan is clean: no warning.

The scan is best effort and advisory, layered on a migration that has already succeeded, so a scan failure never fails the migration.

**Where each part lives.** The migrate endpoint sits with the rest of list management in the `lists` plugin, since all list management already lives there. But the scan reads detection rules, which the low level `lists` plugin does not own and must not depend on. So the two are split by a contract: the `lists` plugin owns the endpoint and the storage migration and exposes a registration hook for a rule scanner; the security solution, which owns detection rules, registers a scanner through that hook and implements it with the detection rule search. The endpoint invokes the registered scanner per request and returns the warning in one call. If no scanner is registered, for example the security solution is not present, the endpoint simply returns no warning. This keeps `lists` free of any rules dependency while the rule knowledge stays in the security solution.

### Efficiency improvements

These are not new capabilities, the same lists already work today, but the per list index makes two common operations cheaper.

- Reads target a small single type index. The post filter queries a per list index with no `list_id` filter, instead of the shared index that holds every list's items across 23 mostly null fields.
- Deleting a list drops one index, instead of a delete by query over the shared stream.

### Limitations that remain in V1

The storage swap does not change which rule types apply large value lists. Large value list exceptions are still skipped on threshold, EQL, ES|QL, new terms, and custom query with suppression, with the same warning, and the small versus large split still applies to these rule types. These are out of scope for the storage swap and are what the later ES|QL migration is meant to address.

## Range storage and updates

Equality lists need none of what follows: they store one document per value with no derived structure. The rest of this section is specific to the six range types (`ip_range`, `date_range`, and the four numeric ranges).

A range list answers membership by containment: a value is in the list when it falls inside one of the authored ranges. Membership itself is easy and always correct. A value `v` is a member when some authored range contains it, which is the query `src_start <= v AND src_end >= v` over the ranges as the user entered them. If those ranges overlap, `v` can match several of them at once, but a membership question has only a yes or no answer, so matching more than once is harmless. This is why V1, which evaluates membership as an Elasticsearch DSL filter over the authored ranges, works for any set of ranges, overlapping or not.

The difficulty appears only under the later ES|QL migration, which answers membership with a `LOOKUP JOIN` against the list index. A join is not a yes or no test: it returns one row per matching list document. If a value falls inside three overlapping ranges, the join returns three rows for that one event, and the rule raises three alerts instead of one. Overlapping ranges, harmless for a filter, are wrong for a join.

That is what forces a second representation. Alongside the authored ranges, which we call the sources, we keep a disjoint version of the same coverage: the ranges merged into intervals that do not overlap, so every value is contained by exactly one interval or by none. Membership is identical, because the merged intervals cover exactly the same points, but the join now returns one row per event. Producing this merged set is called coalescing, and building and maintaining it correctly and cheaply as the list changes is what the rest of this section covers: how the two representations are stored, how the three update operations apply, and how the design stays correct and available when a rebuild is interrupted or run concurrently.

### Storage layout

An equality list stores one document per value, in a single `value` field typed to the list type (an ip list types `value` as `ip`, a keyword list as `keyword`, a long list as `long`, and so on), with the document `_id` set to a hash of the value so duplicate adds collapse to one document. A range list stores documents of a few kinds in the one index, told apart by a `kind` field. Two kinds hold list data:

```
kind:        keyword    # "source" | "coalesced"
value:       keyword    # authored string, verbatim      (source docs)
src_start:   ip         # parsed lower bound             (source docs)
src_end:     ip         # parsed upper bound             (source docs)
range_start: ip         # disjoint lower bound           (coalesced docs)
range_end:   ip         # disjoint upper bound           (coalesced docs)
```

A **source** document keeps the authored value exactly as the user typed it, and also its parsed bounds `src_start` and `src_end`. The verbatim value is what export returns; the parsed bounds are what V1 membership queries and what the rebuild reads to re-coalesce a region. A **coalesced** document carries the disjoint bounds `range_start` and `range_end`, and no value. Two further `kind` values carry only bookkeeping and no list data: a single `state` document per index, and short lived `dirty` region markers, both described under correctness below.

Each document's `_id` is derived from its content: a source document's `_id` is a hash of its authored value, and a coalesced document's is a hash of its bounds. So adding the same value twice writes the same source `_id`, an idempotent upsert that collapses to one document, and deleting a value is a direct delete by that `_id`, with no search.

We parse the authored value into `src_start` and `src_end` ourselves, so dash, CIDR, and single values are all supported uniformly.

**Sources are the source of truth. Coalesced is a derived cache.** The sources are the only thing we must not lose. The coalesced set is a pure function of the sources, so it can always be recomputed. Because of this split, an update only needs to record the sources correctly, and the coalesced set can be rebuilt from them at any time. A lost or half-written coalesced set is then a cache to repair, not data to recover, so the list stays available even when a rebuild is interrupted.

### The three update operations

A write never coalesces. It mutates the sources and records the region it touched by inserting a small document of `kind: dirty` that holds that region's bounds, and the background job later reads those documents and re-coalesces the affected regions (the coalesce operation is detailed just below). No request thread writes a coalesced document, which is what removes the concurrency race.

**Insert.** Index one source document per authored value, verbatim, then insert a `kind: dirty` document holding the value's range. When the job re-coalesces that region from the current sources, a value that overlaps an existing interval merges with it and a disjoint value forms a new interval.

**Delete.** Remove the one source document that holds the authored value (a direct delete by its `_id`, as above), then insert a `kind: dirty` document holding the removed value's range. A delete can *fragment*: if the removed range bridged others, re-coalescing the region from the sources that remain splits one interval into several, up to one per source range left in that region, which happens when the removed range was the only thing joining otherwise disjoint ranges.

**Modify.** A value edit is a delete of the old authored value and an insert of the new one, each inserting its own `kind: dirty` document. The job re-coalesces both, so a fragment and a merge in the same edit are handled together.

**Worked example (insert).** A list holds `1-100`, `50-200`, and `500`, which coalesce to `1-200` and `500`. The user adds `150-300` (overlaps the first interval) and `1000-2000` (disjoint). The write indexes two source documents and inserts a `kind: dirty` document per region. The job re-coalesces from the sources into three coalesced documents: `1-300`, `500`, and `1000-2000`. Export still returns all five authored strings verbatim, even though the coalesced set that changed does not correspond one to one with them.

**Worked example (delete then insert, fragment then re-merge).** Sources `A = 1-100`, `B = 90-300`, `C = 200-400` coalesce to one interval `1-400`, because `B` bridges `A` and `C`. Delete `B`: the job re-coalesces the region from `A` and `C`, which no longer touch, and produces two coalesced documents, `1-100` and `200-400`. Insert a new bridge `D = 95-250`: the job re-coalesces `A`, `C`, `D` and re-merges to the single interval `1-400`. Export throughout returns the authored strings verbatim.

### The coalesce operation

Coalescing takes a set of source ranges and produces the disjoint intervals. It runs in the background job, once per region that one or more `kind: dirty` documents record, coalescing those regions from the current sources. The steps for one region are:

1. Read the source documents for the region, which is more than the sources inside the dirty document's interval. A source can overlap that interval but extend past it, and a coalesced interval overlapping it can join in sources outside it, so the task widens the region to any coalesced interval it overlaps, then reads every source overlapping the widened region. This captures the whole connected run of overlapping ranges (paged for large regions, see performance below).
2. Parse each authored value into comparable numeric bounds, the same parsing the source documents use: ip to a v4 or v6 integer, numeric to a number, date to epoch milliseconds.
3. Sort by start and merge into disjoint intervals: while the next start is at or below the current end, extend the current interval, otherwise start a new one. For the discrete types (ip, integer, long, date) an interval also extends when the next start is the next representable value after the current end, so exactly adjacent intervals like `1-5` and `6-10` merge into `1-10`, which compacts the coalesced set. Float and double are continuous, so only overlaps merge. Either way the result is disjoint, which is all the one row per value guarantee needs. This is `O(n log n)`, dominated by the sort.
4. Write the coalesced documents with a deterministic id derived from the bounds (`hash(range_start, range_end)`), indexing the new documents before deleting the previous ones that are not in the result, so an interruption leaves a superset of intervals rather than an empty window.

In pseudocode:

```
coalesce(list):
  markers = search(kind: dirty)                 # all dirty docs for the list
  regions = mergeOverlapping(markers)           # in memory: fewer, wider regions
  for region in regions:
    processRegion(list, region)
  delete(markers)                               # drain what we just processed
  markStateClean(list)                          # guarded by __state _seq_no

processRegion(list, region):
  # 1 search: the coalesced intervals this region overlaps
  covered = search(kind: coalesced
                   where range_start <= region.end AND range_end >= region.start)

  # the run cannot reach past those intervals, so no boundary walking is needed
  targets = [region] + covered.intervals

  # 1 search (paged with search_after for a large region): the sources overlapping
  # the region OR any covered interval
  sources = search(kind: source
                   where OR over targets of (src_start <= t.end AND src_end >= t.start))

  merged = sortByStart(sources).mergeOverlapping()   # in memory, O(m log m)

  # index the new coalesced docs (content-addressed ids), then delete the covered
  # ones that are not in the result
  replaceCoalesced(index = merged, deleteStale = covered.ids not in merged)
```

The expansion is a fixed two searches per region, not one search per source. It works because the coalesced set is disjoint and correct before the run: every existing source sits inside exactly one coalesced interval, so a source that should merge into the region either overlaps the region directly (the newly written value) or sits inside a coalesced interval that overlaps the region, which `covered` already holds. A rebuild from scratch, the one path with no coalesced set to lean on, reads all sources in a single `search_after` scan sorted by start and merges in one linear pass, so it is `O(n / pageSize)` searches, never one per source.

Because the coalesced documents are a pure function of the sources and their ids are deterministic, two runs over the same sources produce identical documents, so a run is safe to repeat.

### Correctness and availability

**Correctness does not depend on the coalesced set.** Membership, whether a value is in the list, is answered from the source documents: a value `v` is a member if some source range contains it (`src_start <= v AND src_end >= v`). The sources are the truth and are updated synchronously by the write, so an edit takes effect on the very next rule run, and concurrent edits can neither miss nor double count a membership decision, because an existence check does not care that overlapping sources produce more than one hit. The disjoint coalesced set is a projection that exists only for the future join, which needs one row per value.

Keeping membership on the sources is what removes concurrency from the correctness path. Elasticsearch has no cross document transaction, and two writers can touch the same region at once, so a coalesced set maintained by the request threads is open to a race condition. We avoid that by letting only one process write coalesced documents. The request threads never write them: they only insert `kind: dirty` documents recording what changed. One background task performs every coalesced write, so two coalesced writes can never overlap.

Each list keeps one small document with a fixed `_id` equal to `__state` (read and updated directly, marked `kind: state` so membership and coalesce queries never read it) carrying `source_version`, `coalesced_version`, and `status`. Each write also appends a **dirty region marker**: a small document, with its own id, recording the bound window the edit touched. Concurrent writers appending markers never conflict, because each marker is a new document.

**The write path.** A write mutates the sources, then increments `source_version` and sets `status: dirty` on the `__state` document in one atomic scripted update, appends a dirty region marker, and enqueues the rebuild task. The one point two concurrent writes contend on is that single `__state` document: the scripted update runs with `retry_on_conflict`, so on a version collision Elasticsearch re-reads the current document and re-applies the script, and both writers' increments land rather than one overwriting the other.

**The rebuild task.** Task Manager runs it, keyed by a deterministic per list task id, so it is the single writer of coalesced documents for a list and only one runs at a time. It reads `source_version` as `V`, drains the dirty markers, re-coalesces each marked region from the current sources, deletes the markers it drained, and records `coalesced_version = V, status: clean` with a conditional update guarded by the `__state` `_seq_no`. A write that lands during the run both bumps the version, which fails that guard, and appends a new marker, which survives the drain, so the task runs again and reconciles it. After it records the list clean, the task reads the version once more; if a newer write is already recorded, it runs again so that write's marker is drained too. Because the task is the single writer over a set that is disjoint when it reads it, each region re-coalesce reads every source it needs: every source that helped build a coalesced interval overlaps that interval, so reading the sources overlapping the window, plus the sources overlapping any coalesced interval the window touches, pulls in the entire run of ranges that merge together, with none left out.

The task authenticates with a short lived API key, scoped to that one index and granted on behalf of the writing user, since the internal Kibana user has no privileges on the per list indices.

**Consistency.** Because the task indexes the new coalesced documents before deleting the previous ones (step 4 above), an interruption leaves at worst a superset of intervals, never an empty window. Consider a run that stops in that gap, after indexing the new documents and before deleting the stale ones: the stale documents are left behind.

The run never reached the clean update, so the list stays dirty and the task retries. The retry re-coalesces the region and, in doing so, reads the coalesced documents that overlap it. Those now include both the new documents and the stale ones. The retry deletes the ones that are not in the recomputed result, which removes the stale ones.

What guarantees the region is reprocessed is the dirty marker. If the run stopped in the middle of the region loop, the markers still exist, because they are deleted only after the loop finishes, so the retry sees them and reprocesses the region. If it stopped after the markers were deleted, the list is dirty with no markers, so the next run recomputes the whole list rather than a single region.

**On failure.** The task is durable in Task Manager, so an interrupted or failed run is retried with backoff, bounded by the task's `maxAttempts`. A run that keeps failing, from bad data or a genuinely oversized list, is stopped once the attempts are exhausted; the list stays dirty, the last good coalesced set remains, and the next write enqueues a fresh run.

**A race we have not fully closed.** The version guard and the post-clean re-check together catch every write that lands while the task is running. One narrow interleaving is still open: if a write commits in the instant after the task has recorded the list clean but before Task Manager has released the running task, then the write's enqueue is ignored (a run is still considered in progress) and the task's own re-check has already happened. That write's region is left without a re-coalesce. This is not a silent error, because the list is still recorded dirty (`coalesced_version` behind `source_version`), but nothing queues a rebuild for it until the next write to that list. Membership is unaffected throughout, since it reads the sources, so only the coalesced projection is delayed, and only in this one interleaving.

The simple fix, which we have not built yet, is a periodic check: a low frequency task that finds any list whose `coalesced_version` is behind its `source_version` and queues a rebuild for it. Run every few minutes, it brings every list current even if an enqueue was ever missed, and it adds no cost to writes or to rule execution.

**Consequence for a rule execution.** A rule run never blocks on the task and never fails because of one. Membership is unaffected by any lag, since it reads the sources. The coalesced set is eventually consistent, lagging an edit by the task's poll interval (a few seconds), and that lag reaches only the future join, at worst a duplicate row until the next run, never a missed alert.

### Performance at scale

The rebuild task is incremental: it re-coalesces only the regions the writes recorded as `kind: dirty` documents, reading only the coalesced intervals those regions overlap and the sources inside them, so its cost is proportional to what changed, not the list size. Coalescing a region is `O(m log m)` in the sources it touches, dominated by the sort. A list import records its regions too: it merges the import's bounds into windows first, so a contiguous import inserts a few `kind: dirty` documents rather than one per line, and above a window cap it collapses to a single document spanning the whole import, whose region re-coalesce reads the sources within that span (`O(n log n)` when the span covers the list). Observed value lists are small (per cluster list counts p99 59, list sizes p90 761 and p99 about 50k items), so even re-coalescing a whole-list span is inexpensive for real lists today. Two more things keep the cost bounded:

- **Deduplication per list.** The rebuild task id is per list, so a burst of writes to one list collapses to a single queued run, which drains all their markers at once, not one run per write.
- **Paged source reads.** A region re-coalesce, including a whole-import span, reads sources with a point in time and `search_after` rather than one `size` capped search, so it is correct at any list size.

A single primary shard per list is sufficient at the observed sizes and keeps the two bound range join and the disjointness guarantee simple.

### Ranges in V1, and under the later ES|QL migration

V1 answers range membership from the source bounds, through the inline and post filter paths described under V1 rule execution above. The coalesced set is never consulted.

For example, a range list holds `10.0.0.0/24` and `10.0.1.0-10.0.1.128`. For the event address `10.0.0.42`, the post filter runs `src_start <= 10.0.0.42 AND src_end >= 10.0.0.42` over `kind: source`, matches the first range, and keeps the event. The coalesced set is never consulted in V1.

The coalesced set exists for the later ES|QL migration. An ES|QL rule joins the event stream to the list index and tests interval membership with a `LOOKUP JOIN` on the two bound columns:

```
FROM events
| LOOKUP JOIN `.value-list-<space>-<listId>` ON a >= range_start AND a <= range_end
| WHERE range_start IS NOT NULL        // a is in the list; use IS NULL for exclusion
```

Three properties make this work, and the storage layout provides each one:

- **Two scalar bounds, not a range field.** Elasticsearch cannot use a native `ip_range` field as a join key (it is unsupported in ES|QL and reads as null), so a range must be decomposed into two scalar columns. The coalesced documents store `range_start` and `range_end` as the element's own scalar type (ip, long, date), which are exactly the join's two operands. This decomposition is the reason the storage keeps parsed bounds rather than the native range field.
- **Disjoint intervals, so one row per value.** `LOOKUP JOIN` is a left join and returns one row per matching document, so a value inside two overlapping intervals would produce two rows and a duplicate alert. Coalescing merges overlaps, so at most one coalesced document contains any value and the join returns one row per event. This is the one match per value rule, and it is why the coalesced set must be disjoint.
- **Live updates, without ENRICH.** The join reads the index directly, so once the coalesced set reflects an edit it is visible to the next query, with no policy re-execution or index rebuild. That is the update propagation an ENRICH policy cannot provide.

The source documents carry their bounds under `src_start` / `src_end`, not `range_start` / `range_end`, so the join, which references only `range_start` / `range_end`, never matches a source: only the disjoint coalesced set participates. So V1 maintains the coalesced set purely to make this future join correct, while V1 itself answers membership from the sources.

### Export and import

**Export reads only sources.** Export streams the source documents and writes each authored value verbatim, so the output regenerates the user input, notation and entry boundaries intact. CIDR returns as CIDR, a dash range returns as the dash range, a bare value returns as itself. The coalesced documents are never exported. The file format matches today, so a re-import produces an equivalent list.

**Why not export the coalesced form.** Coalescing is lossy. Many inputs map to the same merged set, so it has no inverse. Given only the merged interval you cannot recover the CIDR range and the dash range that produced it. That is why the sources are kept.

**Equality export.** Deduplication keeps one document per distinct value, so export emits the set the user meant, one line per value. Duplicates in an input do not survive, because a value list is a set.

## RBAC

**Today access is all or nothing per space.** Value list access is governed by the Security feature privilege. The list and item APIs require `lists-all`, `lists-read`, or `lists-summary`, and those are bundled into the Security feature `all` and `read` privileges: `all` grants full create, read, update, and delete on value lists, `read` grants read only. There is no separate value lists toggle and no per list control. A user with Security `all` in a space can create, edit, and delete every value list in that space, and `read` sees them all. Enforcement is at the Kibana feature layer, through the API privileges, not through Elasticsearch index privileges, and end users never query the `.lists-*` and `.items-*` indices directly. Space isolation comes from the space in the index name and from the feature being granted per space.

**Existing RBAC still applies, unchanged.** The public list and item endpoints keep the same required privileges, so the same Security `all` and `read` cover both legacy and lookup lists. Management access does not change, and space scoping continues through the space id in the index name. A cluster that never migrates sees the same model.

**New capability: per list access.** Because each lookup list is its own index under a known naming pattern, we can grant Elasticsearch read on specific list indices to specific roles. A role can read one list and not another. The shared items index cannot offer this, because all lists share one index, so there is no way to grant read on one list alone. This is the per list control the current model lacks.

**The catch: rule execution privileges.** Per list index privileges only take effect if the reader is the user or the rule. In the ES|QL future a rule joins a lookup index under the rule user, so the rule must have read on every list it references, and that read is exactly what a per list privilege would grant or deny. So per list RBAC and the ES|QL join model fit together, but they need wiring: rule creation has to ensure the rule user can read the lists the rule references, and surface a clear message when it cannot. Today rule execution reads value lists through an internal path that does not check per list privileges, so this is a feature to design, not a free effect of the storage change.

**Recommended path.** Keep the Security feature privilege as the management control, so nothing regresses. Offer per list Elasticsearch read privileges as an opt in advanced control for the ES|QL era, and design the rule execution privilege model alongside it, so a rule that references a restricted list either has the read privilege or fails with a clear message. This gives the granularity the shared index never could, without changing the default experience.

## Telemetry

**Why we need it.** The migration is gradual and reversible, so the two storage layouts coexist for a long time. To run the rollout safely we have to see, per cluster, how many value lists already use the per list lookup index versus the legacy shared data stream, whether that share is growing, and whether the indicator match path is being exercised against lookup indices. Without this we are migrating blind. This is a measurement of adoption and coexistence, not of list contents.

**Where it fits.** The Security Solution already runs a daily "lists" telemetry task that reports value list metadata on the `security-lists-v2` channel: a per cluster `total_list_count`, a per type breakdown, per list item counts, how many lists are referenced by exceptions, and how many indicator match rules use a value list as their threat index. We extend that same payload rather than adding a channel, so the existing ingestion, cluster and license identifiers, and dashboards remain unchanged.

**The new fields.**

- `lookup_list_count`: how many value lists are stored in a per list lookup index (the new storage).
- `legacy_list_count`: how many are still in the shared data stream, derived as `total_list_count` minus `lookup_list_count`.
- `used_in_indicator_match_rule_via_lookup_count`: how many indicator match rules use a lookup index as their threat index, reported alongside the existing count of rules that use the legacy `.items` index.

**How each is measured.** The counts come from aggregations, so the payload stays small and carries no list values.

- Total lists: the existing cardinality of `name` over `.lists-*` (the list container lives in `.lists-<space>` for both storage kinds, so this is every list).
- Lookup lists: because the new storage is exactly one index per list, the distinct index count over `.value-list-*` (a cardinality on `_index`) is the number of lists in lookup storage.
- Indicator match over lookup: the count of distinct rule ids whose `alert.params.threatIndex` starts with `.value-list`, mirroring the existing prefix query for `.items`.

**What it answers.** Adoption over time (is the lookup share of new lists rising?), coexistence during the migration (both counts nonzero, and their sum equal to the total), and whether the lookup indicator match path is actually used, which de risks the `get_threat_list` change. It also lets us confirm a cluster has fully migrated (legacy count at zero) before removing any legacy path.

**One accuracy note, and the production form.** Counting lookup lists by distinct `.value-list-*` index misses an empty lookup list, because an index with no documents contributes nothing to an `_index` aggregation. That is acceptable for an adoption signal, where empty lists are not the point. The exact form, once the dedicated `storage` field exists on `.lists-<space>` (Option A), is a single terms aggregation on that field, which splits legacy versus lookup precisely and does not miss empty lists. The recommendation is to ship the index based counts now to start the adoption curve, and switch the breakdown to the `storage` field when it lands, keeping the same payload field names so the series is continuous.

## Appendix: value list exceptions in an ES|QL query

This section shows how a value list exception inlines into an ES|QL rule once rules move to `LOOKUP JOIN`. It is future work, the same as the rest of the ES|QL migration, and it depends on the lookup index storage this proposal introduces.

`LOOKUP JOIN` is a left join. Every event row survives the join, and the list's columns (`value` for an equality list, `range_start` and `range_end` for a range list) are filled in when the event's field matches a list document, or left null when it does not. So after the join, the field is in the list when those columns are non-null, and not in the list when they are null.

An exception suppresses alerts rather than selecting them: the rule keeps the events that do not match the exception. That inverts the operator.

| Exception operator | Reads as | Suppress when | Rule keeps | ES\|QL filter |
|---|---|---|---|---|
| `included` | field is in list | field in list | field not in list | `WHERE <list column> IS NULL` |
| `excluded` | field is not in list | field not in list | field in list | `WHERE <list column> IS NOT NULL` |

At most one list document matches any event, because equality lists hold one document per value and range lists are coalesced to disjoint intervals, so the join returns exactly one row per event and the null test is unambiguous.

### Case 1: an including exception (allowlist, range list)

**Rule.** Alert on failed VPN authentications, to catch external password guessing against the VPN gateway.

**Exception.** `source.ip` is in the value list `corporate-ip-ranges` (type `ip_range`, operator `included`). Internal networks fail VPN authentication often for benign reasons, so the analyst allowlists them: suppress the alert when the source is a corporate range, and keep the rest.

**Resulting query.**

```esql
FROM logs-network-*
| WHERE event.category == "authentication"
    AND event.outcome == "failure"
    AND network.protocol == "vpn"
| LOOKUP JOIN `.value-list-default-corporate-ip-ranges`
    ON source.ip >= range_start AND source.ip <= range_end
| WHERE range_start IS NULL       // in list means corporate, which is suppressed; keep external
```

The exception says "in the list," so the inlined filter is its negation, `IS NULL`, which keeps only the events whose source is outside every corporate range.

### Case 2: an excluding exception (watchlist, equality list)

**Rule.** Alert on access to a sensitive finance file share.

**Exception.** `host.name` is not in the value list `crown-jewel-servers` (type `keyword`, operator `excluded`). The team cares about this activity only on a small set of monitored servers, so it suppresses every event whose host is not on that list, leaving alerts only for the listed hosts.

**Resulting query.**

```esql
FROM logs-endpoint.events.file-*
| WHERE event.action == "open"
    AND file.path LIKE "*\\Finance\\*"
| LOOKUP JOIN `.value-list-default-crown-jewel-servers`
    ON host.name == value
| WHERE value IS NOT NULL         // not in list is suppressed; keep only listed hosts
```

The exception says "not in the list," so the inlined filter is its negation, `IS NOT NULL`, which keeps only the events on a crown-jewel server.
