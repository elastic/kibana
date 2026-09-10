# Saved object audit diff: perf suite run — diffs on

Single run, diffs-on only. Compare against a diffs-off run to get deltas.
Run the suite twice with the two Scout config sets and put the tables side by side.

**Date:** 2026-09-10  
**Branch:** `feature/audit_log_saved_object_diff` @ `9bc7c5284bb2`  
**Machine:** Apple M4 Pro, 14 cores, 48 GB RAM, macOS 26.6.2  
**Kibana:** dev mode, `--max-old-space-size=1536`, audit file appender  
**Config set:** `security_audit_so_diff_perf` (diffs on, `typesToInclude: ["index-pattern"]`, `ops.interval: 2000`)

## Results

| workload | requests | lat p50 ms | lat p95 ms | EL delay max ms | EL delay p99 ms | EL util max | heap before MB | heap peak MB | heap settled MB | rss peak MB | audit events | audit KB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| bulk_create 5x(3 x 2000-panel) | 5 | 1084 | 1136 | 115 | 16 | 0.25 | 1250 | 1250 | 1182 | 1623 | 31 | 9830 |
| update x40 (2000-panel, title only) | 40 | 1018 | 1102 | 161 | 24 | 0.15 | 1208 | 1274 | 1210 | 1438 | 92 | 15110 |
| bulk_update 5x(20 x 400-panel) | 5 | 1018 | 1027 | 50 | 26 | 0.09 | 1220 | 1274 | 1260 | 1348 | 105 | 7483 |
| import overwrite 2x(30 x 200-panel) | 2 | 1010 | 1010 | 42 | 30 | 0.18 | 1270 | 1270 | 1207 | 1366 | 65 | 3087 |
| concurrent 3x(8 parallel bulk_create 6 x 1000-panel) | 24 | 994 | 1192 | 196 | 57 | 0.53 | 1175 | 1266 | 1222 | 1444 | 168 | 46606 |

## Notes

- The ~1 s latency floor on every workload is Elasticsearch's write refresh, not Kibana.
- Sequential workloads (bulk_create, update, bulk_update, import) show flat event loop delay — the diff is fast relative to the ES round-trip.
- Concurrent bulk_create is the stress case: 8 parallel batches push EL utilization to 0.53 and delay max to 196 ms. This matches the Part A micro-benchmark finding of ~2 µs per leaf × ~6000 leaves × 8 concurrent requests.
- Heap stays flat across all workloads (~1.2–1.27 GB) with no drift — allocation is transient, released once each event is written.
- Audit volume is ~375 KB per 2000-panel object (mostly `noOps`). These objects are far larger than realistic saved objects (a real Lens is ~500 leaves; dashboards store panels as a single string leaf).
- For a full A/B comparison, run again with `--serverConfigSet security_audit_so_diff_perf_baseline` and put the two tables side by side. See `results/2026-09-09_local_m4pro.md` for a previous A/B run.
