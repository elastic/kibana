---
name: lens-scout-migrate-ftr
description: >-
  Lens plugin gated FTR-to-Scout migration workflow. Plans first (UI vs API vs Jest),
  executes in batches, reviews, then runs tests only when asked — once, then 30
  times for flakes. Use when migrating Lens FTR tests/configs to Scout,
  preparing a Lens migration plan for an issue, or when stop points / flake repeats apply.
disable-model-invocation: true
---

# Lens: Migrate FTR → Scout (gated)

Lens plugin overlay on the repo migrate skill. The repo skill owns *how* to plan and convert. This skill owns Lens rules, **stop points**, batching, and flake hardening.

Read and follow:

- `.agents/skills/scout-migrate-from-ftr/SKILL.md` (and its `references/`: `generate-plan.md`, `pick-correct-test-type.md`, `plan-template.md`, `execute-plan.md`)
- `.agents/skills/scout-best-practices-reviewer/SKILL.md`
- `.github/agents/scout-reviewer.md` (review *intent* only — chat, not GitHub comments)
- `docs/extend/testing/scout-best-practices.md`
- `docs/extend/testing/ui-best-practices.md` (UI)
- `docs/extend/testing/api-best-practices.md` (API)
- `docs/extend/testing/run-scout-tests.md` (only when running is allowed)

Do not skip this overlay’s **Stop points**, **Lens rules**, or the **New-code quality gate**.

## Inputs (collect or confirm before planning)

- **Issue / ticket** (typical kickoff: prepare a migration plan for `<issue link>`)
- **FTR directory** and **FTR config path(s)**
- **Target Scout module root** (infer from the owning plugin if omitted)
- **Flake-repeat count** (default: **30**)

Do not assume Cloud/serverless coverage. Default local tag is `@local-stateful-classic`. If any input is missing and not inferable, ask. Do not guess suite ownership or test type.

## Where to reuse Lens page objects (look here first)

Search **existing methods** in this order before creating anything new. Specs use `pageObjects.lens` (local `LensEditorApp` extends shared `LensApp`).

1. **Lens-local split POs** (plugin-specific; nested as `pageObjects.lens.workspace`, `.dimensions`, `.layers`, …):
   - `x-pack/platform/plugins/shared/lens/test/scout/common/ui/fixtures/page_objects/lens/lens_editor_app.ts`
   - `…/lens_workspace.ts`
   - `…/lens_dimensions.ts`
   - `…/lens_layers.ts`
   - `…/lens_style.ts`
   - `…/lens_metric.ts`
   - `…/lens_datatable.ts`
   - `…/lens_drag_drop.ts`
   - `…/lens_editor_helpers.ts`
2. **Shared `lens_app`** (`@kbn/scout`):
   - `src/platform/packages/shared/kbn-scout/src/playwright/page_objects/lens_app.ts`
3. **Lens helpers**:
   - `x-pack/platform/plugins/shared/lens/test/scout/common/ui/fixtures/helpers.ts`
4. Other `@kbn/scout` page objects / fixtures / API services.

If a method already exists in any of the above, call it. Do not duplicate it in a spec or a new helper.

## Lens rules (every batch, every fix)

- Make sure you are using methods that already exist in shared `lens_app`, the Lens-local split POs (`workspace`, `dimensions`, `layers`, …), other page objects, or in the helpers before creating them
- Follow `docs/extend/testing/ui-best-practices.md` (and the UI testing skill when converting UI)
- **Best practices only on new code:** when applying best practices, do **not** change already existing methods. Stick to **newly created** methods (and new spec code) so the diff is easier to review. Do not rewrite shared `lens_app` or existing local PO methods to “match the docs”
- Don't use `poll()` unless necessary
- Avoid manual retry
- Use `waitFor()` in page objects and `expect(…).toBeVisible()` in specs — this is the UI best-practice **Keep assertions explicit in tests, not hidden in page objects** (`docs/extend/testing/ui-best-practices.md#keep-assertions-explicit-in-tests-not-hidden-in-page-objects`): no `expect()` in POs; assertions stay in specs
- **Static locators are `readonly` fields, not getters.** Assign them in the constructor. Use a method only when the locator needs an argument or a dynamic selector. Do not add a getter that only returns a locator (`docs/extend/testing/ui-best-practices.md#use-existing-page-objects-to-interact-with-the-kibana-ui`; `.agents/skills/scout-ui-testing/SKILL.md` Page objects)
- Fix eslint issues
- Don't run tests unless I explicitly ask for it
- Use `@local-stateful-classic` tag for stateful tests; don't worry about cloud portability
- Remove legacy FTRs and their configs (only in the current approved batch, after **S6**)
- After each batch: apply the **New-code quality gate** before S7. Post the gate table in chat. A fail row is not S5.

