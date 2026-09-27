# Reviewer guide: value lists in lookup indices

This guide tells you what to read, in which order, what to run, and which decisions to challenge. Budget about two hours for the proposal and half a day for the POC.

The state under review is the working tree of the branch `value-list-lookup-indices-poc`, not its last commit: the branch carries uncommitted changes. The Elasticsearch change lives in a separate checkout at `~/elasticsearch`, branch `value-list-kibana-system-privileges`, also uncommitted; read it with `git diff`, not `git log`.

## 1. Read the proposal first

`value_lists_lookup_indices_proposal.md`, top to bottom. It states the decisions; the mechanics live in the README. Read it as the design under review and challenge these points in particular:

- One lookup index per list, with a concrete name and an alias under `.items*`. Is the two-name scheme worth its cost, and is the restrict path the right answer to per-list access?
- Provisioning as the Kibana system user, which needs `.value-list-*` added to the `kibana_system` reserved role in Elasticsearch. Is that the right boundary?
- Migration is non-destructive and verifies before it copies: exception rules whose API key cannot read the alias, and indicator match rules that read `.items`, block it unless forced. Are the two blockers the right ones?
- One document per distinct value, enforced at write time by a canonical form per type, with every spelling outside a fixed grammar rejected. Read the per-type table and the paragraph on why deduplicating in the query was rejected. This is the part with the most subtle history; the fourth review found data loss in an earlier version, so read the accepted grammars critically.
- Ranges: authored sources plus a coalesced disjoint set rebuilt by a background task, membership from the sources, and a coverage check before the set is recorded clean. Is that enough for the future join? Probe the boundaries yourself: the top and bottom of the IPv4 and IPv6 spaces (`0.0.0.0/0`, `255.255.255.255`, `::/0`), the integer and long maxima on the numeric range types, and a batch that mixes IPv4 with IPv6 near `::/96`. The Jest suite `coalesce_ranges_bounds.test.ts` covers these; check it against your own expectations.

Then read `value_lists_lookup_indices_performance.md`, the response time comparison of the two storages, and check its method section against the script before you accept its numbers.

## 2. Then the README

`x-pack/solutions/security/plugins/lists/server/services/lookup/README.md`. It maps the endpoints, the storage layout, the canonical forms, the migration warning levels, the coalesce algorithm, the task credential, the indicator match handling, and the file layout. Use it as the index into the code.

## 3. Run it

Requirements: Elasticsearch and Kibana from this branch, `xpack.lists.enableLookupIndices: true` in `config/kibana.dev.yml`, and a Kibana Elasticsearch user that can create `.value-list-*` indices. Until the Elasticsearch change ships, emulate it: create a role granting `all` on `.value-list-*`, a user with `kibana_system` plus that role, and start Kibana with that user.

```bash
curl -u elastic:changeme -X PUT localhost:9200/_security/role/poc_kibana_value_lists -H 'content-type: application/json' -d '{"indices":[{"names":[".value-list-*"],"privileges":["all"]}]}'
```

```bash
curl -u elastic:changeme -X PUT localhost:9200/_security/user/kibana_dev -H 'content-type: application/json' -d '{"password":"changeme","roles":["kibana_system","poc_kibana_value_lists"]}'
```

```bash
yarn start --server.basePath=/kbn --elasticsearch.username=kibana_dev --elasticsearch.password=changeme
```

Unit tests:

```bash
node scripts/jest x-pack/solutions/security/plugins/lists/server/services/lookup
```

Live scripts, each printing PASS or FAIL per check. Each cleans up its own objects when it starts, not when it ends, so the lists, rules, and exception containers of the last run stay in place until the next run. After the whole sequence about twenty enabled `poc-` rules remain on a one minute interval (the two parity scripts, the verification script, and the migration script), four of them indicator match rules reading `.items-default`. Leftover lists also hold values such as `1.2.3.4`; probe by-id item operations with values no other list in the space holds. Leftover indicator match rules that read `.items-default` appear as `maybe` warnings in every `_migrate` and `_restrict` report; that is expected and does not block. Run them in this order; the two parity scripts are the ones that matter most:

```bash
node poc_exception_parity_test.mjs
```

```bash
node poc_indicator_match_parity_test.mjs
```

```bash
node poc_migration_test.mjs && node poc_restrict_test.mjs && node poc_items_crud_test.mjs && node poc_value_list_verification.mjs && node poc_adjacency_test.mjs
```

The parity scripts run the same rules over the same events against a legacy list and its lookup twin and require identical alerts: exceptions on query rules (inline and post-filter paths, `ip` and `ip_range`, included and excluded, plus a list whose id has capitals and a space, which checks that the id stays as authored while the index name is normalized) and indicator match rules (twins, then a migration with an edit that reaches the lookup rule only).

