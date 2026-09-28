# Reviewer guide: value lists in lookup indices

This guide tells you where to start, where to go next, how to read each document, how to review the code, and how to test the branch by hand.

## 1. Where to start: the proposal

`value_lists_lookup_indices_proposal.md`, top to bottom. It states the decisions and the reasons for them, and nothing else. Its sections, in order:

- What value lists are, and the two problems today: access is all or nothing within a space, and the model does not fit a `LOOKUP JOIN`.
- Two alternatives that were tested and rejected: regular indices with a `WHERE IN`, and ES|QL views.
- The proposal itself: one lookup index for each list, why the join needs one document for each distinct value, and the deduplication strategy the future ES|QL path needs.
- Supported types and the accepted spellings for each, in a table. Every spelling outside the table is rejected at write time.
- Why lookup indices work at the fleet's scale, with the telemetry figures.
- The migration plan: the flag, naming, the migration action, coexistence.
- The registry and storage descriptor, and the content addressed item ids.
- V1 rule execution by rule type, and the indicator match threat index with its two challenges.
- Range storage: the documents, the coalescing task, and how ranges behave under the later ES|QL migration.
- RBAC, the Elasticsearch change to the `kibana_system` role, and restriction.
- Response times, telemetry, and an appendix with two worked ES|QL exceptions.

## 2. Where to go next: the API reference

`value_lists_lookup_indices_api_reference.md`. Read it after the proposal and before the code. It has six parts, and you can read them in any order once you know what each holds:

- **The three new endpoints** (`_migrate`, `_restrict`, `_unrestrict`): request fields, the order of checks, the 200 body, and an error table with the `attributes` shape of each 409.
- **Existing endpoints on a lookup list**: a table of what differs from today for each public list and item endpoint. Everything not in the table behaves as it does today.
- **Storage reference**: the index settings, the two names, the container document's `storage` field, and the documents of an equality list and of a range list, with example documents and a table of which reader uses which field. Read this before the swimlanes; they name these fields.
- **Request time swimlanes**: one sequence diagram for each write operation, showing every Elasticsearch call between the request and the response and whether it runs as the caller or as the Kibana system user.
- **The coalesce rebuild task**: one diagram of a run, from the Task Manager claim to the clean or stale outcome.
- **Worked examples**: six chained examples on an `integer_range` list, each showing the request, the response, and then the task run with the concrete documents it reads and writes. The note in each diagram marks where the response has returned and the asynchronous part begins.
- **Error catalogue**: every message the code produces, by status, plus the task's log messages.

## 3. The README, for the mechanics

`x-pack/solutions/security/plugins/lists/server/services/lookup/README.md` sits next to the code and holds what the proposal leaves out: the migration warning levels and how each is decided, the range document layout, the three update operations with worked examples, the coalesce operation in pseudocode, the write path ordering (marker before version bump) and why, the task credential, the one timing window the design does not close, and the exact Elasticsearch files the reserved role change touches. Read "Write path and task" before you read `write_lookup_items.ts`.

## 4. The performance document

`value_lists_lookup_indices_performance.md` compares response times of the list and item endpoints on both storages. Read its method section first: it says what was measured, with which refresh policy, and the two operations that are compared differently on purpose (import, and delete by value). Then the tables. Then the section on what the comparison does not cover, which includes rule execution. The script behind it is `poc_performance_test.mjs`; run it alone, other scripts on the same Kibana distort it.

## 5. Reviewing the code

Read in this order. Where a file has a Jest suite, next to it or under `__tests__`, the tests state the guarantees the code is held to. Index creation and deletion, item lookup by id, the read and import streams, the paging helper, the three routes, and the plugin have no suite; the live scripts in section 6 cover them.