Also:

- Specs should be mostly `test.step` + page-object/helper calls + assertions
- Prefer Playwright auto-waiting. Do not add redundant waits or checks that only duplicate it
- Shared `@kbn/scout` (or other shared-package) edits → **S3**. Even then, do not drive-by best-practice existing methods — only add a new method or the minimum functional change you were approved to make

**Forbidden “green at any cost” tactics:** `test.skip` / `test.fixme` / commenting out cases; `page.waitForTimeout` or other sleeps; manual retry loops; `poll()` as a flake bandage; inflated timeouts as the fix; loosened or deleted assertions; `eslint-disable`; `dispatchEvent('click')` without a comment that names the documented EUI remount/`ownFocus` bug.

## New-code quality gate (every batch, before S7)

After execute, and again after review, walk **only newly created** specs, helpers, and PO methods against the full docs this skill already lists (Playwright, Scout general/UI/API, reviewer skill). Do not use a shortened subset.

On new code, a documented Playwright or Scout rule is **blocker/major. Fix it. Do not put it on S5.**

- Treat Playwright lint **errors and warnings** on new Scout files as must-fix (`plugin:playwright/recommended` and the Scout override in `.eslintrc.js`). Auto-fix is not enough if warnings remain. Especially `playwright/no-conditional-in-test`, `playwright/no-conditional-expect`, `playwright/no-nth-methods`, `playwright/prefer-web-first-assertions`.
- Specs stay linear (`docs/extend/testing/ui-best-practices.md#avoid-conditional-logic-in-page-objects`). Do not branch in the test body or around assertions. Parameterize only if each case stays linear; otherwise split tests or move the branch into a helper.
- Use APIs and fixtures for setup and teardown when the UI is not what the test is asserting (`#prefer-kibana-apis-over-ui-for-setup-and-teardown`).
- Keep the existing Lens rules: assertions in specs / `waitFor` in new POs; readonly locators; no redundant waits; no manual retry or `poll()` bandage.

A plan that says “parameterize” does not waive these rules. If following the plan would fail a gate row → **S2**, not S5.

**S5 is only true nits:** wording, extra comments, optional extras, taste. If it is a documented Playwright or Scout rule, or a failed gate row, it is not S5.

### Gate table (required in chat)

Before S7, post this table for **new** files only. Do not call the batch reviewed if any row is fail.

| Check | Result (pass / fail + one line) |
|---|---|
| No branch in the test body or around `expect()` | |
| Playwright lint: errors **and** warnings clean | |
| Setup/teardown is API/fixture when the UI is not under test | |
| Assertions in spec / `waitFor` in new POs; readonly locators; no retry/`poll()` bandage | |

If any row fails: propose the fix, **S9** (and **S2** if the plan conflicts), and wait. Do not start the next batch.

## Stop points (non-negotiable)

A stop point means: **write nothing further for that step, ask in chat, and wait for an explicit yes**. “Looks obvious”, “to save time”, and “I’ll fix it and you can revert” are not approvals.

