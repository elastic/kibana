# Nightshift Daily Run Quotas

> Settled decisions as of **2026-08-06**. See the [PR](https://github.com/elastic/kibana/pull/TODO) for context and discussion.

## Overview

Daily run quotas cap how many times each group of AI workflows executes per calendar day (UTC midnight boundary). Once a group exhausts its budget, **automation stops** until the counter resets; runs started by a human always go through.

---

## Settled decisions

### 1. Defaults — all four groups = 20

`DEFAULT_RUN_LIMITS` in `common/run_quotas/types.ts`:

| Budget group | Default limit |
|---|---|
| `ki_extraction` | 20 |
| `memory` | 20 |
| `detection` | 20 |
| `investigation` | 20 |

**Follow-up**: observe customer-0 cluster run rates after first production deployment and adjust defaults if 20 is too low or high for realistic workloads.

### 2. No timezone configurability — UTC only

The daily window is always anchored to UTC midnight. The `timezone` field is retained in `RunQuotaSettings` for backwards compatibility but is always forced to `UTC` on write. The PUT route body no longer accepts a `timezone` parameter.

**Rationale**: avoiding per-deployment timezone drift in a deployment-wide counter; simplifies the reset workflow (always midnight UTC).

### 3. Banner when limit hit

When any budget group has `exhausted: true` from `GET /internal/significant_events/run_quotas`, an `EuiCallOut` (warning) is shown on all non-settings tabs. Test subject: `significantEventsRunQuotaExhaustedBanner`. Shows which engines/groups are exhausted and when counters reset.

### 4. Run count = workflow runs

Quota is enforced by counting workflow executions, not LLM tokens. Tokens-per-run tracking is deferred to a follow-up.

**Rationale**: simple and predictable for operators; token complexity adds little value for v1 defaults.

### 5. Failed runs count toward quota

A run recorded as `admitted` in the ledger before any LLM work counts toward the budget, even if the workflow subsequently fails. A refused run is recorded as `refused` and does NOT count.

**Follow-up**: Stats/Settings page should surface failed-vs-succeeded breakdown separately.

### 6. Quotas enforce automation only — humans are never blocked

The `HUMAN_RUN_ORIGINS` set (`manual`, `sigevents-investigation-ui`, `significant-events-memory-ui`) bypasses the gate. Engine pause also only disables automation workflows; user-callable leaves (KI onboarding UI, memory synthesis, investigation UI button) remain available.

### 7. Memory writes inside investigation do not hit the memory quota

Investigations trigger memory updates as child workflows. The memory quota gate only counts the top-level memory parent workflows (consolidation, gap detection, conversation scraper, synthesis). Child invocations from investigation are unaffected.

### 8. Ledger: dedicated `.significant_events-runs` index

The run ledger lives in `.significant_events-runs`. No existing Nightshift index is suitable:
- `.significant_events-detections/events` are domain data
- `.workflows-executions` is not writable with workflow user credentials

### 9. Per-engine pause

When a gated workflow refuses a run (quota exhausted), it calls `POST /internal/significant_events/maintenance/_pause` with `{ engines: ['<engine>'], reason: 'run_quota' }` to stop further automation for that engine. This is separate from the global pause.

**Automation disabled per engine when paused for `run_quota`:**

| Engine | Workflows disabled |
|---|---|
| `context` | `system-streams-ki-continuous-onboarding`, `system-streams-ki-sync`, legacy continuous KI, memory-consolidation, conversation-scraper, gap-detection |
| `detection` | `system-significant-events-orchestrator`, `system-significant-events-scheduled-detection-*`, `system-significant-events-scheduled-review-*` |
| `investigation` | nothing (the gate refuses automated invocations; no scheduled trigger to disable) |

**Manual runs always remain available** — `ki-onboarding`, `investigation`, and `memory-synthesis` leaves are not disabled.

### 10. System workflows for pause-on-limit and daily reset

Two always-on system workflows (installed globally, never disabled by Pause):

| Workflow id | Trigger | Action |
|---|---|---|
| `system-significant-events-run-quota-enforce` | every 15m (+ manual) | For each exhausted budget group, `POST …/maintenance/_pause` with `{ engines: [<engine>], reason: 'run_quota' }` (backup if an in-gate pause call fails) |
| `system-significant-events-run-quota-reset` | cron `5 0 * * *` UTC (+ manual) | `POST …/maintenance/_resume` with `{ engines: ['context','detection','investigation'], reasons: ['run_quota'] }` — resumes only quota-paused engines; user-paused engines stay paused |

Gated workflows also call `_pause` themselves immediately on refuse (`quota_pause_engine` step).

Tracked in nightshift-program dependency list: [Workflows: Execution Rate Limits and Cost Controls](https://github.com/elastic/nightshift-program/blob/main/workstreams/significant-events/dependencies.md#workflows-execution-rate-limits-and-cost-controls).

### 11. In-workflow gate vs. native rate-limit

v1 uses an in-workflow `kibana.request` + `elasticsearch.request` gate. Follow-ups to migrate to native Workflows rate-limiting (same dependency entry as above):
- Time-windowed execution limits (`max` + `window`): https://github.com/elastic/security-team/issues/18658
- Bypass by trigger type (e.g. `manual`): https://github.com/elastic/security-team/issues/18661

### 12. Refused investigation event marker — deferred

When a triage-triggered investigation is refused by the gate, no marker is written to the significant event document. The event remains in `open` status and will be retried by the next day's detection cycle. An explicit "refused" marker was considered but deferred — the current behavior is safe and avoids extra states in the UI.

### 13. Settings layout — keep as-is

The current per-engine group layout in `RunLimitsSection` (Settings tab) is kept for v1. Timezone is shown as a read-only "UTC" label. Per-engine pause controls are exposed in `MaintenanceSection`.

### 14. "Engines as inference-feature parents" — OUT OF SCOPE / deferred

A proposal to use engine IDs as the inference feature hierarchy was considered for quota/model-selection purposes. This is deferred; the current `aggregate-by`/`plugin-id` per-step attribution model is unchanged.

---

## Architecture summary

```
gated workflow runs
  │
  ├─ quota_count_runs (ES count)
  ├─ quota_evaluate (is automated? used >= limit?)
  ├─ quota_record_run (write ledger entry: admitted | refused)
  ├─ quota_pause_engine (kibana.request if refused → pause engine for run_quota)
  └─ quota_stop_if_exhausted (workflow.output early exit if refused)

enforce (every 15m)
  └─ pause any engine whose groups are exhausted (backup)

daily reset (00:05 UTC)
  └─ resume engines with reason=run_quota → clears engines map entries
```

## Files

| Purpose | Path |
|---|---|
| Common types / defaults | `common/run_quotas/types.ts` |
| Server service | `server/lib/run_quotas/run_quota_service.ts` |
| Budget groups ↔ workflows | `server/lib/run_quotas/budget_groups.ts` |
| Maintenance service (engine pause) | `server/lib/maintenance/maintenance_service.ts` |
| Maintenance SO (modelVersion 2) | `server/lib/maintenance/saved_object.ts` |
| Per-engine automation targets | `server/lib/maintenance/managed_workflow_targets.ts` |
| Maintenance routes | `server/routes/internal/maintenance/route.ts` |
| Run quotas route | `server/routes/internal/run_quotas/route.ts` |
| Enforce workflow | `…/kbn-workflows/…/significant_events/run_quota_enforce.yaml` |
| Reset workflow | `…/kbn-workflows/…/significant_events/run_quota_reset.yaml` |
| UI run-limits hook | `significant_events_app/.../hooks/use_significant_events_run_quotas.ts` |
| UI maintenance / per-engine pause | `significant_events_app/.../components/settings/maintenance_section.tsx` |
| Exhausted banner | `significant_events_app/.../pages/significant_events/page.tsx` |