- `services/lookup/get_lookup_index.ts`, `create_lookup_index.ts`, `storage.ts`: names, normalization, the 409 on collision, the storage descriptor and its verification on read (`assertStorageDescriptor`), the name guards the system user calls go through.
- `services/lookup/normalize_lookup_value.ts`: the accepted grammar and canonical form of each type. Compare each branch with the proposal's table. `parseDecimalExact` is the exact float rounding.
- `services/lookup/write_lookup_items.ts`, `coalesce_ranges.ts`: the write path, bulk error surfacing, the range parser, the streaming coalescer, delete by value (`deleteLookupItemByValue`) and delete by document (`deleteAuthoredLookupItem`), and the task body (`reconcileCoalesced`).
- `services/lookup/membership_lookup_items.ts`: the post filter membership query. It builds the same clauses as `services/utils/get_query_filter_from_type_value.ts` and returns the same shape as `services/utils/transform_elastic_named_search_to_list_item.ts`; the suite asserts both.
- `services/lookup/item_crud.ts`: item lookup by id across the space's lookup lists, read from the container and never from a name pattern, and the cursor paging of `_find`.
- `services/lookup/upgrade_lookup_index.ts`: how an index created by an earlier build gets the fields a later build added.
- `services/lists/list_client.ts`: every method that dispatches on storage. Search for `lookupAccessNameOf` to find the reads and writes, `provisioningClient` to find the system user calls, and `scheduleRebuildFor` to find where the task is enqueued. The restrict and unrestrict orderings are described in the API reference.
- `routes/list/migrate_list_route.ts`, `restrict_list_route.ts`, `value_list_references.ts`, and in security_solution `rule_management/logic/search/find_rules_referencing_value_list.ts`: the scan, the `list_id` clause matching, the blockers, `force`, `dryRun`.
- Alerting: `rules_client_factory.ts` (`checkApiKeyIndexPrivileges`) and `application/rule/methods/get_api_key_privileges/`: the rule API key privilege check. The key never leaves alerting.
- `plugin.ts` (lists) and `tasks/coalesce_rebuild_task.ts`: the task definition, its id derived from the concrete index, the scheduler, `cancel`, and the setup contract including `isValueListLookupIndex` and `registerValueListRuleScanner`.
- security_solution `rule_types/create_security_rule_type_wrapper.ts`, `rule_types/validation/run_execution_validation.ts`, and `utils/utils.ts` (`hasTimestampFields`): the indicator match pre-run checks. The proposal's "Indicator match threat index" section describes the check as it should be; the code still has the earlier version, see the known limits.
- Telemetry: `lib/telemetry/receiver.ts`, the value list block.
- Elasticsearch, branch `value-list-kibana-system-privileges` in the `elastic/elasticsearch` repository: `ReservedRolesStore.java`, `KibanaOwnedReservedRoleDescriptors.java`, `ReservedRolesStoreTests.java`, under `x-pack/plugin/core/src/main/java/org/elasticsearch/xpack/core/security/authz/store/` and its test directory.

Unit tests. The lists plugin and the security solution have separate Jest configurations, so run them as separate commands:

```bash
node scripts/jest x-pack/solutions/security/plugins/lists/server/services/lookup
```

```bash
node scripts/jest x-pack/solutions/security/plugins/lists/server/services/lists/list_client_lookup_dispatch.test.ts x-pack/solutions/security/plugins/lists/server/services/lists/list_client_lookup_items.test.ts x-pack/solutions/security/plugins/lists/server/tasks/coalesce_rebuild_task.test.ts
```

```bash
node scripts/jest x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_management/logic/search/find_rules_referencing_value_list.test.ts x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/validation/run_execution_validation.test.ts x-pack/solutions/security/plugins/security_solution/server/lib/telemetry/receiver.test.ts
```

Add `--forceExit` if the Jest process lingers after the run in your workspace.

## 6. Running the branch

Requirements: Elasticsearch and Kibana from this branch, `xpack.lists.enableLookupIndices: true` in `config/kibana.dev.yml`, and a Kibana Elasticsearch user that can create `.value-list-*` indices. Until the Elasticsearch change ships, emulate it: create a role granting `all` on `.value-list-*`, a user with `kibana_system` plus that role, and start Kibana with that user.

```bash
curl -u elastic:changeme -X PUT localhost:9200/_security/role/poc_kibana_value_lists -H 'content-type: application/json' -d '{"indices":[{"names":[".value-list-*"],"privileges":["all"]}]}'
```

```bash
curl -u elastic:changeme -X PUT localhost:9200/_security/user/kibana_dev -H 'content-type: application/json' -d '{"password":"changeme","roles":["kibana_system","poc_kibana_value_lists"]}'
```

```bash
node scripts/kibana --dev --server.basePath=/kbn --elasticsearch.username=kibana_dev --elasticsearch.password=changeme
```

Kibana then answers at `http://localhost:5601/kbn`, user `elastic`, password `changeme`. When the Elasticsearch snapshot is reset the two objects above disappear and Kibana logs `unable to authenticate user [kibana_dev]`; create them again.

### Live scripts

