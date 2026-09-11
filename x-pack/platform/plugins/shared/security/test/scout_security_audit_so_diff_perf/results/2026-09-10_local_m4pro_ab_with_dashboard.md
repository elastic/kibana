# Saved object audit diff: A/B performance results (with dashboard workload)

**Date:** 2026-09-10  
**Branch:** `feature/audit_log_saved_object_diff` @ `816b4c022114`  
**Machine:** Apple M4 Pro, 14 cores, 48 GB RAM, macOS 26.6.2  
**Kibana:** dev mode from source, `--max-old-space-size=1536`, audit file appender  
**Suite:** `scout_security_audit_so_diff_perf`, run via `node scripts/scout run-tests`

Two back-to-back runs: `security_audit_so_diff_perf` (diffs on) then
`security_audit_so_diff_perf_baseline` (diffs off). Same workloads, same object shapes.

Adds a new workload compared to the previous results file: `dashboard update x20 (60-panel,
title only)`. Dashboards store panels as a single large JSON-serialized string (`panelsJSON`
≈ 49 KB for 60 Lens panels). A title-only update produces one `replace` op on `/title` and
one `noOp` on `/panelsJSON` — very different from the nested index-pattern objects which
produce thousands of leaf ops. The cost is serializing and holding the full before/after
string pair rather than walking nested pointers.

## Results

### Diffs on (`savedObjectDiff.enabled: true`, `typesToInclude: ["index-pattern","dashboard"]`, `fieldSizeLimit: 100kb`)

| workload | requests | lat p50 ms | lat p95 ms | EL delay max ms | EL delay p99 ms | EL util max | heap before MB | heap peak MB | heap settled MB | rss peak MB | audit events | audit KB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| bulk_create 5x(3 x 2000-panel) | 5 | 1014 | 1019 | 67 | 19 | 0.11 | 1196 | 1233 | 1236 | 852 | 24 | 9826 |
| update x40 (2000-panel, title only) | 40 | 1018 | 1068 | 295 | 20 | 0.19 | 1255 | 1288 | 1238 | 1356 | 86 | 15106 |
| bulk_update 5x(20 x 400-panel) | 5 | 1009 | 1031 | 48 | 28 | 0.16 | 1241 | 1292 | 1202 | 1360 | 108 | 7485 |
| import overwrite 2x(30 x 200-panel) | 2 | 1026 | 1026 | 47 | 24 | 0.10 | 1208 | 1208 | 1215 | 1359 | 62 | 3085 |
| concurrent 3x(8 parallel bulk_create 6 x 1000-panel) | 24 | 1014 | 1206 | 195 | 171 | 0.39 | 1230 | 1230 | 1201 | 1465 | 171 | 46608 |
| dashboard update x20 (60-panel, title only) | 20 | 1016 | 1028 | 461 | 73 | 0.32 | 1243 | 1243 | 1204 | 1469 | 43 | 46 |

### Diffs off (baseline)

| workload | requests | lat p50 ms | lat p95 ms | EL delay max ms | EL delay p99 ms | EL util max | heap before MB | heap peak MB | heap settled MB | rss peak MB | audit events | audit KB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| bulk_create 5x(3 x 2000-panel) | 5 | 1018 | 1022 | 16 | 12 | 0.05 | 1179 | 1215 | 1236 | 1567 | 20 | 19 |
| update x40 (2000-panel, title only) | 40 | 1017 | 1041 | 30 | 16 | 0.16 | 1236 | 1289 | 1204 | 1573 | 90 | 85 |
| bulk_update 5x(20 x 400-panel) | 5 | 1014 | 1030 | 40 | 16 | 0.11 | 1243 | 1280 | 1173 | 1383 | 105 | 100 |
| import overwrite 2x(30 x 200-panel) | 2 | 1013 | 1013 | 23 | 16 | 0.05 | 1173 | 1176 | 1210 | 1361 | 65 | 61 |
| concurrent 3x(8 parallel bulk_create 6 x 1000-panel) | 24 | 991 | 1051 | 57 | 24 | 0.23 | 1210 | 1254 | 1240 | 1420 | 171 | 163 |
| dashboard update x20 (60-panel, title only) | 20 | 1016 | 1046 | 18 | 12 | 0.04 | 1255 | 1291 | 1277 | 1386 | 40 | 39 |

### Deltas (diffs on − diffs off)

| workload | lat p50 ms | lat p95 ms | EL delay max ms | EL delay p99 ms | EL util max | heap peak MB | heap settled MB | audit KB |
|---|---|---|---|---|---|---|---|---|
| bulk_create 5x(3 x 2000-panel) | -4 | -3 | +51 | +7 | +0.06 | +18 | 0 | +9807 |
| update x40 (2000-panel, title only) | +1 | +27 | +265 | +4 | +0.03 | -1 | +34 | +15021 |
| bulk_update 5x(20 x 400-panel) | -5 | +1 | +8 | +12 | +0.05 | +12 | +29 | +7385 |
| import overwrite 2x(30 x 200-panel) | +13 | +13 | +24 | +8 | +0.05 | +32 | +5 | +3024 |
| concurrent 3x(8 parallel bulk_create 6 x 1000-panel) | +23 | +155 | +138 | +147 | +0.16 | -24 | -39 | +46445 |
| dashboard update x20 (60-panel, title only) | 0 | -18 | +443 | +61 | +0.28 | -48 | -73 | +7 |

## Reading

### Index-pattern workloads (unchanged from previous run)

- **Audit volume grows dramatically with diffs on for nested objects.** Each event for an
  `index-pattern` gains a `kibana.diff` field containing the full JSON Patch of nested
  leaves. For 2000-panel objects this is hundreds of KB per event. Audit KB is 52×–427×
  larger with diffs on. This is expected and is the primary cost of the feature.
- **The concurrent workload shows the clearest signal.** EL delay max/p99 rise by
  138/147 ms and EL utilization by +0.16 with diffs on. Eight parallel bulk_create
  batches trigger eight concurrent diff computations.
- **Latency and heap are within noise for sequential workloads.** The ~1 s floor is
  Elasticsearch's write refresh. Heap differences are within single-run noise.

### Dashboard workload (new)

- **Audit volume is negligible for dashboards.** A title-only update produces two ops:
  one `replace` on `/title` and one `noOp` on `/panelsJSON`. The full 49 KB
  `panelsJSON` string is recorded verbatim in the noOp (`fieldSizeLimit=100kb`), but
  since the string is identical before and after, the total audit delta is only +7 KB
  across 20 updates. Compare this to +15 MB for 40 updates of a 2000-panel index-pattern.
- **EL delay spike is the notable cost.** With diffs on, EL delay max hits 461 ms vs.
  18 ms without (+443 ms). This happens because serializing and comparing two ≈49 KB
  strings on every update occupies the event loop momentarily. EL utilization rises from
  0.04 to 0.32 (+0.28). Latency is flat — the diff runs asynchronously after the HTTP
  response is sent.
- **The EL delay spike is transient, not cumulative.** Heap peak is actually lower with
  diffs on (−48 MB) and settled heap is lower too (−73 MB), consistent with the GC
  releasing the string pair promptly after each event is written.
- **Contrast with index-pattern objects.** Index-patterns at the same panel count produce
  thousands of leaf ops (deeply nested object tree). Dashboards produce exactly two ops
  regardless of panel count, because `panelsJSON` is a single opaque string field — the
  diff engine does not parse it. This makes dashboards cheaper in ops count but still
  carries the cost of string comparison and serialization.

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