`poc_performance_test.mjs` compares response times of the list and item endpoints on both storages with the same refresh policy: list create and delete, item create, get by value, find, delete by value (`ip` only, since by value means different things for ranges on the two storages), an import measured until its items are visible (the legacy import answers before it writes), a concurrent burst, and for lookup range lists the background time until the coalesced set is clean. Its range values are scattered blocks that never merge, the worst case for the task. It does not measure rule execution. Run it alone; other scripts on the same Kibana distort it.

To probe the internal endpoints by hand, send `kbn-xsrf: true`, `x-elastic-internal-origin: kibana`, and `elastic-api-version: 1`; the public list and item routes take `elastic-api-version: 2023-10-31`.

To observe the coalesce task on a range list, read the list's index directly: the `__state` document holds `source_version`, `coalesced_version`, and `status`; documents with `kind: dirty` are pending windows; documents with `kind: coalesced` are the set the future join reads. The Task Manager document is `lists:coalesce-rebuild:<access name>` in `.kibana_task_manager*`, where `attempts` and `runAt` show a retrying task. Task errors, including a failed coverage check, appear only in the Kibana log (the terminal that runs `yarn start`, or the file you redirect it to), as `Task lists:coalesce-rebuild "..." failed`. A run that a concurrent write made stale reconciles again within the same run; a write that lands while the task is finishing is re-enqueued a few seconds later by the scheduler, so a list should never stay dirty with no task for long. If you find one, that is a finding. Run `node scripts/jest ... --forceExit` if the Jest process lingers after the run in your workspace.

## 4. Code, in reading order

- `services/lookup/get_lookup_index.ts`, `create_lookup_index.ts`, `storage.ts`: names, normalization, the 409 on collision, the locator.
- `services/lookup/normalize_lookup_value.ts`: the accepted grammar and canonical form per type. Compare each branch with the proposal table. `parseDecimalExact` is the exact float rounding; check it against the test cases.
- `services/lookup/write_lookup_items.ts`, `coalesce_ranges.ts`: the write path, bulk error surfacing, the range parser, the coalesce task body.
- `services/lookup/membership_lookup_items.ts`: the post-filter membership query. It must build the same clauses as `services/utils/get_query_filter_from_type_value.ts` and return the same shape as `services/utils/transform_elastic_named_search_to_list_item.ts`; the Jest suite asserts both.
- `services/lookup/item_crud.ts`: item lookup by id across the space's lookup lists (from the container, not from a name pattern) and the cursor paging of `_find`.
- `services/lists/list_client.ts`: every method that dispatches on storage. Search for `lookupAccessNameOf` to find them. Check that reads and writes use the access name, provisioning uses the internal client, and the restrict and unrestrict orderings match the proposal. `services/lists/update_list.ts` builds the update response; `routes/list/find_lists_by_size_route.ts` is the only consumer of `isSmallList`.
- `routes/list/migrate_list_route.ts`, `restrict_list_route.ts`, `value_list_references.ts`, and in security_solution `rule_management/logic/search/find_rules_referencing_value_list.ts`: the scan, the blockers, `force`, `dryRun`.
- Alerting: `rules_client_factory.ts` (`checkApiKeyIndexPrivileges`) and `application/rule/methods/get_api_key_privileges/`: the rule API key privilege check. The key never leaves alerting; confirm that.
- `plugin.ts` (lists) and `tasks/coalesce_rebuild_task.ts`: the task runs as the Kibana system user and is scheduled by any ListClient; the setup contract including `isValueListLookupIndex`.
- security_solution `rule_types/create_security_rule_type_wrapper.ts` (where the validation is called), `rule_types/validation/run_execution_validation.ts`, and `utils/utils.ts` (`hasTimestampFields`): the threat index timestamp check skips lookup indices.
- Telemetry: `lib/telemetry/receiver.ts`, the value list block.
- Elasticsearch, checkout `~/elasticsearch`, branch `value-list-kibana-system-privileges`, uncommitted (`git diff`): `ReservedRolesStore.java`, `KibanaOwnedReservedRoleDescriptors.java`, `ReservedRolesStoreTests.java`.

## 5. Known limits, do not report them again

These are known and out of scope for the POC: the `meta.__forceLegacy` create hook exists only for the scripts; `DELETE /api/lists/index` does not remove `.value-list-v2-*` indices; a rule whose key check is unknown (disabled rule, or security off) is not a blocker; the referencing-rule scans cap at 1000; a space id and list id that join to the same name collide; one import handles at most 65,536 lines; item `meta` is not stored on lookup lists; an item read by item id alone on a restricted list returns 404, not 403, because the caller's readable lists do not include it; a list id longer than about 230 characters fails with the Elasticsearch index name error, not a Kibana message; a `boolean` lookup list cannot page past its first `_find` page with a cursor (it holds at most two values, so no second page exists).

## 6. What a review comment should contain

State the guarantee from the proposal or README, the file and line that breaks it, and how you verified it. Four adversarial review rounds used that format and every finding was reproducible; please keep it.
