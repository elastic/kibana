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

**The model does not fit an ES|QL future.** As rules move to ES|QL, membership is naturally a join against an index, and the shared items index cannot be joined cleanly: its key would depend on the list type (`keyword` for one list, `ip` for another); every list's items share the index, and a `LOOKUP JOIN` cannot filter its right side, so the join matches every list's rows and the query has to discard the other lists' rows by `list_id` afterwards; and the shared stream allows the same value twice in one list, which the join returns as two rows. It is also a data stream, not the lookup mode index that `LOOKUP JOIN` needs. One index per list, in lookup mode, is what gives ES|QL a clean index to join.

## Why not regular indices and a WHERE IN at ES|QL time

The alternative is to store each list in a regular index and test membership with a subquery, `WHERE field IN (FROM list_index | KEEP value)`. It fails for two reasons.

It does not scale. The subquery materializes the whole list into one set per query, and Elasticsearch caps that sub-result, so a large list fails with `sub-plan execution results too large`. `LOOKUP JOIN` "adds new columns to your ES|QL query results table by finding documents in a lookup index that share the same join field value as your result rows" ([documentation](https://www.elastic.co/docs/reference/query-languages/esql/commands/lookup-join)): the list is an index the join reads, not a subquery result the query holds.

Ranges cannot use `IN` at all. `IN` tests membership in a set of discrete values, and a range list is a set of intervals. Range membership needs `value >= range_start AND value <= range_end`, and `LOOKUP JOIN` supports that comparison as its join condition.

## Proposal: one lookup index per list

Store each value list in its own lookup mode index. A lookup index is single shard and exists for joins. The index holds only the values of that one list, in a simple shape: a single `value` column for equality lists, and two bound columns (`range_start`, `range_end`) for range lists.

Equality membership then becomes a lookup on `value`. Range membership becomes a lookup on the two bounds. The index is read live, so an edit to a list takes effect on the next rule run, the same as today, in a storage shape that a later ES|QL migration can join directly with a `LOOKUP JOIN`. That ES|QL migration is a separate step; this proposal is the storage swap that enables it.

**How an exception inlined in an ES|QL query would use value lists migrated to lookup indices.** Once rules run as ES|QL, a value list exception becomes part of the query. The query joins each event row to the list index on the exception's field, `LOOKUP JOIN <list index> ON <field> == value` for an equality list or on the two bounds for a range list, which adds the list's columns to the row, and then keeps or drops the row on whether the join found a match. An including exception, an allowlist, keeps only the rows without a match; an excluding exception, a watchlist, keeps only the rows with one. The appendix shows both queries in full.

**The join multiplies rows.** `LOOKUP JOIN` returns one output row for each matching list document: "if multiple documents in the lookup index match a single row in your results, the output will contain one row for each matching combination" ([documentation](https://www.elastic.co/docs/reference/query-languages/esql/commands/lookup-join)). If a value is stored twice in a list, an event holding that value comes out of the join twice. An including exception drops the row and its duplicates with it, but an excluding exception keeps them, and a rule whose query aggregates after the join counts them, so each duplicate is another alert or another unit in a count. Today this is not a problem, because exceptions are filters, not joins: a filter only tests whether an event matches, and an event matches a value stored twice exactly as it matches a value stored once. A filter never produces rows, so duplicates in the shared stream cannot produce duplicate alerts.

**A deduplication strategy is therefore also required before value lists can serve exceptions inside an ES|QL query.** Every value must match at most one document. Equality lists hold one document per distinct value: the document id is a hash of the value in the canonical form of its type, so `1` and `1.0` on a `long` list are one document. Range lists keep, next to the authored ranges, a derived set of disjoint intervals that covers the same points, so any value falls inside at most one of them. Membership does not change in either case, because a value list is a set.

Deduplicating in the query instead was considered and rejected. ES|QL has no row identity to deduplicate on, so collapsing duplicates means a `STATS ... BY` over every event column, injected around a query the user wrote and possibly already aggregating. `LOOKUP JOIN` takes an index, not a subquery, so the list cannot be reduced to distinct values at join time. Ranges need disjoint intervals regardless, and single values need the same guarantee, one document per distinct value, which an id derived from the value gives. Uniqueness in this proposal is therefore enforced once, at list item write time, rather than on every rule run. More on this below.

## Supported types

Value lists are a general feature, not only an exceptions feature. Users create lists of any of the 23 element types today, and the new implementation supports all of them for storage and management, at parity. Each list becomes a lookup index with a column of its own type: a single `value` column for scalar types, the source and coalesced bounds for range types, and the native column for the rest. Create, add items, export, and delete work for every type.

Membership in exceptions is a subset, the same subset as today: keyword, ip, and ip_range. These are the types the join can evaluate, so they produce working exception behavior. The other types are stored and managed like any list, but do not drive exception membership. That matches today, where those types are storable but not functional as exceptions.

Adding more types to that subset later needs no new storage design, because every remaining type already has one of the two shapes this design defines. A numeric, date, or boolean list is stored like a keyword or ip list: one typed `value` column, one document per distinct value, joined on equality. A date or numeric range list is stored like an ip_range list: authored ranges plus the coalesced disjoint set, joined on the two bounds. The work per type is to define the accepted spellings, which the table below already does, and to turn the exception builder on for it. Geo and text lists are stored but never joined. Each gets a lookup index with one `value` column of its own type (`geo_point`, `geo_shape`, `shape`, `text`), and each item gets the same content addressed id, hashed from the trimmed authored string with no spelling rules: two identical strings are one document, two spellings of the same point or two casings of one word are two. That is enough, because neither type takes part in the join, so duplicates cannot multiply rows. Geo membership would need a spatial predicate and text membership uses analyzed match semantics; this design defines neither, and both types stay storable only, as today.

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

The largest list is near 7% of the roughly 2.1 billion document limit of a single shard ([documentation](https://www.elastic.co/docs/deploy-manage/production-guidance/optimize-performance/size-shards): "Each Elasticsearch shard is a separate Lucene index, so it shares Lucene's `MAX_DOC` limit of having at most 2,147,483,519 (`(2^31)-129`) documents."), so one shard per list has wide headroom. The one real concern with one index per list is shard count: the per node limit (1,000 by default) is shared with data indices. At a p99 of 59 lists per cluster and a single maximum of 239, value lists take tens of shards, a small slice of the budget. If a cluster ever grows to many hundreds of lists on few nodes, placing the small unrestricted lists in one shared index is a possible fallback, but the numbers do not call for it and it would trade away per list access control.

## Migration plan

**Feature flag.** A flag controls whether new value lists are created in lookup indices. While the flag is off, nothing changes. While the flag is on, every new list is created as a lookup list, and existing legacy lists can be migrated. The flag is the storage default for new lists, not a per list choice on the create request.

**Existing lists stay as they are.** Migration is opt in, per list. A legacy list keeps living in the shared streams and behaves exactly as today until the user migrates it. A cluster that never enables the flag, or a user who never migrates, sees no change.

**Index naming.** Each lookup list has two names. The concrete index is `.value-list-v2-<spaceId>-<normalized listId>`. The alias is `.items-<spaceId>-<normalized listId>`, and it resolves to the concrete index. Both names use the list id, not the list display name, because the display name is mutable.

The list id is user supplied and has no character rule, so the index name and the alias use a normalized form of it: lowercase, illegal characters replaced with `-`, leading punctuation removed. An id whose concrete index name would exceed the 255 byte index name limit (about 230 characters) is rejected. Normalization is lossy: `My-List` and `my-list` normalize to the same string. Provisioning therefore fails with 409 when the index name or the alias already exists, and the user chooses a different id. An existing index is never reused. The list id itself is not changed: exceptions keep referencing the id as authored, and the index and alias names are stored on the list at provisioning, so item reads and writes resolve the list through the stored name. The alias name is recomputed from the id only when a restricted list gets its alias back, and normalization is deterministic, so it is the name provisioning produced.

The alias exists for access. It sits under the `.items*` wildcard, so a role or rule API key that grants that wildcard reads a shared list with no change. Kibana addresses a shared list by its alias.

Not every role grants a wildcard. The reserved `kibana_system` role and the serverless predefined roles use `.items-*` or `.items*`, but the stateful documentation asks for the exact names `.lists-<space-id>` and `.items-<space-id>`. A role built from those names cannot read the alias. Such a role needs one edit, `.items-<space-id>` to `.items-<space-id>*`. Each rule that a user of that role saved must then be saved again, so its API key receives the new grant. The migration verification, described next, reports exactly those rules. The documentation should move to the wildcard form before the flag ships.

The concrete name exists for two purposes. The first is per list access. This proposal adds an action that restricts a list, described in full under RBAC: Kibana removes the list's alias, so the `.items*` wildcard no longer reaches it, and only a role that grants the concrete name can read it. A list with an alias is shared; a list without one is restricted. The second purpose is deletion: deleting a list deletes its concrete index, since Elasticsearch does not delete an index through an alias.

**Migration action.** An internal endpoint in the `lists` plugin migrates one list. It first verifies: it finds the rules that reference the list through exceptions and checks each rule's API key for read on the alias the list will have. A rule whose key cannot read it blocks the migration unless the caller forces it. The response returns the rule and the user whose privileges its API key holds, so the administrator knows which role to grant read on the alias and which rule to save again afterwards. It then creates the concrete index and alias, copies the items into the new shape, and sets the list's storage descriptor. The list id and the exception references never change, so rules and exceptions keep resolving the same list.

**Both versions coexist.** Every list carries a storage descriptor in its `.lists-<space>` document, and a missing descriptor reads as legacy. The APIs and the rule types work with both. The shared streams shrink as lists migrate and can be retired only when no legacy list remains.

**Rule executors do not change.** All list access already goes through one client, the ListClient. Every method resolves the list once, learns its storage kind from the descriptor, and dispatches to the matching storage. Every rule type that tests membership keeps calling the same methods. The one path outside the ListClient is indicator match with a value list as its threat index; that is covered in its own section.

**Endpoints stay stable.** The public list and item endpoints keep one contract and select the storage inside. We add the migration action, the restrict action and its reverse, and a read only `storage` field on the list metadata, so the UI can show state and offer these actions.

## Registry and storage descriptor

**The registry is the existing list container.** The `.lists-<space>` container already holds one document per list, and already supports find and sort. We extend that document with a `storage` field. `_find` keeps querying `.lists-<space>`, so it spans legacy and lookup lists in one place.

**No upgrade migration.** A list created before the feature has no `storage` field, and a missing field reads as `{ type: 'data_stream' }`, so every pre-existing list is correct with zero writes. The container mapping is strict, so the field must exist before the first write that sets it. A new installation gets the field from the index template when the existing initialization flow creates the stream. An existing installation receives one additive `PUT mapping`, applied by the lists plugin itself on the internal client before the first write that sets `storage` in a space, and remembered per space for the life of the process. The call is idempotent and safe under a rolling upgrade, because an old node never writes `storage`. The lists plugin does this on its own, without another plugin or a UI visit.

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

**Storage is read only through the public API.** The field is set when a list is provisioned or migrated, and the public update and patch endpoints never write it. A user cannot move a list's storage by hand, and the field only changes through a code path that also moves the items.

**Item ids on a lookup list are content addressed.** An item's `_id` is a hash of the list id and the value (`sha256(list id + value)`, prefixed with `src:` on a range list). The list id is part of the hash so the same value in two lists has two ids, and an operation that takes only an item id can reach only the list the id was minted for. The value is hashed in the canonical form of its type, the spelling of the value as Elasticsearch stores it, so the spellings Elasticsearch treats as one value share one document (`::1` and `0:0:0:0:0:0:0:1` both get `_id = sha256("::1")`; `1` and `1.0` on a `long` list both get `_id = sha256("1")`). The stored `value` keeps the spelling of the last write. Each type accepts a fixed set of spellings. A spelling outside that set is rejected by the write with 400 rather than guessed, so the id can never merge two values Elasticsearch keeps apart or split one it merges. The accepted set is narrower than what Elasticsearch itself coerces; the shared stream also rejects malformed values, so the change is in which spellings count as malformed. The accepted spellings and canonical forms:

| Type | Accepted spellings | Canonical form for the id |
|---|---|---|
| `keyword`, `text`, `binary` | Any non-empty value without a line break. | Trimmed, otherwise as authored. |
| `boolean` | `true`, `false`. | As authored. |
| `byte`, `short`, `integer`, `long` | A decimal, with optional sign, fraction, and exponent, whose value is a whole number in the type's range (`1`, `01`, `+1`, `1.0`, `1e3`, `0.1e1`). A non-zero fraction such as `1.9` is rejected: Elasticsearch drops it, but the smaller types pass through a double first, so `1.99999999999999999` becomes 2 there and 1 on `long`. | The integer in decimal, no leading zeros, no sign on zero (`1`; `1e3` is `1000`). Computed on the digits, so `long` keeps full precision. |
| `half_float`, `float`, `double` | A finite decimal, with optional sign, fraction, and exponent, of any length. | The number as Elasticsearch stores it, printed in the shortest form that reads back to the same number (`1.00` is `1`, `0.10` is `0.1`, `65510` is `65504` on `half_float`). The text is rounded to float or double with exact integer arithmetic, ties to even, as Java parses it; a double round trip would be off by one unit on some inputs. `half_float` is the float rounded to half precision. Negative zero stays `-0`, since Elasticsearch keeps it apart from zero. |
| `ip` | Dotted IPv4 with four decimal octets and no leading zeros; IPv6 in any spelling of hex groups; an IPv4-mapped IPv6 address as `::ffff:a.b.c.d` or `::ffff:xxxx:xxxx`. Rejected: zone ids (`fe80::1%eth0`, which Elasticsearch strips), any other dotted IPv6 form such as `::1.2.3.4` (Elasticsearch stores `::102:304`), and `010.0.0.1` or `1.2.3`. | Dotted IPv4, or compressed lowercase IPv6; an IPv4-mapped address is its IPv4 form (`::ffff:1.2.3.4` and `::ffff:102:304` are `1.2.3.4`; `0:0:0:0:0:0:0:1` is `::1`). |
| `date` | An ISO 8601 calendar date `YYYY-MM-DD`, with optional time `THH:mm[:ss[.fraction]]`, and optional offset `Z`, `±HH:MM`, `±HHMM`, or `±HH` up to 18 hours; the fraction separator may be `.` or `,`. Or epoch milliseconds of at least 11 digits. Rejected: zone names, week and ordinal dates, a space separator, and shorter digit strings, which Elasticsearch reads as a year or as epoch milliseconds depending on their length. | The UTC instant in ISO 8601 at millisecond precision (`2020-01-01`, `2020-01-01T01:00:00+01:00`, and `1577836800000` are `2020-01-01T00:00:00.000Z`). A value without an offset is UTC, as Elasticsearch reads it. |
| `date_nanos` | As `date`, with up to nine fraction digits. | The UTC instant in ISO 8601 with the authored fraction, trailing zeros removed (`2020-01-01T00:00:00,123456000Z` is `2020-01-01T00:00:00.123456Z`). |
| `ip_range`, `date_range`, `integer_range`, `long_range`, `float_range`, `double_range` | A single value, a `start-end` pair with start at or before end (`gte,lte` for dates), or a CIDR block for `ip_range`, with each endpoint in the grammar of the bound type: integer endpoints must be whole numbers and keep full precision, an exponent sign is not a separator (`1e-5-2` is `1e-5` to `2`). | As authored. The join reads the coalesced intervals, not the sources, so two spellings of one range cannot duplicate a row. |
| `geo_point`, `geo_shape`, `shape` | What the existing serializer accepts. | Trimmed, otherwise as authored. Not joinable. |

Adding the same value twice collapses to one document, and deleting a value is a direct delete with no search. The id names a value, not a row: an update writes the new value, removes the old one, and returns the new id. The item methods that take only an item id locate it with one search over the space's lookup indices and read the owning list from the container.

## V1 rule execution per rule type

In V1 nothing about the rule executors changes. The ListClient reads from the lookup index and the two existing execution paths run against it. Inline, for a small list, the exception builder reads the values and builds the same terms or range filter. Post filter, for a large list, the executor queries the per list index once per page of results. Both paths read the authored values, so membership is correct even while the derived range set lags.

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

The storage swap does not change which rule types apply large value lists. Large value list exceptions are still skipped on threshold, EQL, ES|QL, new terms, and custom query with suppression, with the same warning. That is what the later ES|QL migration is meant to address.

### Indicator match threat index

Indicator match does not go through the ListClient for its threat index. The rule stores a literal index name and reads it verbatim, so there is no value list indirection to resolve, and migration cannot rewrite the rule. Telemetry shows 143 clusters and 467 rules use a value list as a threat index today.

The executor matches events against the threat index by equality only, so only a list of exact values works as a threat index. The author of a new rule sets `threat_index` to the list's concrete index and maps the source field to `value`; the rule's API key must be able to read that index. The `list_id` filter needed today becomes unnecessary, because the index is the list.

An existing rule stores `.items-<space>` and a `list_id` filter. Migration is therefore non-destructive: it does not delete the migrated list's rows from `.items`, so the rule continues to match. It now matches a frozen copy, because edits after migration go only to the lookup index, until the rule is updated to read the concrete index. The concrete index is the right target for a rule, because the alias disappears when the list is restricted. The migration endpoint finds the indicator match rules that read the list through `.items`. A rule whose threat query names the list blocks the migration unless the caller forces it; a rule that reads `.items` without naming the list is returned as a warning, because every such rule would otherwise block every migration in the space. The response returns those rules, so the user knows which rules to update before migrating, or forces the migration and updates them afterwards.

The scan reads detection rules, which the `lists` plugin does not own. So the `lists` plugin exposes a registration hook for a rule scanner, and the security solution registers one that uses the detection rule search. If no scanner is registered, the endpoint returns no warning.

## Range storage

Equality lists need none of what follows. The rest of this section is specific to the six range types (`ip_range`, `date_range`, and the four numeric ranges).

A range list answers membership by containment: a value is in the list when it falls inside one of the authored ranges. For a filter, overlapping ranges are harmless, because a membership question has a yes or no answer. For a `LOOKUP JOIN`, they are wrong: a value inside three overlapping ranges returns three rows for one event. That forces a second representation, the authored ranges merged into disjoint intervals, which we call the coalesced set. Producing it is called coalescing.

**Storage layout.** A range list stores documents of several kinds in one index, told apart by a `kind` field. A source document keeps the authored value verbatim, plus its parsed bounds `src_start` and `src_end`. A coalesced document carries the disjoint bounds `range_start` and `range_end`. The verbatim value is what export returns; the parsed bounds are what V1 membership queries; the disjoint bounds are what the future join reads. We parse the authored value ourselves, so dash, CIDR, and single values are supported uniformly.

**Sources are the truth and the coalesced set is derived from them.** The coalesced set is a pure function of the sources, so it can always be recomputed. An update only has to record the sources correctly. A lost or half written coalesced set is a cache to repair rather than data to recover, so the list stays available when a rebuild is interrupted.

**Writers never coalesce.** A write mutates the sources and records the region it touched. One background task per list access name, coordinated by Task Manager so only one instance runs at a time, re-coalesces the touched regions from the current sources. Because a single process writes coalesced documents, two coalesced writes never overlap, and the request path has no race to resolve. Restricting or unrestricting a list changes its access name and so its task id; a task still running under the old name finishes its pass, and the next write under the new name schedules a fresh one. The task indexes new coalesced documents before it deletes stale ones, so an interruption leaves a superset of intervals rather than a hole, and a retry repairs it.

**Membership does not wait for the task.** V1 membership reads the sources, which the write updates synchronously, so an edit takes effect on the next rule run. The coalesced set is eventually consistent and lags an edit by the task's poll interval. That lag reaches only the future join, where the worst case is a duplicate row until the next run. It cannot cause a missed alert. A missing interval could, so the task verifies coverage before it records the set clean: every source must lie inside some coalesced interval, read back from Elasticsearch, or the task fails and the state stays dirty. The version guard alone proves the task ran, not that its result is complete.

**Cost is proportional to the change.** The task re-coalesces only the regions the writes recorded, reading the coalesced intervals those regions overlap and the sources inside them. A burst of writes to one list collapses to a single run. Source reads page with `search_after` on the sequence number, which is complete on the single shard, so the task is correct at any list size.

The algorithm, the write path, the worked examples, and the one timing window the design does not fully close are in the lookup service README next to the code.

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

**Today access is all or nothing per space.** Value list access is governed by the Security feature privilege: `all` grants create, read, update, and delete on every value list in the space, `read` grants read on all of them. The list and item endpoints then run against Elasticsearch with the calling user's credentials, so the user's role also needs index privileges on the lists and items indices, which is why the documentation asks for them. Space isolation comes from the space in the index name.

**Existing RBAC still applies.** The public endpoints keep the same required privileges, so the same Security `all` and `read` cover both legacy and lookup lists.

**Reading and writing items needs no role change for wildcard roles.** A user reads and writes a shared list under their own credentials, and a rule reads it under its API key. Both reach the list through its alias, which sits under the `.items*` wildcard. A role that grants the exact documented names does not reach the alias; see index naming.

**Provisioning runs as the Kibana system user.** Creating a list creates the concrete index and its alias, migrating a list does the same, and deleting a list deletes the concrete index. Those calls need `manage` on the concrete pattern, which no user role grants: a user with `manage` on `.items*` can add and remove items on an existing lookup list but receives 403 when creating one. So the ListClient provisions with the internal client, and every item read and write stays under the calling user. Access control is unchanged.

### Elasticsearch change: the Kibana system user

The reserved `kibana_system` role must be granted `.value-list-*`, so that Kibana can manage the value list indices the same way it manages `.lists-*` and `.items-*` today. The change is made in the Elasticsearch repository and must ship before the Kibana flag is enabled.

**New capability: per list access.** Each lookup list has its own concrete index, so a role can grant Elasticsearch read on one list and not another. The shared items index cannot offer this.

**Restricting a list.** Restriction is an explicit action on one list, exposed as a new internal endpoint of the `lists` plugin next to the migration endpoint, with a reverse endpoint to un-restrict. It removes the list from the `.items*` wildcard by dropping its alias, so only roles that grant the concrete index can reach it. Un-restrict adds the alias again.

The action verifies before it changes anything. The caller must be able to read the concrete index, or they would lose access to the list. Every rule that references the list is checked: alerting decrypts the rule's API key, authenticates a request with it, and asks Elasticsearch whether it can read the concrete index; the key never leaves alerting. A rule whose key cannot read blocks the restrict unless the caller forces it. The response returns the rule and the user whose privileges its API key holds, so the administrator knows which role to grant read on the concrete index and which rule to save again afterwards. A dry run returns the report and changes nothing.

The action writes the locator first and drops the alias second. After the locator changes, Kibana addresses the concrete index, so the alias can disappear with no window where reads target a missing name. Both steps are idempotent, so a rerun completes an interrupted restrict.

**Rule execution and restricted lists.** A rule reads value lists under its API key. The key's privileges are a snapshot of the user's roles when the rule was last saved, and a role edit does not change existing keys. A rule that references a restricted list keeps working only if its key can read the concrete index; otherwise it fails at its next run with an error that returns the index. The remedy is to grant the role read on the concrete index, then save the rule, or run the update API key action, so alerting issues a new key. Disabling and enabling a rule keeps its key.

**What a restricted user sees.** The container document in `.lists-<space>` stays readable, so the list still appears by name in the value lists table and in exception entries. Item reads that name the list return 403. An item read by item id alone returns 404, because the id is looked up across the lists the caller can read and the restricted list is not among them. Hiding the list's existence needs document level security on `.lists`, which is out of scope.

## Response times

`value_lists_lookup_indices_performance.md` compares the response times of the list and item endpoints on both storages, measured on the same operations in one run. Writes on the request path are bound by the one second refresh wait on both storages, so list and item creates cost the same. Reads on a lookup list take about half the legacy time. The one cost the design adds is concurrent writes to a single range list, where a burst of fifty took about four times the legacy time because every writer updates one shared state document; imports do not contend and become visible sooner than on the legacy storage. The background coalesce task stays off the request path and caught up within seconds of a burst or a 10,000 range import. The document also states what the comparison does not cover, including rule execution.

## Telemetry

The migration is gradual, so the two storage layouts coexist for a long time, and we have to see per cluster how many lists use each and whether the indicator match path is exercised against lookup indices. The Security Solution already reports value list metadata daily on the `security-lists-v2` channel; we extend that payload rather than adding a channel.

New fields:

- `lookup_list_count`: value lists stored in a per list lookup index, a cardinality of `name` over `.lists-*` filtered to `storage.type: lookup_index`.
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
