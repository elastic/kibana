# Entity Store Performance Test — Cloud Run — 2026-09-03

## Environment

- **Cluster:** Elastic Cloud (`kibana-pr-285828`), single ES node
- **Kibana:** `xpack.task_manager.capacity: 10` (default, not tuned)
- **Engines installed:** 100 (11 base + 89 synthetic `perf.entity.001`…`perf.entity.089`)
- **Synthtrace target:** `logs-perf.entity-default` (matched by default `logs-*` pattern)

---

## T3 — 100 engines, 1 space (`default`), cardinality=2,000

Ramped `entityTypes` from 14 → 39 → 89 while keeping cardinality=2,000 (below the `docsLimit=10,000` threshold — single-page extraction).

| entityTypes fed | Drift p50 | Drift p99 | Load p50 | `RunningAtCapacity` | Overdue | Extract p95 max | Entities |
|---|---|---|---|---|---|---|---|
| 14 | 304 ms | 1,026 ms | 85% | 24% | 1 | 15,656 ms | 28,000 |
| 39 | 476 ms | 1,495 ms | 75% | 22% | 0 | 15,656 ms | 53,683 |
| 89 | 436 ms | 1,277 ms | 80% | 22% | 0 | 15,656 ms | ~178,000 |

**Observations:**
- `RunningAtCapacity` sits persistently at 22% across all data loads — **capacity=10 is already stressed at 100 engines regardless of how many types have data**.
- Extraction p95 is pinned at ~15.6s regardless of `entityTypes` — the bottleneck is per-engine extraction cost, not how many types are active simultaneously.
- Drift stays manageable (p99 ≤ 1.5s) but never fully settles due to the capacity pressure.

---

## T3-C — 100 engines, 1 space, cardinality=15,000

Bumped cardinality to 15,000 to push entities above the `docsLimit=10,000` threshold and trigger multi-page extraction.

### While filling (avg ~4,000 entities/type, below docsLimit)

| Metric | Value |
|---|---|
| Drift p50 / p99 | 152 ms / 512 ms |
| Load p50 | 60% |
| `RunningAtCapacity` | 0% |
| Overdue | 0 |
| Extract p95 (max) | 13,275 ms |
| Entities in latest index | ~360,000 of 1,335,000 target |

**Observation:** While entities were still filling up, load actually *improved* — each engine had fewer entities to page through than at steady-state cardinality=2,000. `RunningAtCapacity` dropped to 0%. The real stress was yet to come.

---

## T4 — 200 engines, 2 spaces (`default` + `caue`), cardinality=15,000

Added `caue` space with 100 engines installed. Each space gets its own independent set of tasks and latest index; both spaces read from the same ES source data.

### Immediately after `caue` space install

| Metric | Value |
|---|---|
| Drift p50 / p99 | 763 ms / 23,217 ms |
| Load p50 | 100% |
| `RunningAtCapacity` | 32% |
| Overdue | 92 |
| Extract p95 (max) | 23,644 ms |
| Entities (default) | 359,936 |
| Entities (caue) | 115,170 (still filling) |

### ~5 minutes later — full saturation

| Metric | Value |
|---|---|
| Drift p50 / p99 | **156,145 ms / 156,146 ms** |
| Load p50 | 100% |
| `RunningAtCapacity` | **100%** |
| `NoTasksClaimed` | **0%** |
| `PoolFilled` | **0%** |
| Overdue | **225** |
| `max_throughput_per_min` | 92 (vs 227 required) |
| Entities (default) | 359,936 |
| Entities (caue) | 354,224 |

**Task manager self-reported (verbatim):**
> Task Manager is unhealthy, the assumedAverageRecurringRequiredThroughputPerMinutePerKibana (227.58) > capacityPerMinutePerKibana (92)

---

## Summary

| Tier | Engines | Spaces | Cardinality | Drift p99 | Overdue | `RunningAtCapacity` | Result |
|---|---|---|---|---|---|---|---|
| T3 (14 types fed) | 100 | 1 | 2,000 | 1,026 ms | 1 | 24% | Stressed but stable |
| T3 (89 types fed) | 100 | 1 | 2,000 | 1,277 ms | 0 | 22% | Stressed but stable |
| T3-C (filling) | 100 | 1 | 15,000 | 512 ms | 0 | 0% | Healthy (pre-threshold) |
| T4 (initial) | 200 | 2 | 15,000 | 23,217 ms | 92 | 32% | Degraded |
| **T4 (settled)** | **200** | **2** | **15,000** | **156,146 ms** | **225** | **100%** | **Saturated** |

---

## Key findings

1. **capacity=10 is insufficient for 100 engines.** `RunningAtCapacity` at 22% is a persistent signal even in the single-space, single-cardinality case. There is no headroom for spikes.

2. **200 engines completely saturate capacity=10.** Required throughput (227 tasks/min) is 2.5× what capacity=10 can deliver (92 tasks/min). Drift reached 156 seconds — engines are 2.5 full extraction cycles behind.

3. **Space multiplication is the fastest way to hit the wall.** Adding a second space doubles the task count with zero code changes. At capacity=10, the second space is enough to cause total saturation.

4. **Cloud ES is faster than local for extraction queries** — p95 ~15s on Cloud vs ~20s locally. Dedicated ES nodes help, but don't change the capacity arithmetic.

5. **`applyMaxLagCutoff` was not observed** during this test — the saturation was stopped before lag exceeded `lookbackPeriod=3h`. Left running, dropped windows would follow.

---

## Recommendation

Set `xpack.task_manager.capacity: 50` on any cluster running >50 entity engines. The default of 10 is designed for general Kibana background tasks, not for entity store scale. At capacity=50, 200 engines were handled cleanly (demonstrated on local machine).
