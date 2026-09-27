# Value lists in lookup indices: response time comparison

This document reports the response times of the value list endpoints on the two storages, legacy (the shared `.items-<space>` data stream) and lookup (one lookup index per list), measured by `poc_performance_test.mjs` against a single node development stack on one machine. Absolute numbers depend on that machine and are not a capacity statement. The ratios between the two storages, measured on the same operations with the same parameters in the same run, are the result.

## Method

Each operation goes through the public API with the default refresh policy (`wait_for`) on both storages. Every cell has its own list. The `ip` cells hold single addresses; the `ip_range` cells hold `/24` blocks with a gap between every two, so no two ranges merge and the coalesced set holds one interval per range, which is the worst case for the background task. Per cell: 200 item creates one at a time, 100 reads by value, 20 find pages of 100, a burst of 50 concurrent creates, 100 deletes by value (`ip` only), one import of 10,000 lines, and the list delete. List create and delete are measured on 30 empty lists per storage. Latencies are wall clock at the client, p50 and p95 per request, or a single wall time for the burst, the import, and the list delete.

Two operations are not compared the same way on purpose. An import is measured until its items are visible in the store, because the legacy import answers before it writes and the lookup import answers after. Delete by value was measured on `ip` lists only. On a range list the current implementation returns 400 whenever a range contains the value, so there is nothing to compare; the lookup storage removes the containing ranges, found by the same containment query, and that case has not been measured.

## Results

Run of 2026-09-23, Elasticsearch and Kibana 9.6.0 snapshots, ratio is lookup over legacy on the p50 or on the single value.

| List lifecycle (30 lists) | legacy | lookup | ratio |
|---|---|---|---|
| list create (empty) | 1.02 s / 1.04 s | 1.03 s / 1.05 s | 1.00x |
| list delete (empty) | 1.06 s / 1.07 s | 1.11 s / 1.67 s | 1.05x |

| ip list | legacy | lookup | ratio |
|---|---|---|---|
| item create | 1.02 s / 1.04 s | 1.03 s / 1.05 s | 1.00x |
| item get by value | 16.2 ms / 20.0 ms | 8.5 ms / 16.9 ms | 0.53x |
| item find (page of 100) | 22.5 ms / 26.9 ms | 10.0 ms / 25.1 ms | 0.44x |
| burst of 50 concurrent creates (wall) | 1.04 s | 865 ms | 0.83x |
| item delete by value | 31.0 ms / 40.6 ms | 29.1 ms / 36.0 ms | 0.94x |
| import 10,000 lines (until visible in store) | 1.09 s | 1.19 s | 1.09x |
| list delete (with items) | 1.25 s | 1.08 s | 0.86x |

| ip_range list | legacy | lookup | ratio |
|---|---|---|---|
| item create | 1.02 s / 1.05 s | 79.9 ms / 1.04 s | 0.08x |
| item get by value | 11.7 ms / 17.1 ms | 9.2 ms / 13.0 ms | 0.78x |
| item find (page of 100) | 21.4 ms / 27.2 ms | 10.4 ms / 37.7 ms | 0.48x |
| burst of 50 concurrent creates (wall) | 394 ms | 1.72 s | 4.37x |
| import 10,000 lines (until visible in store) | 1.34 s | 960 ms | 0.72x |
| list delete (with items) | 1.29 s | 1.14 s | 0.88x |
| coalesced set clean after 200 sequential creates, from the last one | none | 254 ms | |
| coalesced set clean after the burst, from its end | none | 3.91 s | |
| coalesced set clean after the import, from its end | none | 4.54 s | |

## Reading the numbers

**Writes on the request path are bound by the refresh wait, on both storages.** A list create and an item create take one second on either storage because the API waits for the next refresh, and the index refresh interval is one second. The lookup storage adds an index creation to a list create and a document write to an item create, and neither is visible under that wait. The p95 of an empty list delete is the one place the lookup storage shows extra cost (1.67 s against 1.07 s), from deleting an index rather than a document.

**Reads are as fast or faster on the lookup storage.** Get by value and find pages are about half the legacy time, because a lookup list is a small single shard index that holds only that list, while the legacy read filters one list out of a shared stream.

**Range writes look faster than they are.** The `ip_range` item create p50 of 80 ms against a p95 of 1.04 s is not a cheaper write. The background task refreshes the index each time it writes, and a refresh in flight ends the request's `wait_for` early. When the task is idle, the write waits the full second, which is the p95.

**Concurrent writes to one range list are the cost of the design.** Fifty concurrent creates on one `ip_range` list took 1.72 s against 394 ms on the legacy storage. Every writer to a range list updates one shared state document and appends a marker, so a burst contends on that document; the update retries on conflict, on the server and then on the client with a short backoff. The same burst on an `ip` list is slightly faster on the lookup storage. A large import is one request and does not contend.

**The background task is off the request path and keeps up.** After 200 sequential creates the coalesced set was clean 254 ms after the last write. After the burst it took 3.9 s, and after a 10,000 range import 4.5 s, with one interval per range. The coverage check that runs at the end of each pass is linear in the sources and intervals; an earlier quadratic version took 8.6 s for 4,000 scattered ranges and blocked Kibana while it ran, which is why the check was rewritten before this measurement.

## Impact on a platform customer managing many lists

- **Provisioning cost per list is one index.** Creating a list creates a lookup index and an alias; deleting a list deletes them. Within the one second refresh wait the difference is not visible, but the cluster state grows by one index per list. Telemetry across 803 clusters shows a median of 2 lists per cluster, a p99 of 59, and a maximum of 239, which stays far below the point where index count is a cluster concern.
- **Equality lists are unchanged on writes and faster on reads.** A customer whose lists hold addresses, domains, or hashes sees the same write latency and about half the read latency.
- **Range lists cost more under concurrent writes, and their coalesced set lags a burst by seconds.** A customer feeding a range list from many concurrent writers should batch them into imports, which do not contend and become visible sooner than on the legacy storage (960 ms against 1.34 s for 10,000 ranges).
- **Imports become visible at the same time or sooner.** The lookup import writes synchronously and returns when the items are searchable; the legacy import returns early and finishes in the background, so a client that polls for visibility waits the same or longer on the legacy storage.
- **Nothing here measures rule execution.** The proposal's execution table describes the inline and post-filter paths; their cost was not part of this comparison.

## Reproducing

```bash
node poc_performance_test.mjs
```

Environment variables `N_ITEMS`, `N_READS`, `N_LISTS`, `IMPORT_LINES`, and `BURST` change the sizes. Run it alone: other scripts on the same Kibana distort the numbers.