Each script prints PASS or FAIL for each check and a summary. Each cleans up its own objects when it starts, not when it ends, so the lists, rules, and exception containers of the last run stay in place for inspection until the next run. After the whole sequence about twenty enabled `poc-` rules remain on a one minute interval, four of them indicator match rules reading `.items-default`; those appear as `maybe` warnings in every `_migrate` and `_restrict` report, which is expected and blocks nothing. Run them in this order:

```bash
node poc_exception_parity_test.mjs
```

```bash
node poc_indicator_match_parity_test.mjs
```

```bash
node poc_migration_test.mjs && node poc_restrict_test.mjs && node poc_items_crud_test.mjs && node poc_value_list_verification.mjs && node poc_adjacency_test.mjs
```

The two parity scripts are the ones that matter most: they run the same rules over the same events against a legacy list and its lookup twin and require identical alerts. The exception parity script covers query rules with `ip` and `ip_range` lists, small (inline path) and large (post filter path), included and excluded, and a list id with capitals and a space. The indicator match parity script runs twin rules, then migrates a legacy list under a rule and shows an edit after migration reaching the lookup rule only.

### Probing endpoints by hand

Internal endpoints take `kbn-xsrf: true`, `x-elastic-internal-origin: kibana`, and `elastic-api-version: 1`. Public list and item routes take `elastic-api-version: 2023-10-31`. For example, a migration dry run:

```bash
curl -s -u elastic:changeme -H 'kbn-xsrf: true' -H 'x-elastic-internal-origin: kibana' -H 'elastic-api-version: 1' -H 'content-type: application/json' -X POST 'http://localhost:5601/kbn/internal/lists/_migrate' -d '{"id":"<list id>","dryRun":true}'
```

To see a list's storage descriptor:

```bash
curl -s -u elastic:changeme -H 'elastic-api-version: 2023-10-31' 'http://localhost:5601/kbn/api/lists?id=<list id>'
```

To see the lookup indices of the space and their aliases:

```bash
curl -s -u elastic:changeme 'localhost:9200/_cat/aliases/.items-default-*?v'
```

## 7. Testing through the UI

These walkthroughs use the Security app at `http://localhost:5601/kbn/app/security`. Every value list created in the UI while the flag is on is a lookup list; you can confirm it with the `GET /api/lists?id=` call above, whose response carries `storage.type: "lookup_index"`.

### Events to match against

The rule walkthroughs need events. Create a small index with a few documents whose `source.ip` values you control:

```bash
curl -s -u elastic:changeme -H 'content-type: application/x-ndjson' 'localhost:9200/_bulk?refresh=true' --data-binary $'{"index":{"_index":"review-events"}}\n{"@timestamp":"2026-09-28T10:00:00Z","event.kind":"event","source":{"ip":"10.10.0.5"},"host":{"name":"web-1"}}\n{"index":{"_index":"review-events"}}\n{"@timestamp":"2026-09-28T10:00:01Z","event.kind":"event","source":{"ip":"10.10.0.6"},"host":{"name":"web-2"}}\n{"index":{"_index":"review-events"}}\n{"@timestamp":"2026-09-28T10:00:02Z","event.kind":"event","source":{"ip":"192.168.9.9"},"host":{"name":"db-1"}}\n'
```

Rules created below use `review-events` as their index pattern and a query of `*:*`. Set the rule's "Additional look-back time" to a day so the events above fall inside the window, or index the events again right before you run the rule.

### Value lists in the UI

1. Go to Rules, then Detection rules (SIEM), and click **Manage value lists**.
2. Click **Import value list**, choose the type (IP addresses for this walkthrough), and upload a text file with one value on each line. Include a duplicate and a spelling the grammar rejects, for example:
   ```
   10.10.0.5
   10.10.0.5
   010.10.0.6
   ```
   The list appears in the table. Click its name to open **List items**: the duplicate is one item, and `010.10.0.6` is absent, because import drops the lines the grammar rejects, as it does today.
3. In **List items**, use **Add list item** to add `10.10.0.6`, then add `10.10.0.6` again: the total does not change. Add `::ffff:10.10.0.6`: the total does not change either, since it is another spelling of the same address. Edit an item inline to a new value: the item keeps its position in the table but its id changes, which you can see by reading it through the API with the old id and getting a 404. Delete an item. The table is sorted by **Updated at**, newest first, so the edited item is first; the columns are sortable, and the filter box takes KQL, for example `ip:10.10.0.6`. The same view also uploads a file, which appends its lines to the list.
4. Read the list through Elasticsearch to see what the UI wrote:
   ```bash
   curl -s -u elastic:changeme 'localhost:9200/.value-list-v2-default-<list id>/_search?pretty&size=10'
   ```
   Each value is one document with `value`, `created_at`, `created_by`, `updated_at`, `updated_by`, and no `@timestamp`.
