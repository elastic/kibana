# Nightshift Daily Run Quotas (soft limits)

> Settled decisions as of **2026-08-06**. Soft enforcement without per-workflow YAML gates is **intentional and good enough for now**.

## Soft vs hard limits (read this first)

| | **v1 — soft quotas (this branch)** | **Later — harder Workflows execution limits** |
|---|---|---|
| When enforced | After usage is observed; engines paused by a scheduled system workflow (every 5m) | At workflow start, by the Workflows engine |
| Overshoot | Expected: in-flight / concurrent runs can finish past the cap | Should not admit automated runs past the cap |
| Product YAML | Unchanged — Nightshift workflows are byte-identical to `main` | Likely a `settings` rate-limit / window on the definition |
| Dependency | None (Nightshift-owned) | [security-team#18658](https://github.com/elastic/security-team/issues/18658) (time-windowed execution limits), [security-team#18661](https://github.com/elastic/security-team/issues/18661) (bypass by trigger type) — see nightshift-program `dependencies.md` |

**These soft quotas are good enough for customer-0 / early use.** They stop automation from running unbounded once a daily budget is clearly exceeded, without coupling every product workflow to a gate. When native Workflows execution rate-limits ship, migrate to that for true hard limits; keep this pause/resume layer as a backstop if useful.

## Overview

Daily run quotas cap how many times each group of AI workflows executes per calendar day (UTC midnight). Once a group is over its limit, **that engine's automation is paused**; once it is back within limit, the automation is resumed. Limits are **soft**: in-flight and concurrent runs may finish and briefly overshoot until the next enforcement pass.

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

Counted workflows are **not** patched with a quota preamble. Usage is read server-side from `.workflows-executions`. Enforcement is a single control loop:

`system-significant-events-run-quota-enforce` (every **5m**) → `POST /internal/significant_events/run_quotas/_enforce`

That one endpoint reconciles in both directions, so the loop converges from any starting state:

- engines with a group over its limit are paused with `reason: 'run_quota'`
- engines whose groups are all within limit are resumed, but **only** if this same mechanism paused them

A separate daily reset workflow is deliberately **not** needed: the day rolling over is just another case of "back within limit". The same property means raising a limit un-pauses an engine within minutes instead of at the next midnight.

Harder, admit-time limits belong to the Workflows platform (see table above). Do not re-introduce per-workflow YAML gates as a long-term design unless platform rate-limits stall.

### 3. What is counted

Workflow executions for the IDs in `COUNTED_WORKFLOW_BUDGET_GROUPS` since UTC midnight (`startedAt`, `isTestRun: false`). Failed and in-flight runs count — a run that fails still spent the inference calls.

If `.workflows-executions` cannot be read, usage reads as zero. Enforcement **skips the pass entirely** rather than mistaking that for an idle day and resuming everything.

### 4. Automation pause vs humans

Engine pause disables **automation** workflows only, and resume re-enables exactly the targets that pause recorded — never a workflow the user had already turned off themselves. Manual leaves stay available.

**Investigation** has no automation of its own to disable: investigations are fanned out by discovery, so pausing `detection` is what stops them, and disabling the investigation workflow would break the manual "investigate" button. An exhausted investigation budget therefore overshoots until the detection side stops feeding it ([#18658](https://github.com/elastic/security-team/issues/18658), [#18661](https://github.com/elastic/security-team/issues/18661)).

### 5. Banner / Settings / UTC

Unchanged: exhaustion banner, Settings run-limits UI, UTC-only window, per-engine pause controls.

### 6. Ledger `.significant_events-runs`

Never shipped. Usage comes from `.workflows-executions`; there is no Nightshift-owned run ledger and no template to install.

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
GET /internal/significant_events/run_quotas   ──►  Settings UI + exhaustion banner
        │
        ▼
run_quota_enforce (every 5m)
        └─ POST /run_quotas/_enforce
             ├─ over limit    → maintenance._pause  { engines, reason: run_quota }
             └─ within limit  → maintenance._resume { engines, reasons: [run_quota] }
```

## Files

| Purpose | Path |
|---|---|
| Defaults / types | `common/run_quotas/types.ts` |
| Counted workflow → group map | `server/lib/run_quotas/budget_groups.ts` |
| Usage + settings service | `server/lib/run_quotas/run_quota_service.ts` |
| Pause/resume reconciler | `server/lib/run_quotas/enforce.ts` |
| Enforce workflow | `…/kbn-workflows/managed/definitions/significant_events/run_quota_enforce.yaml` |
| Per-engine pause | `server/lib/maintenance/*` |
| UI | `significant_events_app/.../run_limits_section.tsx`, `maintenance_section.tsx`, `page.tsx` |

## Known gaps

- Overshoot is bounded only by the 5-minute enforcement interval and by how many runs a group can start in that window.
- Investigation is not directly pausable (see decision 4).
- The Settings page shows `used / max` per group but not failed-vs-succeeded; that split is planned for the Stats page.

---

## Approaches considered and not taken

Kept so the same ideas are not re-proposed without knowing why they were dropped. Most were actually built first and then removed — the branch history has the code if any of them needs revisiting.

### 1. In-workflow admit-time gate (built, then removed)

Each counted workflow got a preamble that resolved its origin, counted the day's runs, and stopped itself when over budget. This was the only design that gave **hard** limits without platform support.

Dropped because it coupled six product workflows to the quota feature: every limit change needed a managed-workflow reinstall, every quota tweak forced a version bump on unrelated YAML, and the gate steps had to be kept in sync by hand across workflows that are otherwise independent. Revisit only if native Workflows rate-limits stall — and prefer extending the platform instead.

### 2. Dedicated run ledger `.significant_events-runs` (built, then removed)

An append-only data stream, one document per run, written by the gate and labelled `admitted` / `refused`. It existed because a workflow's own Elasticsearch steps run with the caller's credentials and cannot read `.workflows-executions`, and because a workflow counting its own executions would count the run it is deciding about.

Both problems disappear once counting moves server-side, so the ledger became a second source of truth to maintain, migrate and retain for nothing. Its one real advantage — being able to distinguish refused runs, and to count non-workflow run paths — is not needed while nothing is refused.

### 3. Human-run origin allow-list (built, then removed)

`HUMAN_RUN_ORIGINS` plus a `runOrigin` input threaded from each parent workflow into its children, so a human-initiated chain was not gated as automation.

Unnecessary under soft limits: pause targets only automation workflows, so manual entry points keep working without anyone having to declare themselves human. The forwarding also meant touching product YAML purely for quota bookkeeping.

### 4. Separate daily reset workflow (built, then removed)

`run_quota_reset` on cron `5 0 * * *` UTC, resuming every `run_quota`-paused engine.

Made redundant by giving enforcement a resume path: a day rollover is just one way of getting back within limit. Folding it in also fixed the case the cron could not handle — raising a limit mid-day left the engine paused until the next midnight.

### 5. Completion-triggered counting

A workflow that fires when another workflow finishes, incrementing the counter and pausing on the way past the limit. Rejected because the Workflows engine has no completion trigger; there is nothing to subscribe to.

### 6. Pause/resume decisions inside the enforce YAML

The first enforce workflow iterated budget groups and issued one pause call per exhausted group. Moved into `enforce.ts` because the decision needs the group→engine mapping and the record of what each pause disabled, an engine spans several groups (`context` covers `ki_extraction` and `memory`), and YAML expressions are hard to unit-test. The workflow is now a timer that calls one endpoint.

### 7. Reinstalling managed workflows when limits change

Follows from the gate design: baked-in limits are only re-read on install. A settings write triggering a fleet-wide workflow reinstall is far too heavy for changing a number, and it made the quota service depend on the installer.

### 8. Token-based quotas instead of run counts

Closer to the actual cost, but there is no per-run token accounting to read yet, and a run count is what an admin can reason about. Revisit alongside the Stats page.

### 9. Disabling the investigation workflow when investigation is exhausted

Would give investigation a real pause target, at the cost of breaking the manual "investigate" button — the same workflow serves both. Accepting overshoot is the better trade until the platform can rate-limit by trigger type ([#18661](https://github.com/elastic/security-team/issues/18661)).