| ID | When | What to show | Resume only after |
|----|------|----------------|-------------------|
| **S1 Plan** | Plan file is written (or updated after pushback) | Plan path + short summary (below) | Explicit approval to execute **batch 1** (or a named batch) |
| **S2 Diverge** | Execution would change the approved plan | What changed and the proposed course | Explicit approval of the new course |
| **S3 Shared blast radius** | A fix needs a new or changed helper/PO in `@kbn/scout` or another shared package | Why reuse is impossible, the proposed API, and which other Scout suites could break | Explicit approval to touch shared code |
| **S4 Flake fix** | A test is **flaky** (intermittent, or fails only on repeat) and a code change is proposed | Failing spec, root-cause diagnosis, proposed diff, and why it is not a banned tactic | Explicit approval to apply **that** fix |
| **S5 Review extras** | Review found only true nits (not a gate row, not a documented Playwright or Scout rule) | The list, unedited | Explicit ask to apply them |
| **S6 Delete FTR** | About to remove legacy FTR files and their configs | File list to delete | Explicit approval to delete |
| **S7 Next batch** | Current batch is coded + reviewed (and test runs if you asked for them) | Batch id, what landed, what is still open | Explicit approval to start the next batch |
| **S8 Run tests** | Any desire to start servers or Playwright | What would run (specs, once vs 30×) | You explicitly ask to run |
| **S9 Quality gate** | After execute + review of a batch, before S7 | Pass/fail table (below). If any row fails: what failed, proposed fix, S2 if the plan conflicts | All rows pass, **or** explicit yes to apply the proposed gate fixes |

Do not run tests, post GitHub comments, open a PR, commit, or push unless asked.

## Workflow

Start at **1. Plan**. Execute **by batches**. Do not start the next batch until the current one has followed Lens rules, posted the **S9** gate table, and you approved **S7**.

### 1. Plan (read-only)

Follow the repo migrate skill’s plan path. No create/modify/delete of test files.

The plan **must** include an analysis of every test: Scout **UI**, Scout **API**, or **Jest/RTL** — not a default of “all UI”. Explain why. Split work into **batches** (small, reviewable file groups).

Then **S1**. Surface:

- Path to the plan file
- **Batches** (what each contains)
- **Downgrades** (UI → API / RTL / Jest) with one-line reasons
- **`NEEDS VERIFICATION`**
- **High-impact FTR smells** (only ones that would change migrated behavior)

Do **not** treat cloud portability as a blocker. Do not add serverless/Cloud work unless the user asks.

Update the plan if the user pushes back. Repeat **S1** until they approve.

### 2. Execute one batch (after S1 / S7)

Follow the migrate skill’s execute path for **only the approved batch**: convert tests, place files under the Scout module, map FTR services/POs/hooks to Scout fixtures, split `loadTestFile` suites, typecheck, fix eslint.

Reuse: follow **Where to reuse Lens page objects**. Prefer adding a method on the matching **local** split PO (`workspace`, `dimensions`, …) over shared `lens_app`. Invent nothing that already exists. Apply best practices only to the new method — leave existing methods untouched.

On **new** PO methods and specs, follow `docs/extend/testing/ui-best-practices.md`, especially:

- **Keep assertions explicit in tests, not hidden in page objects** (`#keep-assertions-explicit-in-tests-not-hidden-in-page-objects`): `waitFor()` / `waitForSelector` in page objects to synchronize; `expect(…).toBeVisible()` (and other `expect()`s) in specs — not in POs
- **Static locators are `readonly` fields, not getters** (`#use-existing-page-objects-to-interact-with-the-kibana-ui`): assign them in the constructor; use a method only when the locator needs an argument or a dynamic selector
- **Use Playwright auto-waiting** (`#leverage-playwright-auto-waiting`): do not add redundant waits that duplicate Playwright
- **Don't use manual retry loops** (`#dont-use-manual-retry-loops`)

If the plan is wrong about a file’s test type, coverage to drop, or a custom server config → **S2**.

Remove that batch’s legacy FTR files and configs only after **S6**.

**Do not run tests** (see **S8**).

### 3. Review the batch

Apply `.agents/skills/scout-best-practices-reviewer/SKILL.md` with the **original FTR files** as parity context. Review code more carefully and be cleaner/more robust/more straightforward. For new UI code, check `docs/extend/testing/ui-best-practices.md#keep-assertions-explicit-in-tests-not-hidden-in-page-objects` (`waitFor` in POs, `expect` / `toBeVisible` in specs).

