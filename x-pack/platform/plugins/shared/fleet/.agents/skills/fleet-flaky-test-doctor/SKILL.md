---
name: fleet-flaky-test-doctor
description: >
  Fleet-specific. Analyzes failing, flaky, or skipped Fleet tests to determine
  root cause and recommend the right action. Three modes: (1) triage a single
  GitHub issue, (2) audit the full Team:Fleet failed-test backlog, (3) fix a
  cluster of related issues together. Use when: (1) a user shares a failing or
  skipped Fleet test, (2) asked to triage or fix a flaky test, (3) asked to
  audit or clear the Fleet failed-test backlog, (4) asked to find the shared
  cause across a group of related test failures.
---

# Fleet Flaky Test Doctor

## Overview

Analyze failing or skipped Fleet tests to determine root cause and recommend:
**fix the test**, **fix the app**, **delete the test**, **close the issue as stale**, or **re-run to classify**.

Human-gated: never close issues, never push commits, never merge PRs autonomously. Produce a verdict + evidence; a human acts.

**Fleet test domains (non-exhaustive):** Agents, Agent Policies, Package Policies, EPM (Elastic Package Manager), Policy Secrets, Knowledge Base, Fleet Tasks, Settings, Space Awareness, Outputs, Enrollment — and any other area owned by the Fleet team. When a test path or issue title refers to a Fleet-owned plugin or config, treat it in scope even if the domain isn't listed here.

---

## Pick your mode

| Mode | When to use | Input | Output |
|---|---|---|---|
| **Mode 1 — Single-issue triage** | Steady state: one failing test to investigate | Issue URL or test file path | Long structured report with verdict, evidence, fix proposal |
| **Mode 2 — Backlog audit** | Burn-down: audit many issues at once | `Team:Fleet` + `failed-test` label filter | Compact tracking table (one row per issue) + cluster summary |
| **Mode 3 — Cluster fix** | After Mode 2: fix a cluster of related issues | Cluster name or list of issue numbers | One root-cause analysis + one diff + sibling issue list + verification matrix |

**Relationship — fan-out, not chain:**
```
Mode 2 (one run, ~30 min)
  ├─ close-stale rows    → batch close comments          (no further mode needed)
  ├─ flaky-rerun rows    → re-run by test type (see §Flaky Runner Support)
  ├─ fix-cluster rows    → Mode 3 per cluster
  ├─ escalate/cross-team → human assignment / label change
  └─ residual singletons → Mode 1 (a handful only)
```

---

## Required sub-skills

- **ON FTR API INTEGRATION TESTS:** [fleet-ftr-testing](../../../../../../../.agents/skills/fleet-ftr-testing/SKILL.md) — which `config.*.ts` to use, Docker setup, `FLEET_PACKAGE_REGISTRY_PORT`, `--grep`. Delegate to it; do not duplicate.
- **ON LOCAL KIBANA SETUP:** [kibana-local-dev](../../../../../../../.agents/skills/kibana-local-dev/SKILL.md) — `yarn es snapshot`, `yarn start`, SSL flags, port conflicts.

---

## Prerequisites

Before running any mode, verify these are in place:

| Requirement | Why | How to check |
|---|---|---|
| `gh` CLI installed and authenticated | Required by `check_fleet_test_status.sh` and `audit_fleet_failed_tests.sh` for sibling issue lookup, merged PR references, and the Mode 2 tracking table. Without it, these blocks silently produce no output or fail. | `gh auth status` |
| `git` available in PATH | Required for staleness signal, skip/unskip history, last commit date | `git --version` |
| Running from the kibana repo root | Scripts use relative paths to test files and FTR configs | `ls package.json` |
| Docker running (FTR API tests only) | Package Registry runs in a container; `before all` failures if missing | `docker info` |

If `gh` is not authenticated, `check_fleet_test_status.sh` will still run but the **Sibling Open Issues** and **Recent Merged PRs** blocks will be empty — cluster detection and stale-fix signals will be missing. Authenticate first with `gh auth login`.

---

## Step 0a — Test type classification (run first, before everything else)

Identify the test type from the file path. Each type has different reproduction commands, environment signals, and fix conventions. Getting this wrong means applying the wrong advice.