5. Import a second list of type IP ranges with overlapping ranges, for example `10.10.0.0/24` and `10.10.0.128-10.10.1.255`. Click the list's name: **List items** shows the two authored ranges as written. In Elasticsearch, within a few seconds, the index holds two `source` documents, one `coalesced` document spanning `10.10.0.0` to `10.10.1.255`, and a `__state` document with `status: clean`:
   ```bash
   curl -s -u elastic:changeme 'localhost:9200/.value-list-v2-default-<range list id>/_search?pretty&size=10&q=kind:coalesced%20OR%20kind:state'
   ```
6. Export a list from the table and compare the file with what you imported: the authored spellings come back, with duplicates removed.
7. Remove a list from the table. Its index and alias are gone:
   ```bash
   curl -s -u elastic:changeme 'localhost:9200/_cat/indices/.value-list-v2-default-*?v'
   ```

### Exceptions that use a value list

1. Create a custom query rule on `review-events` with query `*:*`, interval one minute, and save it enabled. Wait for its first run: three alerts, one for each event.
2. Open the rule, go to **Rule exceptions**, click **Add rule exception**. Field `source.ip`, operator **is in list**, value: the IP list from the previous walkthrough (which holds `10.10.0.5` and `10.10.0.6`). Save.
3. Index the three events again and wait for the next run: only the `192.168.9.9` event produces an alert. Add `192.168.9.9` to the list through **List items** (click the list's name in **Manage value lists**), index the events again: no alert. Remove it from the list: the alert returns. Membership follows the list with no delay other than the rule interval.
4. Edit the exception's operator to **is not in list**, index the events again: only the two listed addresses produce alerts.
5. Repeat step 2 with the IP ranges list on a second rule. An event at `10.10.0.200` is excepted, since it falls inside the coalesced range; an event at `10.10.2.1` is not. Add the range `10.10.2.0/24` through **List items** and index the `10.10.2.1` event again: it is excepted on the next run, before or after the coalescing task has run, because V1 membership reads the authored ranges.
6. Read the rule's execution log: no warning about the list. Compare with the same exception on a legacy list, created through the API with `"meta": {"__forceLegacy": true}` in the create body and the same items: the alerts are identical. This is what `poc_exception_parity_test.mjs` automates.

### Indicator match rules that use a value list as a threat index

1. Create a rule of type **Indicator Match**. Index patterns `review-events`, query `*:*`. Under **Indicator index patterns**, replace the default with `.value-list-v2-default-<ip list id>`, the concrete index of the IP list. Set **Indicator index query** to `*:*`. Under **Indicator mapping**, map field `source.ip` to indicator field `value`. Save the rule enabled with a one minute interval.
2. Wait for a run: two alerts, for `10.10.0.5` and `10.10.0.6`. Open one: its threat enrichment carries the matched list document.
3. Add `192.168.9.9` to the list in **List items**, index the events again: three alerts on the next run. The rule reads the list directly, with no `list_id` filter, because the index is the list.
4. Edit the rule and set **Indicator index query** back to its default, `@timestamp >= "now-30d/d"`. On the next run the rule produces no alerts and its execution status is a partial failure whose message names the index and says the threat query filters on `@timestamp`, which the lookup index does not carry. Set the query back to `*:*`.
5. Restrict the list (next walkthrough) and run the rule again: it keeps working, because it reads the concrete index, which the restrict does not touch.

### Migrating a legacy list under rules

This walkthrough starts with the flag off, so the UI creates legacy lists, then turns it on.

1. Stop Kibana, set `xpack.lists.enableLookupIndices: false`, start it again. Import an IP list `legacy-ips` through **Manage value lists** with `10.10.0.5`. Its `GET /api/lists?id=legacy-ips` response has no `storage` field.
2. Create a query rule with an exception **is in list** `legacy-ips`, and an indicator match rule with **Indicator index patterns** `.items-default`, **Indicator index query** `list_id: "legacy-ips"`, and **Indicator mapping** `source.ip` to `ip`. Both enabled, one minute interval. Confirm the exception suppresses the `10.10.0.5` alert and the indicator match rule alerts on it.
3. Stop Kibana, set the flag to `true`, start it again. Run the migration as a dry run with the `curl` above: the response lists the indicator match rule under `referencingRules` with `reason: "threat_index"`, `blocked: true`, and the exception rule with `reason: "exception"` and `canRead: true`. Run it for real without `force`: 409 with the same report. Run it with `"force": true`: 200, `migration.itemsCopied: 1`. The list now has a storage descriptor and an index.
4. Add `10.10.0.6` to `legacy-ips` through **List items** and index the events again. The exception rule stops alerting on `10.10.0.6` too: exceptions follow the migrated list. The indicator match rule still alerts only on `10.10.0.5`: it reads the frozen copy in `.items-default`.
5. Edit the indicator match rule: **Indicator index patterns** `.value-list-v2-default-legacy-ips`, **Indicator index query** `*:*`, mapping `source.ip` to `value`. On the next run it alerts on both addresses.
6. Edit the rule once more and set **Indicator index query** back to `list_id: "legacy-ips"` while keeping the new index. The next run succeeds with no alerts and no warning: the clause matches nothing on a lookup index, and the current check does not catch it. This is the silent case the proposal's indicator match section describes and the known limits list. Restore `*:*`.

### Restricting a list

1. Create a role `list-reader` with Kibana Security privilege `read` and Elasticsearch `read` on `.lists*` and `.items*`, and a user `reader` with that role. Log in as `reader` in a second browser: **Manage value lists** shows every list, and **List items** opens for each.
2. As `elastic`, restrict the IP list with a dry run, then for real:
   ```bash
   curl -s -u elastic:changeme -H 'kbn-xsrf: true' -H 'x-elastic-internal-origin: kibana' -H 'elastic-api-version: 1' -H 'content-type: application/json' -X POST 'http://localhost:5601/kbn/internal/lists/_restrict' -d '{"id":"<ip list id>","dryRun":true}'
   ```
   The dry run report names the alias that will be removed and the rules that reference the list. If a referencing rule's API key cannot read the concrete index, the real call answers 409 with the remedy; the rules created above run under `elastic`, so they pass.
3. As `reader`, refresh **Manage value lists**: the list is still in the table, because the container stays readable, but **List items** fails for it. As `elastic`, everything still works.
4. Grant `list-reader` Elasticsearch `read` on `.value-list-v2-default-<ip list id>`: `reader` can open **List items** again.
5. As `reader`, call `_unrestrict` for the list: 403, since `reader` holds no Kibana `all` privilege on lists; a writer without read on the concrete index also gets 403. As `elastic`, call it: 200, the alias is back, and `_cat/aliases` shows it.

## 8. Known limits

These are known and out of scope for the POC.

- The `meta.__forceLegacy` create hook exists only for the scripts, to create a legacy list while the flag is on.
- `DELETE /api/lists/index` does not remove `.value-list-v2-*` indices.
- The migration and restrict checks block only on a referencing rule whose API key is known to lack read on the list. A rule whose key cannot be checked is reported but never blocks: a rule created disabled and never enabled has no API key yet (alerting issues one on the first enable, and disabling an enabled rule keeps its key), and a deployment with security off has no privileges to check.
- The referencing rule scans read at most 1000 rules.
- A space id and a list id that join to the same index name collide.
- One import handles at most 65,536 lines.
- Item `meta` is not stored on lookup lists.
- An item read by item id alone on a restricted list returns 404, not 403, because the caller's readable lists do not include it.
- A list id longer than about 230 characters fails with the Elasticsearch index name error, not a Kibana message.
- A `boolean` lookup list cannot page past its first `_find` page with a cursor: it holds at most two values, so no second page exists.
- An indicator match rule whose threat index is a wildcard such as `.items-*` and whose threat query filters on `@timestamp` reports a partial failure once any shared lookup list exists in the space, because the pattern resolves to the lists' aliases and the timestamp warning counts every resolved lookup index. The proposal's "Indicator match threat index" section describes the replacement check; it is not implemented yet.
- The same check does not catch a `list_id` clause kept on a rule whose threat index was moved to a lookup index; such a rule runs with no alerts and no warning.

## 9. What a review comment should contain

State the guarantee from the proposal, the API reference, or the README, the file and line that breaks it, and how you verified it.
