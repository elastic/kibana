# Nightshift Daily Run Quotas (soft limits)

> Settled decisions as of **2026-08-06**. Soft enforcement without per-workflow YAML gates is **intentional and good enough for now**.

## Soft vs hard limits (read this first)

| | **v1 — soft quotas (this branch)** | **Later — harder Workflows execution limits** |
|---|---|---|
| When enforced | After usage is observed; engines paused by a scheduled system workflow (every 5m) | At workflow start, by the Workflows engine |
| Overshoot | Expected: in-flight / concurrent runs can finish past the cap | Should not admit automated runs past the cap |
| Product YAML | Unchanged — no gate preamble in Nightshift workflows | Likely a `settings` rate-limit / window on the definition |
| Dependency | None (Nightshift-owned) | [security-team#18658](https://github.com/elastic/security-team/issues/18658) (time-windowed execution limits), [security-team#18661](https://github.com/elastic/security-team/issues/18661) (bypass by trigger type) — see nightshift-program `dependencies.md` |

**These soft quotas are good enough for customer-0 / early use.** They stop automation from running unbounded once a daily budget is clearly exceeded, without coupling every product workflow to a gate. When native Workflows execution rate-limits ship, migrate to that for true hard limits; keep this pause/reset layer as a backstop if useful.

## Overview

Daily run quotas cap how many times each group of AI workflows executes per calendar day (UTC midnight). Once a group is exhausted, a **system workflow pauses that engine’s automation**. Limits are **soft**: in-flight and concurrent runs may finish and briefly overshoot until the next enforce tick.

Original Nightshift product workflows are **not** modified for quotas.

---

## Settled decisions

### 1. Defaults — all four groups = 20

| Budget group | Default limit |
|---|---|
| `ki_extraction` | 20 |
| `memory` | 20 |
| `detection` | 20 |
| `investigation` | 20 |

**Follow-up**: observe customer-0 how fast limits are hit.

### 2. Soft limits — no in-workflow gate (good enough for now)

Counted workflows are **not** patched with a quota preamble. Usage is read server-side from `.workflows-executions`. Enforcement is:

1. `system-significant-events-run-quota-enforce` (every **5m**) — `GET /run_quotas` → pause exhausted engines with `reason: 'run_quota'`
2. `system-significant-events-run-quota-reset` (cron `5 0 * * *` UTC) — resume engines paused for `run_quota`

Harder, admit-time limits belong to the Workflows platform (see table above). Do not re-introduce per-workflow YAML gates as a long-term design unless platform rate-limits stall.

### 3. What is counted

Workflow executions for the IDs in `COUNTED_WORKFLOW_BUDGET_GROUPS` since UTC midnight (`startedAt`, `isTestRun: false`). Failed and in-flight runs count. Refused/gated runs no longer exist as a separate ledger concept.

### 4. Automation pause vs humans

Engine pause disables **automation** workflows only (same targets as before). Manual leaves stay available. **Investigation** has no separate automation disable list — soft overshoot of investigation continues until native Workflows rate-limits land ([#18658](https://github.com/elastic/security-team/issues/18658), [#18661](https://github.com/elastic/security-team/issues/18661)).

### 5. Banner / Settings / UTC

Unchanged: exhaustion banner, Settings run-limits UI, UTC-only window, per-engine pause controls.

### 6. Ledger `.significant_events-runs`

No longer written or required. Usage comes from `.workflows-executions`. The old ledger template is not installed.

### 7. Other product decisions (unchanged)

- Failed runs count toward the soft quota  
- Memory inside investigation does not use a separate admit-time gate (investigation executions still count toward investigation)  
- Settings layout kept; iterate later  
- Token-per-run not required for v1  
- “Engines as inference-feature parents” out of scope  

---

## Architecture

```
counted workflows run unchanged
        │
        ▼
.workflows-executions  (platform index)
        │
        ▼
GET /internal/significant_events/run_quotas
        │
        ├─ Settings UI + exhaustion banner
        │
        ▼
run_quota_enforce (every 5m)
        └─ POST maintenance/_pause { engines, reason: run_quota }

run_quota_reset (00:05 UTC)
        └─ POST maintenance/_resume { engines, reasons: [run_quota] }
```

## Files

| Purpose | Path |
|---|---|
| Defaults / types | `common/run_quotas/types.ts` |
| Counted workflow → group map | `server/lib/run_quotas/budget_groups.ts` |
| Usage + settings service | `server/lib/run_quotas/run_quota_service.ts` |
| Enforce workflow | `…/run_quota_enforce.yaml` |
| Reset workflow | `…/run_quota_reset.yaml` |
| Per-engine pause | `server/lib/maintenance/*` |
| UI | `significant_events_app/.../run_limits_section.tsx`, `maintenance_section.tsx`, `page.tsx` |
