# Task Manager Resiliency and Efficiency Context

## Scope and Goals

This workstream focused on improving Kibana Task Manager in two areas:

1. **Resiliency after node crashes/restarts**
   - Reconcile tasks previously owned by the same Kibana instance (`taskManagerId`) on startup.
   - Log recovered tasks to aid incident analysis (including OOM/debug scenarios).
   - Ensure reconciliation completes before first polling cycle.

2. **Adaptive efficiency / dynamic capacity**
   - Support dynamic Task Manager capacity (`xpack.task_manager.capacity: auto`).
   - Scale up/down based on runtime health signals.
   - Add anti-flapping safeguards.
   - Replace noisy load-average signal with Node.js process CPU.
   - Use projected-at-full-capacity decisions.
   - Make projection cost-aware (task-cost weighted utilization input).

---

## High-Level Decisions (Chronological)

- Startup reconciliation must run before first polling when ES/SO become available.
- Dynamic capacity is enabled through `xpack.task_manager.capacity: auto`.
- Dynamic capacity upper bound set to 100 by default.
- Add anti-flapping:
  - Scale-down cooldown.
  - Consecutive unhealthy readings before scale-down.
  - Hysteresis for scale-up checks.
- Capacity evaluation should always log to console (no env-var gate).
- Ignore load metric and migrate to process CPU usage.
- Replace fixed scale-up utilization gate with projected full-capacity health checks.
- Factor task cost into projection input (not just raw/inflated utilization).
- Make `capacity` default to `auto` in config schema.

---

## Implemented Features

## 1) Startup Task Reconciliation

Behavior:
- On startup availability, fetch tasks owned by current `taskManagerId` in `running` or `claiming`.
- Requeue them to `idle`, clear ownership/runtime fields, reschedule at `now`.
- Log each recovered task and summary-by-type.
- Reconciliation runs once on startup lifecycle and blocks initial poller start until completion.
- Poller pauses/resumes on ES/SO availability transitions.

Primary files:
- `x-pack/platform/plugins/shared/task_manager/server/lib/task_reconciliation.ts`
- `x-pack/platform/plugins/shared/task_manager/server/lib/task_reconciliation.test.ts`
- `x-pack/platform/plugins/shared/task_manager/server/polling_lifecycle.ts`
- `x-pack/platform/plugins/shared/task_manager/server/polling_lifecycle.test.ts`

---

## 2) Dynamic Capacity Stream

Behavior:
- Dynamic stream combines:
  - ES managed-capacity signal (error-based throughput management).
  - Runtime process health (ELU, heap, process CPU, event-loop delay).
  - Utilization streams for context and projection.
- Scale-down:
  - Trigger only after configured consecutive unhealthy evaluations.
  - Apply step-down and cooldown window.
- Scale-up:
  - Allowed only when projected full-capacity metrics are healthy (with hysteresis).
  - Respect cooldown and upper bound.

Logging:
- Console line emitted every capacity evaluation with:
  - Decision (`up`/`down`/`same`)
  - Old/new capacity
  - Reason
  - Post-claim utilization
  - Metric status details
  - Projected-at-full metrics and scale factor

Primary files:
- `x-pack/platform/plugins/shared/task_manager/server/lib/capacity_configuration_stream.ts`
- `x-pack/platform/plugins/shared/task_manager/server/lib/capacity_configuration_stream.test.ts`
- `x-pack/platform/plugins/shared/task_manager/server/lib/dynamic_capacity_controller.ts` (dynamic capacity debug logging)
- `x-pack/platform/plugins/shared/task_manager/server/polling_lifecycle.ts`
- `x-pack/platform/plugins/shared/task_manager/server/plugin.ts`

---

## 3) Task-Cost-Aware Projection Input

Reason:
- Raw/inflated utilization can misrepresent impact when many tasks are tiny/low-cost.

Implementation:
- Added a dedicated projection utilization stream:
  - `postClaimUtilizationPct$` remains for existing load semantics/logging.
  - `projectionUtilizationPct$` is used to compute projection factor.
- In polling lifecycle:
  - `currentTmObservedUtilization$` captures observed `pool.usedCapacityPercentage` (cost-aware for mget strategy).
  - Existing `currentTmUtilization$` keeps “unclaimed tasks => 100%” inflation behavior.
  - Capacity stream receives both values.

Outcome:
- Projected ELU/CPU/delay are based on cost-aware observed utilization, making projection decisions better aligned with actual workload mix.

---

## 4) Config Schema Changes

Key changes in `x-pack/platform/plugins/shared/task_manager/server/config.ts`:

- `capacity` supports numeric or `'auto'`.
- **Default capacity is now `'auto'`**.
- Added `adjust_capacity_for_elasticsearch_errors`.
- Added/updated dynamic capacity controls:
  - `dynamic_capacity.upper_bound`
  - `dynamic_capacity.scale_interval_ms`
  - `dynamic_capacity.scale_up_step`
  - `dynamic_capacity.scale_down_step`
  - `dynamic_capacity.scale_up_min_post_claim_utilization_pct` (legacy config still present; scale-up now projection-led)
  - `dynamic_capacity.max_event_loop_utilization`
  - `dynamic_capacity.max_heap_used_fraction`
  - `dynamic_capacity.max_process_cpu_utilization`
  - `dynamic_capacity.min_utilization_for_projection`
  - `dynamic_capacity.max_event_loop_delay_ms`
  - `dynamic_capacity.scale_down_cooldown_ms`
  - `dynamic_capacity.scale_down_consecutive_unhealthy_readings`

Related tests:
- `x-pack/platform/plugins/shared/task_manager/server/config.test.ts`

---

## Important Runtime Interpretation Notes

- A log like:
  - `reason=unchanged: unhealthy_process_signals`
  - `cpu=0.890/0.850(unhealthy)`
  means scale-up is blocked because process CPU exceeds configured threshold.
- Scale-up health uses hysteresis, so threshold is effectively stricter during scale-up checks.
- If `max_event_loop_delay_ms` is set to `0`, event loop delay health check is disabled.
- `max_load_average_ratio` is removed from dynamic decision logic in favor of process CPU.

---

## Validation Performed

Repeatedly validated with:
- `node scripts/jest x-pack/platform/plugins/shared/task_manager/server/lib/capacity_configuration_stream.test.ts`
- `node scripts/jest x-pack/platform/plugins/shared/task_manager/server/polling_lifecycle.test.ts`
- `node scripts/jest x-pack/platform/plugins/shared/task_manager/server/config.test.ts -u`
- `node scripts/check_changes.ts`

Status during this workstream:
- Targeted tests passed after iterative fixes.
- `check_changes.ts` passed.
- Lint/Type checks clean on edited files.

---

## Suggested PR Framing

Working title options discussed:
- **Improve Task Manager resiliency and efficiency**
- Task Manager: Startup task reconciliation and cost-aware dynamic capacity

This work can be framed as:
- Resiliency: deterministic recovery of in-flight owned tasks after crash/restart.
- Efficiency: adaptive, safer, and more explainable capacity management.

---

## Potential Follow-Ups

- Evaluate log verbosity for per-task recovery logs in very large recoveries.
- Consider exposing projection/health metrics in structured telemetry (not only console).
- Optionally deprecate or remove now-legacy scale-up threshold setting if no longer used for decisions.
- Ensure local/dev configs no longer reference obsolete load-average dynamic setting.