Apply review *intent* from `.github/agents/scout-reviewer.md` (right test type, no lint circumvention, reuse-first, high-signal). Chat only.

Fix **blocker** and **major** under Lens rules, **only in newly created methods/specs**, including the **New-code quality gate**. Do not rewrite existing PO methods to apply best practices.

Then post the **gate table**. Remaining items are S5 **only** if they are not a gate row and not a documented Playwright or Scout rule.

Then **S9**. After the gate is all-pass (or you approved the gate fixes): **S7** (or steps 4–5 if you asked to run).

### 4. Run once (only if asked)

When the user explicitly asks to run, use **two terminals** (or one long-lived background server + a second command for tests). Do not boot ES+Kibana on every Playwright invocation.

For Lens, the matching `--config` and start-server flags live in
`x-pack/platform/plugins/shared/lens/test/scout/README.md`. Read that file; do not invent config paths.

**Terminal 1 — server (leave it running):**

```bash
node scripts/scout.js start-server --arch stateful --domain classic
```

If a Scout stack is already up from this session, reuse it. Do not start a second one.

**Terminal 2 — tests:**

```bash
node scripts/playwright test --project local --workers=1 \
  --config <playwright.config.ts from the Lens README> \
  <current-batch spec paths>
```

- Run the **current batch** specs **once**.
- Prefer `--workers=1`.
- Do **not** use `node scripts/scout.js run-tests` for iteration: it restarts the stack.
- If Playwright fails because browsers are missing, `unset PLAYWRIGHT_BROWSERS_PATH` and retry (use the machine Playwright cache, not a sandbox path).
- Sequential Lens configs exist because they change server-wide feature flags; do not run those specs on the parallel config.

If failures: fix them following Lens rules (deterministic first-pass failures do not need **S4**). Shared PO edits still need **S3**. After every fix: eslint, typecheck on the touched packages, then re-run **only if the user still wants runs**.

Stop and ask when the blocker is a source bug, missing instrumentation, or genuinely unstable product behavior.

### 5. Flake check — 30× (only if asked)

Default **30** repeats of the **current batch** specs against the already-started stack (or the user’s N). Same stack as step 4 (do not reboot):

```bash
node scripts/playwright test --project local --workers=1 --repeat-each=30 \
  --config <same config as the once-run> \
  <affected spec paths>
```


- All repeats pass → batch flake check done.
- Any failure → treat as a flake, even if it passed once.

For each flake:

1. Diagnose the **root cause**.
2. Draft the smallest fix that addresses that cause.
3. **S4** — do not apply the fix yet.
4. After approval: apply only that fix, re-check Lens rules, re-run the 30× loop for the affected specs.

Do not “harden” passing tests with extra waits, retries, or assertions “just in case”.

### 6. Next batch

Only after the current batch has followed the rules (code + review; plus run/30× if asked) → **S7** → repeat from step 2.

## Guardrails

- Preserve intent and migration parity. If dropping or downgrading a test, explain coverage loss and where it moves.
- No guessing — flag unknowns as `NEEDS VERIFICATION`.
- Prefer parallel-safe isolation, resilient cleanup, minimal privileges.
- UI tests assert interaction + rendering. Avoid exact computed values unless UI behavior depends on them.
- Keep the diff focused on this batch. No unrelated refactors.
- Run scoped checks as needed (`type_check`, eslint, `node scripts/check.js --scope=…`) — these are not Playwright test runs.

## Success criteria

- [ ] Plan written with UI vs API vs Jest analysis, batched, and approved (**S1**)
- [ ] Each batch coded under Lens rules before the next batch (**S7**)
- [ ] Existing shared `lens_app` + Lens-local split POs / helpers reused wherever possible
- [ ] Best practices applied only to newly created methods; existing methods left unchanged
- [ ] `@local-stateful-classic` on stateful UI tests
- [ ] Legacy FTR files and configs removed per batch (**S6**)
- [ ] Best-practices + parity review per batch; **S9** gate table posted; blockers/majors fixed; S5 only for true nits
- [ ] Tests run **only** when asked: once, then 30×; flakes went through **S4**
- [ ] Ready to open/link a PR with a clear test plan — but do not open it unless asked