| Test type | Path signature | Backlog clusters | Reproduction | Fix conventions ref |
|---|---|---|---|---|
| **FTR API integration** | `x-pack/platform/test/fleet_api_integration/apis/**` or `x-pack/solutions/security/test/fleet_api_integration/**` | F, G, J, K, L, N | Delegate to `fleet-ftr-testing`. Requires Docker. | `references/conventions-and-deletion.md` §FTR |
| **Jest server integration** | `x-pack/platform/plugins/shared/fleet/server/integration_tests/**/*.test.ts` | A, B | `node scripts/jest_integration --testPathPattern=<path>` | `references/conventions-and-deletion.md` §Jest integration |
| **Jest unit** | `x-pack/platform/plugins/shared/fleet/{public,common,server}/**/*.test.{ts,tsx}` (excl. `integration_tests/`) | C, D, E | `yarn jest <path>` | `references/conventions-and-deletion.md` §Jest unit |
| **Scout Playwright** | `x-pack/platform/plugins/shared/fleet/test/scout/**` or cross-plugin Scout paths | H, I | Scout runner (see §Flaky Runner Support) | `references/conventions-and-deletion.md` §Scout |
| **Cross-team** | Another team's path, labelled `Team:Fleet` | O | N/A | Route to handoff — not investigation |

Once type is known, Steps 1, 3, and 5 branch accordingly (see each step).

---

## Quick diagnostic

Run this first for any Mode 1 or Mode 3 investigation to gather context:

```bash
bash scripts/check_fleet_test_status.sh <test-file-path>
```

Path relative to the kibana repo root. Output: skip status, linked issues, FTR config file, git history, skip/unskip history, sibling open issues, staleness signal, test count.

---

## Mode 1: Single-issue triage

### Complete Steps 0a → 6 in order. Do not skip steps.

### Step 0 — Validity check

If the test is skipped (`.skip`, `describe.skip`, `it.skip`), verify the feature still exists:

1. `git log --oneline -15 -- path/to/test.ts`
2. Search for the feature implementation — has it changed since the test was skipped?
3. Verify relevant API endpoints / UI components still exist in the codebase.

| Finding | Action |
|---|---|
| Feature unchanged, test valid | Investigate and fix |
| Feature changed, test outdated | Update test to match new implementation |
| Feature removed / redesigned | Delete the test, close the issue as stale |
| Skipped for temp infra issue | Check if resolved, unskip if so |

### Step 1 — Environment context

Determine which environment(s) the test runs in. **Fleet uses config files, not in-file tags** (`@ess`/`@serverless` tags do not apply).

| Test type | How to determine environment |
|---|---|
| FTR API integration (stateful) | Which `config.*.ts` includes this test? Run: `grep -rl "$(basename <file> .ts)" x-pack/platform/test/fleet_api_integration/` |
| FTR API integration (serverless) | Fleet serverless suites live under solution paths — check: `x-pack/solutions/security/test/serverless/api_integration/test_suites/fleet/` and `x-pack/solutions/observability/test/serverless/api_integration/test_suites/fleet/`. Run: `grep -rl "$(basename <file> .ts)" x-pack/solutions/*/test/serverless/` |
| Jest server integration | Stateful only |
| Jest unit | Stateful only |
| Scout Playwright | Stateful only — Fleet's Scout config (`fleet/test/scout/ui/playwright.config.ts`) has no serverless variant |

A test can be broken in stateful but pass in serverless, or vice versa — always note which config surfaced the failure. If the failing issue title references a serverless pipeline (e.g. `Serverless Oblt` or `Serverless Security`), look in the solution serverless paths first.

### Step 2 — Duplicate coverage check

Search for existing coverage of the same behavior before proposing a fix:

1. **FTR API integration** tests covering the same endpoint/behavior
2. **Jest server integration** tests
3. **Jest unit** tests co-located with source
4. **Scout Playwright** tests

Don't rely on test names — check what the test actually asserts.

**If lower-layer coverage exists:** recommend moving to the cheaper layer (unit > integration > FTR API > Scout). Lower layers are faster and more reliable.

### Step 3 — Layer analysis (type-dependent)

