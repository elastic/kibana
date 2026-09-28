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

**Access is all or nothing within a space.** Value list access is granted for a whole Kibana space, not for individual lists. Anyone with read in a space can read every value list in that space, and anyone with write can edit or delete every one of them. There is no way to grant access to some lists and withhold others, because all lists share the same two indices.

**The model does not fit an ES|QL future.** As rules move to ES|QL, membership is naturally a join against an index, and the shared items index cannot be joined cleanly: its key would depend on the list type (`keyword` for one list, `ip` for another); every list's items share the index, and a `LOOKUP JOIN` cannot filter its right side, so the join matches every list's rows and the query has to discard the other lists' rows by `list_id` afterwards; and the current `.items-<space>` stream allows the same value twice in one list, which the join returns as two rows. It is also a data stream, not the lookup mode index that `LOOKUP JOIN` needs. One index per list, in lookup mode, is what gives ES|QL a clean index to join.

## Why not regular indices and a WHERE IN at ES|QL time

The alternative is to store each list in a regular index and test membership with a subquery, `WHERE field IN (FROM list_index | KEEP value)`. It fails for two reasons.

It does not scale. The subquery materializes the whole list into memory on every query, and Elasticsearch caps that sub-result at two percent of the heap, never above 100 MB (`esql.intermediate_local_relation_max_size`). On a node with a 1.5 GB heap the cap is 30.7 MB: a list of one million addresses fits and answers in under 300 ms, a list of one and a half million fails with `sub-plan execution results too large [62.1mb] > 30.7mb`. Telemetry shows lists of up to 154 million items. Below the cap the cost is still the whole list rebuilt in memory on every rule run. `LOOKUP JOIN` "adds new columns to your ES|QL query results table by finding documents in a lookup index that share the same join field value as your result rows" ([documentation](https://www.elastic.co/docs/reference/query-languages/esql/commands/lookup-join)): the list is an index the join reads, not a subquery result the query holds.

Ranges cannot use `IN` at all. `IN` tests membership in a set of discrete values, and a range list is a set of intervals. Range membership needs `value >= range_start AND value <= range_end`, and `LOOKUP JOIN` supports that comparison as its join condition.

## Why not ES|QL views

An ES|QL view is "a virtual index defined by an ES|QL query", with a name "used anywhere an index name is accepted in `FROM`" and a definition that "runs each time the view is referenced" ([documentation](https://www.elastic.co/docs/reference/query-languages/esql/esql-views)). Only ES|QL reads a view: the search and field capabilities APIs answer `index_not_found_exception` for a view name. So a view is relevant to the ES|QL path alone, and the alternative it suggests is a hybrid: keep every list in the current `.items-<space>` stream, which today's exception filters, indicator match rules, and item, import, and export paths keep reading unchanged, and define one view per list for ES|QL, `FROM .items-<space> | WHERE list_id == "<id>" | STATS BY <field>`, which gives the list a name of its own and removes its duplicates in the definition, with no index per list.

That hybrid was tested and does not hold, for two reasons. A view is a `FROM` source only: `LOOKUP JOIN` takes an index in lookup mode, and a `LOOKUP JOIN` that names a view fails. Membership through a view is therefore `WHERE field IN (FROM view)`, which works, deduplicated by the view, up to the same materialization cap as the section above: one million addresses pass, one and a half million fail. And ranges do not fit at all: `IN` tests discrete values, the two bound comparison a range needs is a join condition, and a view over the current stream's range column cannot be compared or aggregated at all, because ES|QL reports the field as `unsupported type [ip_range]`.

## Proposal: one lookup index per list

Store each value list in its own lookup mode index. A lookup index is single shard and exists for joins. The index holds only the values of that one list, in a simple shape: a single `value` column for equality lists, and two bound columns (`range_start`, `range_end`) for range lists.

Equality membership then becomes a lookup on `value`. Range membership becomes a lookup on the two bounds. The index is read live, so an edit to a list takes effect on the next rule run, the same as today, in a storage shape that a later ES|QL migration can join directly with a `LOOKUP JOIN`. That ES|QL migration is a separate step; this proposal is the storage swap that enables it.

**How an exception inlined in an ES|QL query would use value lists migrated to lookup indices.** Once rules run as ES|QL, a value list exception becomes part of the query. The query joins each event row to the list index on the exception's field, `LOOKUP JOIN <list index> ON <field> == value` for an equality list or on the two bounds for a range list, which adds the list's columns to the row, and then keeps or drops the row on whether the join found a match. An including exception, an allowlist, keeps only the rows without a match; an excluding exception, a watchlist, keeps only the rows with one. The appendix shows both queries in full.

**The join multiplies rows.** `LOOKUP JOIN` returns one output row for each matching list document: "if multiple documents in the lookup index match a single row in your results, the output will contain one row for each matching combination" ([documentation](https://www.elastic.co/docs/reference/query-languages/esql/commands/lookup-join)). If a value is stored twice in a list, an event holding that value comes out of the join twice. An including exception drops the row and its duplicates with it, but an excluding exception keeps them, and a rule whose query aggregates after the join counts them, so each duplicate is another alert or another unit in a count. Today this is not a problem, because exceptions are filters, not joins: a filter only tests whether an event matches, and an event matches a value stored twice exactly as it matches a value stored once. A filter never produces rows, so duplicates in the current `.items-<space>` stream cannot produce duplicate alerts.

**A deduplication strategy is therefore also required before value lists can serve exceptions inside an ES|QL query.** Every value must match at most one document. Equality lists hold one document per distinct value: the document id is a hash of the value in the canonical form of its type, so `1` and `1.0` on a `long` list are one document. Range lists keep, next to the authored ranges, a derived set of disjoint intervals that covers the same points, so any value falls inside at most one of them. Membership does not change in either case, because a value list is a set.

Deduplicating in the query instead was considered and rejected. ES|QL has no row identity to deduplicate on, so collapsing duplicates means a `STATS ... BY` over every event column, injected around a query the user wrote and possibly already aggregating. `LOOKUP JOIN` takes an index, not a subquery, so the list cannot be reduced to distinct values at join time. Ranges need disjoint intervals regardless, and single values need the same guarantee, one document per distinct value, which an id derived from the value gives. Uniqueness in this proposal is therefore enforced once, at list item write time, rather than on every rule run. More on this below.

## Supported types

Value lists are a general feature, not only an exceptions feature. Users create lists of any of the 23 element types today, and the new implementation supports all of them for storage and management, at parity. Each list becomes a lookup index with a column of its own type: a single `value` column for scalar types, the source and coalesced bounds for range types, and the native column for the rest. Create, add items, export, and delete work for every type.

Membership in exceptions is a subset, the same subset as today: keyword, ip, and ip_range. These are the types the join can evaluate, so they produce working exception behavior. The other types are stored and managed like any list, but do not drive exception membership. That matches today, where those types are storable but not functional as exceptions.

Adding more types to that subset later needs no new storage design, because every remaining type already has one of the two shapes this design defines. A numeric, date, or boolean list is stored like a keyword or ip list: one typed `value` column, one document per distinct value, joined on equality. A date or numeric range list is stored like an ip_range list: authored ranges plus the coalesced disjoint set, joined on the two bounds. The work for each type is to define the accepted spellings, which the table below already does, and to turn the exception builder on for it. Geo and text lists are stored but never joined. Each gets a lookup index with one `value` column of its own type (`geo_point`, `geo_shape`, `shape`, `text`), and each item gets the same content addressed id, hashed from the spelling a read returns (the table below gives it) with no further rules: two identical strings are one document, a point written as `lat,lon` and the same point written as WKT are two, and so are two casings of one word. That is enough, because neither type takes part in the join, so duplicates cannot multiply rows. Geo membership would need a spatial predicate and text membership uses analyzed match semantics; this design defines neither, and both types stay storable only, as today.

## Why lookup indices work for us

Value list telemetry across 803 clusters supports one index per list:

| Measure | Value |
|---|---|
| Clusters with at least one list | 788 |
| Lists in total | about 4,000 |
| Items per list, median / p90 / p99 | 17 / 761 / about 50,000 |
| Lists above 100,000 items | 22 (about 0.6%) |
| Largest list | about 154.2 million items, an ip list |
| Lists per cluster, median / p90 / p99 / max | 2 / 10 / 59 / 239 |
| Share of keyword, ip, and ip_range lists | about 97% |
| Share of ip_range lists | about 12%, in roughly a third of clusters with lists |

The largest list is near 7% of the roughly 2.1 billion document limit of a single shard ([documentation](https://www.elastic.co/docs/deploy-manage/production-guidance/optimize-performance/size-shards): "Each Elasticsearch shard is a separate Lucene index, so it shares Lucene's `MAX_DOC` limit of having at most 2,147,483,519 (`(2^31)-129`) documents."), so one shard per list has wide headroom. The one real concern with one index per list is shard count: the limit of 1,000 shards on each node, by default, is shared with data indices. At a p99 of 59 lists per cluster and a single maximum of 239, value lists take tens of shards, a small slice of the budget. If a cluster ever grows to many hundreds of lists on few nodes, placing the small unrestricted lists in one shared index is a possible fallback, but the numbers do not call for it and it would trade away access control on individual lists.

**Replicas follow the data nodes.** A lookup index is created with `auto_expand_replicas: 0-1`: one replica wherever a second data node exists, none on a single node. A fixed replica on a single node can never be allocated, yet it counts against the shard budget (`cluster.max_shards_per_node` counts unassigned shards) and keeps the cluster yellow, which is the state the current `.items-<space>` stream is in on every single node installation today. Elasticsearch recalculates the count as nodes join and leave, so adding a second node creates the copy. Durability is therefore the same as the current stream's on every cluster shape, and a single node list costs one shard instead of two. Hiding the concrete index was tested and does not help the index count: the names start with a dot, and dot prefixed patterns resolve hidden indices, so only a plain `*` resolution changes; the alias is unaffected.

**No lifecycle policy.** A lookup index gets no ILM policy and no data stream lifecycle, on purpose. The two lifecycle tools do two things, roll an index over and delete it by age, and neither fits a value list: a list is reference data that must stay whole and current, a lookup mode index is one index by definition, `LOOKUP JOIN` targets one index, and the content addressed item ids assume one document per value in one index, so rollover would break the design and deletion would destroy the list. The current `.items-<space>` stream is in the same position in practice: the plugin still ships two ILM policies (a hot phase with rollover at 50 GB), but they date from before the move to data streams, the create path stopped applying them, and a current installation runs the streams with the default data stream lifecycle and no retention, so nothing is ever deleted and rollover only ever happens on size. The largest list in telemetry is a few gigabytes, far below any rollover threshold, so the behavior a customer sees is the same on both storages: a list lives until someone deletes it.

## Migration plan

**Feature flag.** A flag controls whether new value lists are created in lookup indices and whether legacy lists can be migrated. While the flag is off and no lookup list exists, nothing changes. While the flag is on, every new list is created as a lookup list, and existing legacy lists can be migrated. The flag is the storage default for new lists, not a choice made on each create request. A lookup list that already exists is read, written, and deleted through its stored storage descriptor whether the flag is on or off, so turning the flag off after lists were created or migrated does not change how those lists behave; it only stops new ones.

**Existing lists stay as they are.** Migration is opt in, one list at a time. A legacy list keeps living in the current `.items-<space>` streams and behaves exactly as today until the user migrates it. A cluster that never enables the flag, or a user who never migrates, sees no change.

**Index naming.** Each lookup list has two names. The concrete index is `.value-list-v2-<spaceId>-<normalized listId>`. The alias is `.items-<spaceId>-<normalized listId>`, and it resolves to the concrete index. Both names use the list id, not the list display name, because the display name is mutable.

The list id is user supplied and has no character rule, so the index name and the alias use a normalized form of it: lowercase, illegal characters replaced with `-`, leading punctuation removed. An id whose concrete index name would exceed the 255 byte index name limit (about 230 characters) is rejected. Normalization is lossy: `My-List` and `my-list` normalize to the same string. Provisioning therefore fails with 409 when the index name or the alias already exists, and the user chooses a different id. An existing index is never reused. The list id itself is not changed: exceptions keep referencing the id as authored, and the index and alias names are stored on the list at provisioning, so item reads and writes resolve the list through the stored name. The alias name is recomputed from the id only when a restricted list gets its alias back, and normalization is deterministic, so it is the name provisioning produced.

The alias exists for access. It sits under the `.items*` wildcard, so a role or rule API key that grants that wildcard reads a shared list with no change. Kibana addresses a shared list by its alias.

Not every role grants a wildcard. The reserved `kibana_system` role and the serverless predefined roles use `.items-*` or `.items*`, but the stateful documentation asks for the exact names `.lists-<space-id>` and `.items-<space-id>`. A role built from those names cannot read the alias. Such a role needs one edit, `.items-<space-id>` to `.items-<space-id>*`. Each rule that a user of that role saved must then be saved again, so its API key receives the new grant. The migration verification, described next, reports exactly those rules. The documentation should move to the wildcard form before the flag ships.

The concrete name exists for two purposes. The first is access control on individual lists. This proposal adds an action that restricts a list, described in full under RBAC: Kibana removes the list's alias, so the `.items*` wildcard no longer reaches it, and only a role that grants the concrete name can read it. A list with an alias is shared; a list without one is restricted. The second purpose is deletion: deleting a list deletes its concrete index, since Elasticsearch does not delete an index through an alias.

**Migration action.** An internal endpoint in the `lists` plugin migrates one list. It verifies first, cheapest check first, and copies only when nothing blocks:

1. **Referencing rules.** It finds the rules that reference the list through exceptions and checks each rule's API key for read on the alias the list will have. This touches a handful of rules. A rule whose key cannot read it blocks the migration, and a plain call stops here with that answer, before the next check reads the list. The response names the rule and the user whose privileges its key holds, so the administrator knows which role to grant read on the alias and which rule to save again afterwards.
2. **Rejected values.** It reads every item and finds the values the lookup grammar refuses (a fraction on an integer type, an IPv6 zone id, and the other spellings the table below excludes). Any such value blocks the migration. The scan counts them as it streams and returns the count with a sample of the first hundred, so a list with millions of them costs no memory and the response stays small.
3. **Dry run.** With `dryRun` the endpoint runs both checks whatever the first finds, returns the full report, and changes nothing.
4. **Force.** With `force` the endpoint migrates past both blockers: a rule that cannot read the alias is left for the administrator to fix, and the rejected values are left out of the lookup list and reported the same way as in the check. The legacy items stay untouched either way.
5. **Copy.** It creates the concrete index and alias, copies the items into the new shape, and sets the list's storage descriptor. The list id and the exception references never change, so rules and exceptions keep resolving the same list.
6. **Retry.** A migration interrupted between creating the index and recording the descriptor leaves an index no list owns. The next attempt for that id removes it and starts clean, so an interrupted migration can always be retried.

**Both versions coexist.** Every list carries a storage descriptor in its `.lists-<space>` document, and a missing descriptor reads as legacy. The APIs and the rule types work with both. The current `.items-<space>` streams shrink as lists migrate and can be retired only when no legacy list remains.

**Rule executors do not change.** All list access already goes through one client, the ListClient. Every method resolves the list once, learns its storage kind from the descriptor, and dispatches to the matching storage. Every rule type that tests membership keeps calling the same methods. The one path outside the ListClient is indicator match with a value list as its threat index; that is covered in its own section.

**Endpoints stay stable.** The public list and item endpoints keep one contract and select the storage inside. We add the migration action, the restrict action and its reverse, and a read only `storage` field on the list metadata, so the UI can show state and offer these actions.

## Registry and storage descriptor

**The registry is the existing list container.** The `.lists-<space>` container already holds one document per list, and already supports find and sort. We extend that document with a `storage` field. `_find` keeps querying `.lists-<space>`, so it spans legacy and lookup lists in one place.

**No upgrade migration.** A list created before the feature has no `storage` field, and a missing field reads as `{ type: 'data_stream' }`, so every pre-existing list is correct with zero writes. The container mapping is strict, so the field must exist before the first write that sets it. A new installation gets the field from the index template when the existing initialization flow creates the stream. An existing installation receives one additive `PUT mapping`, applied by the lists plugin itself on the internal client before the first write that sets `storage` in a space, and remembered for each space for the life of the process. The call is idempotent and safe under a rolling upgrade, because an old node never writes `storage`. The lists plugin does this on its own, without another plugin or a UI visit.

**The storage descriptor.** Each list document carries:

```
storage: {
  type: 'data_stream' | 'lookup_index' | 'regular_index' | ... ,
  locator: {
    index: '.value-list-v2-<spaceId>-<listId>',   // the concrete index, always present
    alias: '.items-<spaceId>-<listId>'            // present while the list is shared
  }
}
```

`storage.type` names the storage kind. `storage.locator` holds the real location, stored and not derived, so a naming change or a new storage kind needs no convention rewrite. Every read and write addresses `alias ?? index`. The restrict action removes `alias`, so the presence of the alias is the shared or restricted state, and no extra flag is needed.

**Storage is read only through the public API.** The field is set when a list is provisioned or migrated, and the public update and patch endpoints never write it. A user cannot move a list's storage by hand, and the field only changes through a code path that also moves the items. The field is writable at the Elasticsearch level, though: a list user holds write on the container, so the descriptor can be set by hand. It is therefore never trusted as read. The names it should hold are derived from the space and the list id, so every read of a list recomputes them and refuses the list when the stored names differ. Those verified names are the only ones the system user acts on when it deletes an index, moves an alias, or upgrades a mapping, and each such call also checks the prefixes and refuses a wildcard or a list of names.

**Item ids on a lookup list are content addressed.** An item's `_id` is a hash of the list id and the value (`sha256(list id + value)`, prefixed with `src:` on a range list). The list id is part of the hash so the same value in two lists has two ids, and an operation that takes only an item id can reach only the list the id was minted for. Before hashing, the value is rewritten into one fixed spelling for its type, the same spelling Elasticsearch keeps when it stores the value. Two spellings of one value therefore hash to the same id and share one document: on an `ip` list, `::1` and `0:0:0:0:0:0:0:1` are both hashed as `::1`; on a `long` list, `1` and `1.0` are both hashed as `1`. The table below gives that spelling for every type. The stored `value` keeps the spelling of the last write. Each type accepts a fixed set of spellings. A spelling outside that set is rejected by the write with 400 rather than guessed, so the id can never merge two values Elasticsearch keeps apart or split one it merges. The accepted set is narrower than what Elasticsearch itself coerces; the current `.items-<space>` stream also rejects malformed values, so the change is in which spellings count as malformed. The accepted spellings and canonical forms:

| Type | Accepted spellings | Canonical form for the id |
|---|---|---|
| `keyword`, `text`, `binary` | Any non-empty value without a line break. | Trimmed, otherwise as authored. |
| `boolean` | `true`, `false`. | As authored. |
| `byte`, `short`, `integer`, `long` | A decimal, with optional sign, fraction, and exponent, whose value is a whole number in the type's range (`1`, `01`, `+1`, `1.0`, `1e3`, `0.1e1`). A non-zero fraction such as `1.9` is rejected: Elasticsearch drops it, but the smaller types pass through a double first, so `1.99999999999999999` becomes 2 there and 1 on `long`. | The integer in decimal, no leading zeros, no sign on zero (`1`; `1e3` is `1000`). Computed on the digits, so `long` keeps full precision. |
| `half_float`, `float`, `double` | A finite decimal, with optional sign, fraction, and exponent, of any length. | The number as Elasticsearch stores it, printed in the shortest form that reads back to the same number (`1.00` is `1`, `0.10` is `0.1`, `65510` is `65504` on `half_float`). The text is rounded to float or double with exact integer arithmetic, ties to even, as Java parses it; a double round trip would be off by one unit on some inputs. `half_float` is the float rounded to half precision. Negative zero stays `-0`, since Elasticsearch keeps it apart from zero. |
| `ip` | Dotted IPv4 with four decimal octets and no leading zeros; IPv6 in any spelling of hex groups; an IPv4-mapped IPv6 address as `::ffff:a.b.c.d` or `::ffff:xxxx:xxxx`. Rejected: zone ids (`fe80::1%eth0`, which Elasticsearch strips), any other dotted IPv6 form such as `::1.2.3.4` (Elasticsearch stores `::102:304`), and `010.0.0.1` or `1.2.3`. | Dotted IPv4, or compressed lowercase IPv6; an IPv4-mapped address is its IPv4 form (`::ffff:1.2.3.4` and `::ffff:102:304` are `1.2.3.4`; `0:0:0:0:0:0:0:1` is `::1`). |
| `date` | An ISO 8601 calendar date `YYYY-MM-DD`, with optional time `THH:mm[:ss[.fraction]]`, and optional offset `Z`, `±HH:MM`, `±HHMM`, or `±HH` up to 18 hours; the fraction separator may be `.` or `,`. Or epoch milliseconds of at least 11 digits. Rejected: zone names, week and ordinal dates, a space separator, and shorter digit strings, which Elasticsearch reads as a year or as epoch milliseconds depending on their length. | The UTC instant in ISO 8601 at millisecond precision (`2020-01-01`, `2020-01-01T01:00:00+01:00`, and `1577836800000` are `2020-01-01T00:00:00.000Z`). A value without an offset is UTC, as Elasticsearch reads it. |
| `date_nanos` | As `date`, with up to nine fraction digits. | The UTC instant in ISO 8601 with the authored fraction, trailing zeros removed (`2020-01-01T00:00:00,123456000Z` is `2020-01-01T00:00:00.123456Z`). |
| `ip_range`, `date_range`, `integer_range`, `long_range`, `float_range`, `double_range` | A single value, a `start-end` pair with start at or before end (`gte,lte` for dates), or a CIDR block for `ip_range`, with each endpoint in the grammar of the bound type: integer endpoints must be whole numbers and keep full precision, an exponent sign is not a separator (`1e-5-2` is `1e-5` to `2`). | As authored, trimmed. |
| `geo_point`, `geo_shape`, `shape` | A `lat,lon` pair, or a shape in Well Known Text such as `POINT (-71.34 41.12)`, the two spellings value lists accept for these types today. | The spelling a read returns: on `geo_point`, `lat,lon` with each part trimmed; on `geo_shape` and `shape`, a `lat,lon` pair becomes the WKT point `POINT (lon lat)`; WKT is kept as authored, trimmed. |

The item API behaves as it does today, with two visible differences. An item id is computed from the value, so updating an item to a different value returns a new id, and the old id stops resolving. Deleting by value on a range list removes the ranges that contain the value, which is what the current implementation attempts; today that request returns 400 whenever a range matches, because the current code rebuilds its delete query from the range strings it found and Elasticsearch rejects a range string as a term on a range field. Every item method that takes only an item id locates it with one search over the space's lookup indices and reads the owning list from the container.

## V1 rule execution by rule type

In V1 nothing about the rule executors changes. The ListClient reads from either the current `.items-<space>` data stream or the list's lookup index, whichever holds the list, and the two existing execution paths run against that. Inline, for a small list, the exception builder reads the values and builds the same terms or range filter. Post filter, for a large list, the executor queries the list's own index once for each page of results. Both paths read the values as the user authored them. The post filter is cheaper against a lookup index, because it reads one small index of a single type and needs no `list_id` filter. The one place where a rule reads a list without the ListClient is the indicator match threat index, covered below.

For reference, this is how each rule type applies a value list exception today, and it stays the same for a list in a lookup index:

| Rule type | Small list | Large list |
|---|---|---|
| Custom query (no suppression) | inline | post filter |
| Custom query (suppression) | inline | skipped, warns |
| Indicator match | inline | post filter |
| Threshold | inline | skipped, warns |
| EQL | inline | skipped, warns |
| ES\|QL | inline | skipped, warns |
| ML | inline | post filter |
| New terms | inline | skipped, warns |

The storage swap does not change which rule types apply large value lists. Large value list exceptions are still skipped on threshold, EQL, ES|QL, new terms, and custom query with suppression, with the same warning. That is what the later ES|QL migration is meant to address.

### Indicator match threat index

**How a value list is used as a threat index today.** An indicator match rule matches events against the documents of a threat index by equality, so only a list of exact values can serve as one. The rule stores a literal index name and reads it verbatim: unlike exceptions, this path does not go through the ListClient, so there is no value list indirection to resolve. A rule that uses a value list this way points at the current `.items-<space>` stream, or at a pattern such as `.items-*` that resolves to it, selects the list with a `list_id` filter in its threat query, and maps the source field to the typed column of the list type. Telemetry shows 143 clusters and 467 rules do this today. One detail of today's behavior matters later: the rule form's default threat query filters on `@timestamp`, and on the stream that field is the item's creation time, so a rule saved with the default matches only items created in the last 30 days, and the window shrinks as the list ages. A rule that keeps reading the stream keeps that behavior. A rule that reads a lookup index does not have it: the index carries no timestamp, so with the threat query the new setup requires, the whole list is read on every run.

**How it works with a list stored in a lookup index.** The author sets `threat_index` to the list's concrete index and maps the source field to `value`; the rule's API key must be able to read that index. The `list_id` filter becomes unnecessary, because the index is the list. The concrete index is the right target rather than the alias, because the alias disappears when the list is restricted. A lookup index carries no `@timestamp`, so the default threat query would match no indicator; the rule needs a threat query such as `*:*`, and the rule form will have to default to that when the threat index is a value list.

Two challenges follow from the fact that the rule holds a literal index name.

**Migration cannot rewrite the rule.** An existing rule stores `.items-<space>` and a `list_id` filter. Migration is therefore non-destructive: it does not delete the migrated list's items from the stream, so the rule continues to match. It now matches a frozen copy, because edits after migration go only to the lookup index, until the rule is updated to read the concrete index. The migration endpoint finds the indicator match rules that read the list through the stream. A rule counts when it names the stream exactly and when it uses a wildcard pattern such as `.items-*` that resolves to the stream. A rule whose threat query selects the list with a `list_id` clause blocks the migration unless the caller forces it; a rule that reads the stream without selecting the list is returned as a warning and does not block. Such a rule reads the stream without selecting any particular list, so it would appear in the migration of every list in the space, and blocking on it would block every migration. The response returns those rules, so the user knows which rules to update before migrating, or forces the migration and updates them afterwards.

**A threat query that filters on `list_id` or `@timestamp` matches nothing on a lookup index.** Both fields exist on the current `.items-<space>` stream and neither exists on a lookup index. A rule whose threat index is a lookup index and whose threat query filters on either finds no indicators, produces no alerts, and records every run as succeeded, so it looks healthy while it does nothing. Example: a user migrates the list `bad-ips`, changes the rule's threat index from `.items-default` to `.value-list-v2-default-bad-ips`, and keeps the threat query `list_id: "bad-ips" and @timestamp >= "now-30d/d"`. Neither clause can match a document in that index, and the rule stops firing without a sign of why. A new rule that keeps the rule form's default threat query, which filters on `@timestamp`, ends the same way. The rule form has to prevent this at authoring time: when the threat index is a value list, new or migrated, it should default the threat query to `*:*` and warn on a `list_id` or timestamp clause. The executor also catches it at run time, as described next. One check exists there today and stays: a threat index that lacks the rule's timestamp field produces a warning, and the run goes on; a lookup index never has that field, so that check skips lookup indices. The new check looks at the threat query instead. The cases, and how each is handled:


- **A rule that reads `.items-<space>` by its exact name.** Today's behavior, unchanged: the stream has both fields, the query matches, and after a migration the rule keeps matching the frozen copy. The migration endpoint is what reports this rule. The executor does not warn, because the query does match documents.
- **A rule that reads a pattern such as `.items-*`.** Today the pattern resolves to the stream alone. Once a shared lookup list exists in the space, it also resolves to that list's alias, and through it to the list's index, so the rule now reads the lookup index without having been pointed at it. Its threat query still matches documents on the stream, so the rule keeps producing indicators and the executor must not warn. The check therefore warns only when the query can match nothing on any of the resolved threat indices, and stays silent when one of them cannot match but another can. Example: a rule reads `.items-*` with the threat query `list_id: "bad-ips" and @timestamp >= "now-30d/d"`. The pattern resolves to `.items-default`, which has both fields, and to `.value-list-v2-default-bad-ips`, which has neither. The query can match on the first, so the executor stays silent. The executor knows which fields each index has from the field capabilities it fetches before every run.

- **A new rule that names a lookup index and keeps the default threat query.** The query filters on `@timestamp`, the index has no such field, no indicator can match. The executor reports a partial failure naming the index and the clause, and the fix is a threat query such as `*:*`.
- **A migrated rule whose index was updated but whose threat query kept `list_id`.** The same silent failure, on the path a migrating user is most likely to take. The same check reports it, because `list_id` is a field the lookup index does not have; the fix is to drop the clause, since the index is the list.
- **A rule that reads several lookup lists through a pattern, such as `.value-list-v2-<space>-*`.** A threat index can be a pattern, so one rule can match against every value list in the space at once. If such a rule carries a `list_id` or `@timestamp` clause, the clause fails on every one of those indices, and the rule has the same silent failure as above, spread over several lists. The check does not need the rule to name an index: it works on the indices the pattern resolves to, and when the query can match nothing on any of them, the executor reports the partial failure naming all of them.

- **A rule whose threat index lists both the stream and a lookup index, with the old query kept.** A threat index is a list of names, so a user updating a migrated rule can add `.value-list-v2-<space>-bad-ips` next to `.items-<space>` instead of replacing it, and leave the threat query as `list_id: "bad-ips"`. The clause still matches the frozen copy on the stream, so the rule keeps producing indicators, and the executor does not warn. The lookup index contributes nothing, because the clause cannot match there, so edits to the list after the migration never reach this rule. The migration response is where such a rule is listed for the user to fix.


**How the check decides.** The executor parses the threat query with the KQL parser the rule form uses. It already fetches the field capabilities of every threat index before a run, so it knows which fields each resolved index maps. A clause on a field the index does not map matches nothing there; Elasticsearch guarantees that. The check judges the query as a whole, the way Elasticsearch would, rather than clause by clause.

Three examples on a lookup index, which maps `value` and none of the other fields these queries name:

- `list_id: "bad-ips" and @timestamp >= "now-30d/d"` needs two fields the index lacks. It can match nothing, so the executor warns.
- `value: "10.0.0.1" or list_id: "bad-ips"` can match through its first half. No warning.
- `not list_id: "bad-ips"` matches every document, since none has the field. No warning.

A warning is therefore never a false positive, and a rule that could match something is never flagged. The check has one limit: it does not run for a threat query written in Lucene, which the rule form does not produce by default and Kibana cannot parse, so such a rule keeps today's behavior.

When the check warns, the warning surfaces as a partial failure of the run, which is the one channel the executor has for a message about a run. The message names the resolved indices and the offending clauses.




## Range storage

Equality lists need none of what follows. The rest of this section is specific to the six range types (`ip_range`, `date_range`, and the four numeric ranges).

A range list answers membership by containment: a value is in the list when it falls inside one of the authored ranges. In the current detection engine, where the list becomes a filter, overlapping ranges are harmless, because a membership question has a yes or no answer. For a `LOOKUP JOIN`, they are wrong: a value inside three overlapping ranges returns three rows for one event. That forces a second representation, the authored ranges merged into disjoint intervals, which we call the coalesced set. Producing it is called coalescing.

**Storage layout.** A range list stores two kinds of document in one index, told apart by a `kind` field. For the authored range `10.0.0.0/24` on an `ip_range` list they look like this:

```json
{ "kind": "source",    "value": "10.0.0.0/24", "src_range": { "gte": "10.0.0.0", "lte": "10.0.0.255" }, "src_start": "10.0.0.0", "src_end": "10.0.0.255" }
{ "kind": "coalesced", "range_start": "10.0.0.0", "range_end": "10.0.1.255" }
```

A source document is one authored range. It keeps the value verbatim in `value`, the same range as a range field in `src_range`, and the two ends of the range as scalar fields in `src_start` and `src_end`; we parse the authored value ourselves, so dash, CIDR, and single values are supported uniformly. A coalesced document is one interval of the coalesced set, with its two ends in `range_start` and `range_end`; the example above merged `10.0.0.0/24` with a neighbouring range. Each reader uses one of these fields. Export returns `value`. V1 membership queries `src_range`, a range field, exactly as it queries the range column of the current `.items-<space>` stream today. The coalescing task reads `src_start` and `src_end`: it streams the sources of a region sorted by their start, and Elasticsearch does not support sorting on a range field. The future join reads `range_start` and `range_end`. Two kinds of bookkeeping document complete the index, a marker for each region a write touched and one state document for the whole list; the task paragraphs below say how they are used, and `value_lists_lookup_indices_api_reference.md` gives their shape.



**Sources are the truth and the coalesced set is derived from them.** The coalesced set is a pure function of the sources, so it can always be recomputed. An update only has to record the sources correctly. A lost or half written coalesced set is a cache to repair rather than data to recover, so the list stays available when a rebuild is interrupted.

**Writers never coalesce.** A write mutates the sources and records the region it touched. One background task for each list, coordinated by Task Manager so only one instance runs at a time, re-coalesces the touched regions from the current sources. Because a single process writes coalesced documents, two coalesced writes never overlap, and the request path has no race to resolve. The task is keyed by the list's concrete index, which never changes, so restricting or unrestricting a list does not affect it. The task indexes new coalesced documents before it deletes stale ones, so an interruption leaves a superset of intervals rather than a hole, and a retry repairs it.

**Membership does not wait for the task.** V1 membership reads the sources, which the write updates before the response returns, so an edit takes effect on the next rule run. The coalesced set is rebuilt by the task after the response returns, so it is eventually consistent: until the next task run completes, the coalesced set does not reflect the latest edit. Only the future `LOOKUP JOIN` reads that set, so once rules run on ES|QL a range edit reaches them with that delay, and the ES|QL migration has to accept eventual consistency for range lists. Before the task records a rebuild as complete, it reads the sources and the coalesced set back and checks that every source lies inside some interval; a rebuild that fails that check is not recorded, the list stays marked as owing a rebuild, and the task runs again. The steps of a run are in `value_lists_lookup_indices_api_reference.md`.

**Cost is proportional to the change.** The task re-coalesces only the regions the writes recorded, reading the coalesced intervals those regions overlap and the sources inside them. A burst of writes to one list collapses to a single run. Source reads page with `search_after` on the sequence number, which is complete on the single shard, so the task is correct at any list size.

The algorithm and worked examples are in `value_lists_lookup_indices_api_reference.md`. The write path mechanics and the one timing window the design does not fully close are in `x-pack/solutions/security/plugins/lists/server/services/lookup/README.md`, under "Write path and task".

### Ranges under the later ES|QL migration

An ES|QL rule joins the event stream to the list index on the two bound columns:

```
FROM events
| LOOKUP JOIN `.items-<space>-<listId>` ON a >= range_start AND a <= range_end
| WHERE range_start IS NOT NULL        // a is in the list; use IS NULL for exclusion
```

Three properties of the storage make this work:

- **Two scalar bounds, not a range field.** ES|QL cannot use a native `ip_range` field as a join key, so a range is decomposed into two scalar columns of the element's own type.
- **Disjoint intervals, so one row per value.** At most one coalesced document contains any value, so the join returns exactly one row per event.
- **Live updates.** The join reads the index directly, so an edit is visible to the next query.

Source documents carry their bounds under `src_start` and `src_end`, so the join, which references only `range_start` and `range_end`, never matches a source.

### Export and import

Export streams the source documents and writes each authored value verbatim, so the output regenerates the user input, notation intact. The coalesced documents are never exported, because coalescing is lossy: given only a merged interval you cannot recover the CIDR and the dash range that produced it. For equality lists, export emits one line per distinct value, because a value list is a set.

## RBAC

**Today access is all or nothing within a space.** Value list access is governed by the Security feature privilege: `all` grants create, read, update, and delete on every value list in the space, `read` grants read on all of them. The list and item endpoints then run against Elasticsearch with the calling user's credentials, so the user's role also needs index privileges on the lists and items indices, which is why the documentation asks for them. Space isolation comes from the space in the index name.

**Existing RBAC still applies.** The public endpoints keep the same required privileges, so the same Security `all` and `read` cover both legacy and lookup lists.

**Reading and writing items needs no role change for wildcard roles.** A user reads and writes a shared list under their own credentials, and a rule reads it under its API key. Both reach the list through its alias, which sits under the `.items*` wildcard. A role that grants the exact documented names does not reach the alias; see index naming.

**Provisioning runs as the Kibana system user.** Creating a list creates the concrete index and its alias, migrating a list does the same, and deleting a list deletes the concrete index. Those calls need `manage` on the concrete pattern, which no user role grants: a user with `manage` on `.items*` can add and remove items on an existing lookup list but receives 403 when creating one. So the ListClient provisions with the internal client, which runs as the Kibana system user, and every item read and write stays under the calling user. For users and rules, access control is therefore unchanged. The system user itself has no privilege on `.value-list-*` today, so it needs a new grant in its reserved role, which is the Elasticsearch change described next; until that change ships, provisioning fails.

**Elasticsearch change: the Kibana system user.** The reserved `kibana_system` role must be granted `.value-list-*`, so that Kibana can manage the value list indices the same way it manages `.lists-*` and `.items-*` today. The change is made in the Elasticsearch repository and must ship before the Kibana flag is enabled.

**New capability: access control on individual lists.** Each lookup list has its own concrete index, so a role can grant Elasticsearch read on one list and not another. The shared items index cannot offer this.

**Restricting a list.** Restriction is an explicit action on one list, exposed as a new internal endpoint of the `lists` plugin next to the migration endpoint, with a reverse endpoint to un-restrict. It removes the list from the `.items*` wildcard by dropping its alias, so only roles that grant the concrete index can reach it. Un-restrict adds the alias again. Restricting is an Elasticsearch boundary, so the two operations that undo it are not open to every list writer: un-restricting a list, and deleting it, require the caller to be able to read it through the name it is reached by, the alias while shared and the concrete index once restricted. A writer without read on a restricted index gets 403 from both.

The action verifies before it changes anything. The caller must be able to read the concrete index, or they would lose access to the list. Every rule that references the list is checked: alerting decrypts the rule's API key, authenticates a request with it, and asks Elasticsearch whether it can read the concrete index; the key never leaves alerting. A rule whose key cannot read blocks the restrict unless the caller forces it. The response returns the rule and the user whose privileges its API key holds, so the administrator knows which role to grant read on the concrete index and which rule to save again afterwards. A dry run returns the report and changes nothing.

The action writes the locator first and drops the alias second. After the locator changes, Kibana addresses the concrete index, so the alias can disappear with no window where reads target a missing name. Both steps are idempotent, so a rerun completes an interrupted restrict.

**Rule execution and restricted lists.** A rule reads value lists under its API key. The key's privileges are a snapshot of the user's roles when the rule was last saved, and a role edit does not change existing keys. A rule that references a restricted list keeps working only if its key can read the concrete index; otherwise it fails at its next run with an error that returns the index. The remedy is to grant the role read on the concrete index, then save the rule, or call the public alerting endpoint `POST /api/alerting/rule/{id}/_update_api_key`, so alerting issues a new key. Disabling and enabling a rule keeps its key.

**What a restricted user sees.** The container document in `.lists-<space>` stays readable, so the list still appears by name in the value lists table and in exception entries. Item reads that name the list return 403. An item read by item id alone returns 404, because the id is looked up across the lists the caller can read and the restricted list is not among them. Hiding the list's existence needs document level security on `.lists`, which is out of scope.

## Response times

`value_lists_lookup_indices_performance.md` compares the response times of the list and item endpoints on both storages, measured on the same operations in one run. Writes on the request path are bound by the one second refresh wait on both storages, so list and item creates cost the same. Reads on a lookup list take about half the legacy time. The one cost the design adds is concurrent writes to a single range list, where a burst of fifty took about four times the legacy time because every writer updates the same state document and they wait on each other. An import does not pay that cost, since it writes the whole file in one batch and updates the state document once, and its items become visible sooner than on the legacy storage. The background coalesce task stays off the request path and caught up within seconds of a burst or a 10,000 range import. The document also states what the comparison does not cover, including rule execution.

## Telemetry

The migration is gradual, so the two storage layouts coexist for a long time, and we have to see, in each cluster, how many lists use each and whether the indicator match path is exercised against lookup indices. The Security Solution already reports value list metadata daily on the `security-lists-v2` channel; we extend that payload rather than adding a channel.

New fields:

- `lookup_list_count`: value lists stored in their own lookup index, a cardinality of `name` over `.lists-*` filtered to `storage.type: lookup_index`.
- `legacy_list_count`: `total_list_count` minus `lookup_list_count`.
- `used_in_indicator_match_rule_via_lookup_count`: indicator match rules whose threat index is a lookup list's alias or concrete index, taken from the locators in `.lists-*`. A prefix query on `.items` no longer separates the two storages, because the alias shares that prefix, so the legacy count matches the exact data stream name.

The counts read the container, which the telemetry user can access. Counting `.value-list-*` indices directly misses empty lists and returns zero under the system user, which has no read on that pattern until the Elasticsearch change ships.

## Appendix: value list exceptions in an ES|QL query

This section shows how a value list exception inlines into an ES|QL rule once rules move to `LOOKUP JOIN`. It is future work and depends on the storage this proposal introduces.

`LOOKUP JOIN` is a left join. Every event row survives, and the list's columns (`value` for an equality list, `range_start` and `range_end` for a range list) are filled when the event's field matches a list document, or left null when it does not. So after the join, the field is in the list when those columns are non-null.

An exception suppresses alerts rather than selecting them: the rule keeps the events that do not match the exception. That inverts the operator.

| Exception operator | Reads as | Suppress when | Rule keeps | ES\|QL filter |
|---|---|---|---|---|
| `included` | field is in list | field in list | field not in list | `WHERE <list column> IS NULL` |
| `excluded` | field is not in list | field not in list | field in list | `WHERE <list column> IS NOT NULL` |

At most one list document matches any event, so the join returns exactly one row per event and the null test is unambiguous.

### Case 1: an including exception (allowlist, range list)

**Rule.** Alert on failed VPN authentications, to catch external password guessing against the VPN gateway.

**Exception.** `source.ip` is in the value list `corporate-ip-ranges` (type `ip_range`, operator `included`). Internal networks fail VPN authentication often for benign reasons, so the analyst suppresses the alert when the source is a corporate range.

```esql
FROM logs-network-*
| WHERE event.category == "authentication"
    AND event.outcome == "failure"
    AND network.protocol == "vpn"
| LOOKUP JOIN `.items-default-corporate-ip-ranges`
    ON source.ip >= range_start AND source.ip <= range_end
| WHERE range_start IS NULL       // in list means corporate, which is suppressed; keep external
```

### Case 2: an excluding exception (watchlist, equality list)

**Rule.** Alert on access to a sensitive finance file share.

**Exception.** `host.name` is not in the value list `crown-jewel-servers` (type `keyword`, operator `excluded`). The team cares about this activity only on a small set of monitored servers, so it suppresses every event whose host is not on that list.

```esql
FROM logs-endpoint.events.file-*
| WHERE event.action == "open"
    AND file.path LIKE "*\\Finance\\*"
| LOOKUP JOIN `.items-default-crown-jewel-servers`
    ON host.name == value
| WHERE value IS NOT NULL         // not in list is suppressed; keep only listed hosts
```
