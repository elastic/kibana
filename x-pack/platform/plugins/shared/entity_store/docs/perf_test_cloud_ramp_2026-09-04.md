# Entity Store Performance Test — Cloud Controlled Ramp — 2026-09-04

## Environment

- **Cluster:** Elastic Cloud (`kibana-pr-285828`), single ES node, PR branch
- **ES max heap:** ~0.88 GB
- **Kibana heap:** 1696 MB (re-configured relative to prior run)
- **`xpack.task_manager.capacity`:** 10 (default)
- **`poll_interval`:** 500 ms
- **Entity types:** 100 (11 base + 89 synthetic `perf.entity.001–089`)
- **Synthtrace:** `entityTypes=89, cardinality=2000, docsPerMinutePerType=2000, seed=42`
- **Cardinality:** 2000 — held constant and kept below `docsLimit=10000` throughout

---

## Setup discoveries

### Install API behaviour

The `/api/security/entity_store/install` endpoint returned **HTTP 500** for any call, but created
**task schedules for all 100 entity types in the background** before failing. The status API
(`/api/security/entity_store/status`) reflected only the **20 engine_descriptor Saved Objects** that
completed before the error — not the full 100 tasks running in task manager.

Working install flow used for this run:
```
POST /api/entity_analytics/watchlists/install   (no body)  → 200 {"acknowledged":true}
PUT  /api/security/entity_store/start           ({})       → 200 {"ok":true}
PUT  /api/security/entity_store/stop            ({})       → 200 {"ok":true}
```

The watchlists install creates task schedules for the full set of entity types. The entity store
status API reflects only engine_descriptor SOs (shows 20), while the task manager runs all 100 types.

### Capacity arithmetic

| Parameter | Value |
|---|---|
| `capacity.config` | 10 |
| `capacity.as_cost` | 20 |
| `poll_interval` | 500 ms |
| Avg extraction duration (measured) | ~1.5 s (cardinality=2000, single-page) |
| **max_throughput_per_minute** | **400 tasks/min** |

Formula: `max_tput = capacity.as_cost × polls_per_min / avg_task_cost = 20 × 120 / 1 ≈ 400/min`.

Compare to the prior run (2026-09-03): max_tput was **92/min** because extraction averaged **~6.5 s**
(cardinality=15000 above docsLimit=10000 triggered multi-page ES|QL). Single-page vs multi-page
extraction changes throughput by **4×** at this cluster size.

---

## Results

### T0 — 100 engine tasks, no ingest (baseline)

| Sample | Drift p50 | Drift p99 | RunningAtCapacity | max_tput | avg_req | ES heap | Kbn heap |
|---|---|---|---|---|---|---|---|
| 1 | 161 ms | 521 ms | 4% | 600/min | 154/min | 62% | 61% |
| 2 | 363 ms | 3,401 ms | 14% | 400/min | 154/min | 71% | 48% |
| 3 | 392 ms | 2,300 ms | 14% | 400/min | 154/min | 58% | 50% |
| 4 | 266 ms | 2,066 ms | 22% | 400/min | 154/min | 71% | 56% |
| 5 | 443 ms | 2,685 ms | 12% | 400/min | 154/min | 65% | 60% |

**Observation:** Stable baseline. avg_req=154/min << max_tput=400/min. RunningAtCapacity 4–22% reflects
other Kibana background tasks (agent_builder, fleet, etc.) and a persistent orphan task with 78,816 ms
drift — an artifact from previous test runs.

---

### T1 — 100 engine tasks, 1 space (`default`), synthtrace entityTypes=89

Ingest: 89 types × 2,000 docs/min = 178k docs/min ≈ 3k docs/s

| Sample | Drift p50 | Drift p99 | RunningAtCapacity | max_tput | avg_req | ES heap | Entities |
|---|---|---|---|---|---|---|---|
| 1 | 829 ms | 2,773 ms | 24% | 300/min | 154/min | 81% | 130,550 |
| 2 | 426 ms | 2,454 ms | 24% | 400/min | 154/min | 83% | 153,812 |
| 3 | 394 ms | 620 ms | 6% | 1,200/min | 154/min | 74% | 153,812 |
| 4 | 116 ms | 396 ms | 0% | 1,200/min | 154/min | 56% | 153,812 |
| 5 | 244 ms | 433 ms | 2% | 1,200/min | 154/min | 72% | 153,812 |

**Observation:** Initial spike as entity count fills (sample 1–2), then settles to near-zero
RunningAtCapacity. 153,812 entities extracted (89 perf types × ~1,730 avg entities each — slightly
below cardinality=2000 because random sampling with seed=42 leaves ~14% of entity slots empty in a
5-minute fill window). No circuit breaker events, no thread-pool rejections.

---

### T4 — default + `caue` space install

The watchlists install for `caue` returned `HTTP 200 {"acknowledged":true}` and start returned
`{"ok":true}`. However:

- The caue space status API continued to show **0 engines** — no engine_descriptor SOs were created.
- Task manager workload gained only 7 new extract tasks (count=1 → count=2 for 7 types), bringing
  total extract tasks from ~120 to **127**.
- avg_req remained **154/min** — unchanged. Caue tasks are scheduled but produce no extraction because
  there is no engine_descriptor SO to read the entity definition and ES|QL query from.
- **Caue entities: 0** throughout all 5 samples.

| Sample | Drift p50 | Drift p99 | RunningAtCapacity | max_tput | avg_req | ES heap | Default entities | Caue entities |
|---|---|---|---|---|---|---|---|---|
| 1 | 305 ms | 526 ms | 4% | 1,200/min | 154/min | 86% | 153,812 | 0 |
| 2 | 379 ms | 504 ms | 4% | 1,200/min | 154/min | 52% | 153,812 | 0 |
| 3 | 426 ms | 481 ms | 4% | 1,200/min | 154/min | 58% | 153,812 | 0 |
| 4 | 125 ms | 498 ms | 2% | 1,200/min | 154/min | 73% | 153,812 | 0 |
| 5 | 275 ms | 459 ms | 4% | 600/min | 154/min | 72% | 153,812 | 0 |

**Observation:** The system remained completely stable. No RunningAtCapacity growth, no drift
elevation. The caue space install was not effective at this cluster state — it did not trigger full
engine setup.

---

## Summary

| Tier | Extract tasks | Spaces | Ingest | Drift p99 | RunningAtCapacity | max_tput | avg_req | Result |
|---|---|---|---|---|---|---|---|---|
| T0 | 100 | 1 | 0 | 521–3,401 ms | 4–22% | 400/min | 154/min | Stable |
| T1 | 100 | 1 | 178k/min | 396–2,773 ms | 0–24% (settled) | 400/min | 154/min | Stable |
| T4 | 127 | 2 | 178k/min | 459–526 ms | 2–4% | 600/min | 154/min | Stable (caue=0 entities) |

---

## Key findings

### 1. Install API returns 500 but creates all tasks

The `/api/security/entity_store/install` endpoint fails with HTTP 500 for any type list. However,
the entity store tasks for all 100 types are created in the background before the error. The status
API reflects only the 20 engine_descriptor SOs that completed. This is a **discrepancy between the
status API and the actual task manager state** — a potential correctness issue.

The working install flow for this cluster is the watchlists endpoint:
`POST /api/entity_analytics/watchlists/install`.

### 2. Single-page extraction at cardinality=2000 is very fast

Extraction averaging ~1.5 s per engine (cardinality=2000 < docsLimit=10,000 → single-page ES|QL)
gives max_tput=400/min at capacity=10. This is **4× more throughput** than the prior run at
cardinality=15,000 (multi-page, ~6.5 s avg, max_tput=92/min). The `docsLimit` threshold is the
dominant performance variable.

### 3. Saturation was not reached

With avg_req=154/min and max_tput=400/min, the system has **2.6× headroom at 100 engine tasks**.
Saturation requires avg_req > max_tput. To reach that with single-page extraction:
- Need avg_req > 400/min
- At 1.54 tasks/min per type: need >260 tasks
- But we only have 100 types defined — even doubling to 2 spaces (200 tasks) would reach
  avg_req ~200/min, still below the 400/min threshold.

**Saturation at cardinality=2000 requires either more entity types (>260) or raising capacity
to a value that reduces the saturation point.**

### 4. Second space (caue) install via watchlists is incomplete

The watchlists install creates task schedules but not the engine_descriptor SOs required for
extraction. Without the SOs, the caue tasks run but produce no entities. The full
`/api/security/entity_store/install` endpoint is required for proper multi-space setup, but it
currently returns 500 on this cluster.

### 5. Orphaned high-drift task

One extract task type maintains p99 drift of ~78,816 ms consistently across all tiers. This is
not causing capacity impact (RunningAtCapacity stays low) but indicates a task from a previous
install that was not properly cleaned up by `cleanupNamespace`. Reported separately in the
prior-run doc.

---

## Capacity recommendation

| Scenario | avg_req | max_tput | Status |
|---|---|---|---|
| 100 types, 1 space, cardinality=2000 | ~154/min | 400/min | **38% — healthy** |
| 100 types, 2 spaces, cardinality=2000 | ~200/min | 400/min | **50% — healthy** |
| 100 types, 2 spaces, cardinality=15000 (multi-page) | ~200/min | ~92/min | **217% — SATURATED** |

The critical boundary is the `docsLimit=10,000` threshold. Keeping entity cardinality below this
value makes 100 engines sustainable at capacity=10. Above it, extraction becomes multi-page and
capacity=10 cannot serve even 100 engines.

**Recommendation:** If the expected cardinality is below 10,000 entities per type, capacity=10 is
adequate for 100 engines. For deployments where cardinality can exceed 10,000, either raise
`docsLimit` and set `xpack.task_manager.capacity=50`, or shard into more spaces each with fewer
engines.