| Current layer | Question | Consider |
|---|---|---|
| FTR API integration | Does this test only call APIs, not the UI? | Could it be a jest unit test instead? Often yes — faster, more reliable. |
| Jest server integration | Is the same coverage achievable in a jest unit test with mocks? | If yes, prefer unit — no ES/Kibana startup cost. |
| Jest unit | Is it testing a real integration concern requiring ES? | If yes, it belongs in server integration. |
| Scout Playwright | Is the underlying API behavior already covered by FTR? | If yes, the Scout test is redundant UI plumbing — candidate for deletion. |

### Step 4 — Bug vs flakiness classification

| Type | Signs |
|---|---|
| Real bug | Consistent failure, incorrect behavior, recent code changes, differs from expected behavior |
| Flakiness | Intermittent, timing/ordering errors, passes on retry, `before all`/`after each` hook failure |
| Environment issue | Only fails in CI, passes locally, infrastructure warnings in logs |
| App bug exposed by test | Test unchanged but fails after a feature change — the test may be catching a real regression |

When a test fails after a code change but test code is unchanged, investigate the **application code** first.

### Step 5 — Fix proposal

Follow Fleet test conventions from `references/conventions-and-deletion.md` for the test type identified in Step 0a.

**Before proposing a fix, audit data & cleanup:**
- Identify all resources the test creates (agent policies, package policies, packages, SO documents, indices)
- Verify every resource has explicit cleanup in `before`/`after` or `beforeEach`/`afterEach`
- Ensure setup handles crashed previous runs (clean before, not only after)

**For flakiness:** provide root cause, before/after code, and why the fix works.
**For bugs:** describe the bug, affected environments, and next steps.
**For deletion candidates:** document which lower-layer coverage makes deletion safe.

### Step 6 — Issue disposition

Recommend one of the following for the linked GitHub issue:

| Verdict | Condition | Deliverable |
|---|---|---|
| **close-stale** | Test deleted/renamed; feature removed; duplicate of newer issue | Drafted closing comment citing evidence (commit SHA, PR number, or duplicate issue #) |
| **flaky-rerun** | Passes locally N×; issue >60 days old; no recent test-file commits; OR `before all`/`after each` hook failure | Re-run command (type-dependent — see §Flaky Runner Support) + draft unskip diff to merge if it passes |
| **fix** | Fails locally and reproduces the issue | Root cause + before/after diff in Fleet conventions + exact local verify command. If sibling issues exist, list them — one PR may close multiple. |
| **delete-test** | `.skip`'d >180 days AND no intent-to-fix AND coverage duplicative at a lower layer | File-removal diff + justification + draft PR description |
| **escalate** | None of the above — couldn't confidently classify | Evidence package + focused questions for the human |

**Decision rubric** (first match wins):
1. **close-stale** — test file/name gone; feature removed; duplicate of newer issue.
2. **flaky-rerun** — passes locally 3× AND issue >60 days old AND no recent test-file commits. OR `before all`/`after each` hook failure.
3. **fix** — fails locally and reproduces the signature.
4. **delete-test** — `.skip`'d >180 days AND no champion AND lower-layer coverage exists.
5. **escalate** — otherwise.

---

## Mode 1: Response format

```
## Analysis: #<N> — <title>

**Test type:** FTR API integration | Jest server integration | Jest unit | Scout Playwright | Cross-team
**Environment:** stateful | serverless | both
**Classification:** Bug | Flakiness | Environment Issue | App Bug
**Verdict:** close-stale | flaky-rerun | fix | delete-test | escalate
**Confidence:** High | Medium | Low

## Findings

### Duplicate Coverage
[Found / Not Found — details]

### Layer Analysis
[Appropriate / Should Move — details]

### Root Cause
[What's causing the failure]

### Reproduction
[Ran locally N×, M failed — or: not run, reason]

### Sibling issues
[Other open issues referencing the same test file, from check_fleet_test_status.sh output]

## Recommendation

[Primary recommendation]

### Option A: [Fix / Delete / Close / Rerun]
[Diff or command or closing comment text]

### Option B: [Alternative, if applicable]
[Details]

## Related Files
[List of files to check or modify]
```

---

## Mode 2: Backlog audit

### Input

```bash
gh issue list --repo elastic/kibana \
  --label "Team:Fleet" --label "failed-test" \
  --state open --limit 200 \
  --json number,title,labels,createdAt,updatedAt
```

Or a list of issue numbers provided by the user.

### Per-issue skim (Mode 2 only — not the full Mode 1 analysis)

For each issue:
1. Extract test file path from the issue title (Kibana auto-reporter format: `<Pipeline>.<path> - <describe chain> <test name>`).
2. Check if file/test still exists: `grep -r "<test name>" <file>` (or `NOT FOUND`).
3. Check last commit on the file: `git log -1 --format="%ai %s" -- <file>`.
4. Check issue's `updatedAt` — if only bumped by the auto-reporter, note it.
5. Look for sibling issues: `gh issue list --repo elastic/kibana --label "Team:Fleet" --label "failed-test" --state open --search "$(basename <file> .ts)"`.
6. Assign a quick verdict: close-stale | flaky-rerun | fix | delete-test | escalate.

### Output format

First, the tracking table:

```markdown
| # | Title (short) | Test type | File exists? | Last file commit | Quick verdict | Cluster |
|---|---|---|---|---|---|---|
| 224362 | Fleet preconfig reset — all | Jest server int. | ✅ | 2025-06-18 | fix | A |
| 246983 | EPM KB returns content | FTR API | ✅ | 2025-12-10 | fix | B+F+M |
| 247566 | APM input_only_package | Cross-team | ✅ | 2026-01-05 | escalate | O |
...
```

Then, the cluster summary:

```markdown
## Cluster summary

| Cluster | Issues | Suggested action |
|---|---|---|
| A — Preconfig/setup (Jest server int.) | 14 | Mode 3 fix — one shared cause |
| B+F+M — Knowledge Base (cross-layer) | 5 | Mode 3 fix — same KB regression at 3 layers |
| J — Policy secrets (FTR API) | 6 | Mode 3 fix |
...

## Recommended next steps

Lane 1 (batch close): #NNN, #NNN, ... (~N issues)
Lane 2 (flaky-rerun): #NNN, #NNN, ... (~N issues) — note jest issues: local only
Lane 3 (Mode 3 clusters): A → KB → J → H → C/K/L
Lane 4 (handoffs): #247566 → APM team; #246569, #265666 → Security team
```

---

## Mode 3: Cluster fix

### Input

A cluster name (e.g. `A`) or a list of issue numbers copy-pasted from the Mode 2 cluster summary.

### Analysis

1. Collect all test files referenced by the cluster's issues.
2. **Read all of them together** — look for the shared fixture, shared setup call, shared assertion, or shared helper that is common across all failures. This is what's invisible from any single issue.
3. Run `check_fleet_test_status.sh` on the most representative test (usually the oldest issue's test).
4. Reproduce one representative test locally to confirm the failure.
5. Identify the fix at the **shared layer** (the fixture, helper, setup hook, or shared config that affects the whole cluster), not at the individual test level.
6. If the shared-cause hypothesis fails (each test fails for a different reason), return: "This cluster doesn't share a root cause — run Mode 1 on these issues individually: #N, #N, ..."

### Output format

```markdown
## Cluster fix: <cluster name>

**Issues:** #N, #N, ... (N total — this fix should close all of them)
**Test type:** <type>
**Shared root cause:** <one paragraph>
**Reproduced locally:** yes (N of N runs failed) | no (reason)

## Fix

**File to change:** <path>

**Before:**
```ts
// existing code
```

**After:**
```ts
// fixed code
```

**Why this fixes the whole cluster:** <explanation of why the shared layer change resolves all N tests>

## Verification matrix

Run all of the following and confirm green:
- `<reproduction command for test 1>`
- `<reproduction command for test 2>`
...

## Issues to close after merging

#N, #N, ... — reference this PR in each closing comment.
```

---

## Flaky Runner Support

The Buildkite flaky-test pipeline supports only FTR and Scout. Jest has **no CI runner** — local looping is the only option.

| Test type | Buildkite flaky runner | Re-run mechanism |
|---|---|---|
| FTR API integration | ✅ `type: "ftrConfig"` | [ci-stats.kibana.dev/trigger_flaky_test_runner](https://ci-stats.kibana.dev/trigger_flaky_test_runner) with `config.*.ts` path |
| Scout Playwright | ✅ `type: "scoutConfig"` | Same UI, Scout config path |
| Jest server integration | ❌ Not supported | `for i in {1..25}; do node scripts/jest_integration --testPathPattern=<path> && echo "PASS $i" || echo "FAIL $i"; done` |
| Jest unit | ❌ Not supported | `for i in {1..10}; do yarn jest <path> && echo "PASS $i" || echo "FAIL $i"; done` |

For jest: if it passes 9/10 or more runs locally after a long silence, that's sufficient evidence to unskip. If it consistently fails, it's a `fix` verdict, not `flaky-rerun`.

---

## Information gathering strategy

**Self-investigate first — don't ask the user:**

| Information | How to find it |
|---|---|
| Feature still valid? | Search codebase, check recent commits |
| Duplicate coverage? | Grep for the assertion/behavior in other test files |
| When was test skipped? | `git log -S '.skip' -- <file>` |
| Which FTR config runs it? | `grep -rl "$(basename <file>)" x-pack/platform/test/fleet_api_integration/` |
| Sibling open issues? | `check_fleet_test_status.sh` output, or `gh issue list --search "<basename>"` |
| Is the issue stale? | Compare `git log -1 --format=%ai -- <file>` with issue `updatedAt` |
| Was it already fixed? | `gh pr list --repo elastic/kibana --search "$(basename <file> .ts)" --state merged` |
| Linked GitHub issue? | Look at the `// Failing:` or `// FLAKY:` comment above the skip |

**Ask the user (can't self-determine):**

| Information | Why |
|---|---|
| Which environment failed? | CI links are private |
| Error message from CI | Not in code |
| Consistent or intermittent? | Requires multiple runs |
| Additional CI context | Private infrastructure |

**Guidelines:**
1. Self-investigate first — exhaust what you can learn before asking.
2. Ask efficiently — combine related questions into one message.
3. Never assume you can access CI dashboards, build logs, or screenshots.

---

## Boundaries

- **Always:** analyze test code, search for duplicates, propose fixes, draft closing comments.
- **Always:** self-investigate before asking the user.
- **Ask first:** before suggesting moving a test to a different layer (may affect coverage intentionally).
- **Never:** delete tests without explicit human approval.
- **Never:** assume the problem is with the test — it might be a real app bug.
- **Never:** close GitHub issues directly — draft the comment, human posts it.

---

## Steady-state hygiene (after burn-down)

Once the backlog is cleared, use Mode 2 monthly:

1. **Monthly Mode 2 run** on open `Team:Fleet` + `failed-test` issues (~30 min).
2. **Skip budget:** no `.skip` older than 90 days — fix or delete.
3. **DoD for new skips** (PR review checklist):
   - Comment above the skip links a GitHub issue.
   - Issue has `Team:Fleet` + `skipped-test` labels.
   - Issue has a **named assignee** (not just the team label — unassigned issues rot).

---

## After completing a fix

Always verify with the appropriate re-run mechanism (see §Flaky Runner Support) before merging.

When the fix is verified or PR is ready, request feedback:

> "If you have a moment, please share feedback to help improve this skill — what was useful, what was off, anything it missed."

---

## Continuous learning

When you identify a root cause or fix pattern not documented here, tell the user and offer to add it to `references/common-flaky-patterns.md`.

**Signs you've discovered something new:**
- The root cause doesn't match any pattern in `references/common-flaky-patterns.md`.
- You needed a technique not mentioned in `references/conventions-and-deletion.md`.
- A cluster turned out not to share a root cause despite appearing to.
- Environment-specific Fleet behavior (e.g. space-awareness affecting test isolation) that wasn't documented.

---

## References

Open only what you need:

- Fleet-specific failure patterns (shared SO state, package registry timing, policy secrets race conditions, etc.): `references/common-flaky-patterns.md`
- Fleet test conventions, cleanup audit, deletion guidelines, flaky process: `references/conventions-and-deletion.md`
- FTR test execution: `fleet-ftr-testing` sub-skill
- Local Kibana setup: `kibana-local-dev` sub-skill
- Backlog cluster map: `backlog-report-may-2026.md`
