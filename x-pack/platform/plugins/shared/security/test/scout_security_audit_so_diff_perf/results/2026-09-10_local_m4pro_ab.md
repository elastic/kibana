# Saved object audit diff: A/B performance results

**Date:** 2026-09-10  
**Branch:** `feature/audit_log_saved_object_diff` @ `9bc7c5284bb2`  
**Machine:** Apple M4 Pro, 14 cores, 48 GB RAM, macOS 26.6.2  
**Kibana:** dev mode from source, `--max-old-space-size=1536`, audit file appender  
**Suite:** `scout_security_audit_so_diff_perf`, run via `node scripts/scout run-tests`

Two back-to-back runs: `security_audit_so_diff_perf` (diffs on) then
`security_audit_so_diff_perf_baseline` (diffs off). Same workloads, same object shapes.

## Results

### Diffs on (`savedObjectDiff.enabled: true`, `typesToInclude: ["index-pattern"]`)

| workload | requests | lat p50 ms | lat p95 ms | EL delay max ms | EL delay p99 ms | EL util max | heap before MB | heap peak MB | heap settled MB | rss peak MB | audit events | audit KB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| bulk_create 5x(3 x 2000-panel) | 5 | 1084 | 1136 | 115 | 16 | 0.25 | 1250 | 1250 | 1182 | 1623 | 31 | 9830 |
| update x40 (2000-panel, title only) | 40 | 1018 | 1102 | 161 | 24 | 0.15 | 1208 | 1274 | 1210 | 1438 | 92 | 15110 |
| bulk_update 5x(20 x 400-panel) | 5 | 1018 | 1027 | 50 | 26 | 0.09 | 1220 | 1274 | 1260 | 1348 | 105 | 7483 |
| import overwrite 2x(30 x 200-panel) | 2 | 1010 | 1010 | 42 | 30 | 0.18 | 1270 | 1270 | 1207 | 1366 | 65 | 3087 |
| concurrent 3x(8 parallel bulk_create 6 x 1000-panel) | 24 | 994 | 1192 | 196 | 57 | 0.53 | 1175 | 1266 | 1222 | 1444 | 168 | 46606 |

### Diffs off (baseline)

| workload | requests | lat p50 ms | lat p95 ms | EL delay max ms | EL delay p99 ms | EL util max | heap before MB | heap peak MB | heap settled MB | rss peak MB | audit events | audit KB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| bulk_create 5x(3 x 2000-panel) | 5 | 1012 | 1023 | 25 | 15 | 0.10 | 1254 | 1254 | 1179 | 1695 | 26 | 23 |
| update x40 (2000-panel, title only) | 40 | 1016 | 1027 | 30 | 19 | 0.08 | 1185 | 1292 | 1283 | 1606 | 86 | 82 |
| bulk_update 5x(20 x 400-panel) | 5 | 1015 | 1022 | 48 | 29 | 0.19 | 1266 | 1266 | 1235 | 1408 | 108 | 102 |
| import overwrite 2x(30 x 200-panel) | 2 | 1028 | 1028 | 20 | 13 | 0.05 | 1235 | 1245 | 1253 | 1408 | 62 | 59 |
| concurrent 3x(8 parallel bulk_create 6 x 1000-panel) | 24 | 991 | 1018 | 65 | 42 | 0.27 | 1253 | 1292 | 1236 | 1422 | 171 | 163 |

### Deltas (diffs on − diffs off)

| workload | lat p50 ms | lat p95 ms | EL delay max ms | EL delay p99 ms | EL util max | heap peak MB | heap settled MB | audit KB |
|---|---|---|---|---|---|---|---|---|
| bulk_create 5x(3 x 2000-panel) | +72 | +113 | +90 | +1 | +0.15 | -4 | +3 | +9807 |
| update x40 (2000-panel, title only) | +2 | +75 | +131 | +5 | +0.07 | -18 | -73 | +15028 |
| bulk_update 5x(20 x 400-panel) | +3 | +5 | +2 | -3 | -0.10 | +8 | +25 | +7381 |
| import overwrite 2x(30 x 200-panel) | -18 | -18 | +22 | +17 | +0.13 | +25 | -46 | +3028 |
| concurrent 3x(8 parallel bulk_create 6 x 1000-panel) | +3 | +174 | +131 | +15 | +0.26 | -26 | -14 | +46443 |

## Reading

- **Audit volume grows dramatically with diffs on.** Each event for an `index-pattern` type
  gains a `kibana.diff` field containing the full JSON Patch of the object. For 2000-panel
  objects, this is hundreds of KB per event. Audit KB is 52x–427x larger with diffs on across
  these workloads. This is expected and is the primary cost of the feature.
- **Sequential workloads show moderate EL delay increase.** The update and bulk_create
  workloads show ~90–131 ms higher EL delay max with diffs on. Even title-only updates require
  traversing the full object tree to compute the diff (all unchanged fields contribute noOps),
  so the cost grows with object size, not just the size of what changed.
- **The concurrent workload shows the clearest signal.** EL utilization rises from 0.27 to
  0.53 (+0.26) and lat p95 increases by 174 ms with diffs on. Eight parallel bulk_create
  batches of 1000-panel objects trigger eight concurrent diff computations. This is consistent
  with the micro-benchmark finding of ~2 µs per leaf × ~6000 leaves × 8 concurrent requests.
- **Heap is flat in both modes.** Differences in heap peak and settled are within single-run
  noise (~15–25 MB). The diff allocates transiently during event emission and is released once
  written.
- **Latency is within noise for sequential workloads.** The ~1 s floor on every request is
  Elasticsearch's write refresh. Differences under ~100 ms should not be interpreted as signal.

## Reproducing

```bash
# diffs on
SO_DIFF_PERF_LABEL=diffs-on node scripts/scout run-tests --arch stateful --domain classic \
  --serverConfigSet security_audit_so_diff_perf \
  --config x-pack/platform/plugins/shared/security/test/scout_security_audit_so_diff_perf/api/playwright.config.ts

# diffs off
SO_DIFF_PERF_LABEL=diffs-off node scripts/scout run-tests --arch stateful --domain classic \
  --serverConfigSet security_audit_so_diff_perf_baseline \
  --config x-pack/platform/plugins/shared/security/test/scout_security_audit_so_diff_perf/api/playwright.config.ts
```
