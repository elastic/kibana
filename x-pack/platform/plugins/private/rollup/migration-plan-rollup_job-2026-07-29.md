# FTR to Scout Migration Plan

| Field | Value |
|-------|-------|
| Source | `x-pack/platform/test/functional/apps/rollup_job` (+ `x-pack/platform/test/accessibility/apps/group3/rollup_jobs.ts`) |
| Target module root | `x-pack/platform/plugins/private/rollup` |
| Generated | 2026-07-29 |
| Deployment targets | stateful only (rollup does not exist in serverless; `disabled_uis.ts` asserts its absence) |
| FTR config chain | `apps/rollup_job/config.ts` > `x-pack/platform/test/functional/config.base.ts`; also loaded by `x-pack/platform/test/functional/config.ccs.ts` (CCS run, `rollup_jobs.js` only); a11y via `x-pack/platform/test/accessibility/apps/group3/config.ts` |

**Context that shapes every decision below**: the rollup feature is deprecated. The UI is hidden unless the cluster already has rollup usage, so every suite first creates a "mock rollup index" (`test_helpers.ts#createMockRollupIndex`) to unhide it. GitHub issue [#281247](https://github.com/elastic/kibana/issues/281247) notes the FTR is legacy `.js` — this is a rewrite, not a port.

---

## 1. Test inventory

Sorted by estimated complexity (simple to complex).

| # | FTR file (relative) | Type | Description | `it` count | Complexity | Decision | Justification |
|---|---------------------|------|-------------|-----------|------------|----------|---------------|
| 1 | `apps/rollup_job/config.ts` | config | Thin wrapper over `config.base.ts`, no server args of its own | - | - | delete after migration | Nothing custom; remove entry from `.buildkite/ftr-manifests/ftr_platform_stateful_configs.yml:281` |
| 2 | `apps/rollup_job/index.js` | index | Loads `rollup_jobs` always; `hybrid_index_pattern` + `tsvb` only when NOT CCS | - | - | split | Each `loadTestFile` target becomes its own spec; CCS gating handled by deferral (see §8) |
| 3 | `apps/rollup_job/test_helpers.ts` | helper | `createMockRollupIndex(es)` — creates index with `_meta._rollup` mapping to unhide the deprecated UI | - | - | port | Becomes a Scout API helper/fixture; needed by every spec |
| 4 | `apps/rollup_job/hybrid_index_helper.js` | helper | Mock document builders (`mockRolledUpData`, `mockIndices`) | - | - | port | Plugin-local Scout helper |
| 5 | `apps/rollup_job/rollup_jobs.js` | test | Deprecation prompt on empty list; create a rollup job through the 6-step wizard; verify job list row | 2 | medium | UI test | Real user journey through the wizard; core coverage of this plugin's UI |
| 6 | `apps/rollup_job/hybrid_index_pattern.js` | test | Creates rollup job via ES API, then creates a data view over `regular-index*,rollup-target-data` in Management UI; asserts Rollup badge + field list; repeats via an alias to the rollup index | 2 | medium | UI test | Exercises the data-view creation flow with rollup indices — the rollup plugin's data-view integration |
| 7 | `accessibility/apps/group3/rollup_jobs.ts` | test | a11y snapshot of empty state + each of the 6 wizard steps + save flyout + job table | 9 | medium | UI test (merge into wizard spec) | `page.checkA11y()` added at each `test.step` of the functional wizard spec — Scout convention is to merge a11y checks into functional specs, not keep them separate (dmlemeshko, PR #281288; watcher recipe) |
| 8 | `apps/rollup_job/tsvb.js` | test | TSVB metric visualization reading a rolled-up index (`metrics:allowStringIndices`) | 1 | complex | defer — `NEEDS VERIFICATION` | Doubly-deprecated combo (TSVB + rollup). Issue #281247 explicitly asks to verify whether TSVB coverage belongs to this migration at all. See "Tests to defer" |

### Proposed file splits

- `index.js` + `rollup_jobs.js` + a11y `rollup_jobs.ts` merge into:
  - `ui/tests/rollup_jobs_wizard.spec.ts` — deprecation prompt, full wizard journey, save, flyout, job list, delete, with a `page.checkA11y()` call inside each `test.step` (empty state, the 6 wizard steps, save flyout, job table). One spec covering both functional behavior and accessibility, per the Scout convention.
- `hybrid_index_pattern.js` stays one spec (`ui/tests/hybrid_data_view.spec.ts`) — its two `it` blocks share the same rollup job and differ only in plain-index-pattern vs alias entry point.

### Tests to drop

- None outright. The CCS variant and TSVB are deferred, not dropped (see below).

### Tests to defer

- `apps/rollup_job/tsvb.js`: `NEEDS VERIFICATION` — TSVB is itself deprecated and the coverage is really "TSVB can read a string index name when `metrics:allowStringIndices` is on", which belongs to the TSVB/visualization domain more than to rollup management. Recommendation: ask the code owners (Kibana Management + Visualizations) whether this coverage should survive; if yes it should live with TSVB's tests, not the rollup plugin's. Coverage lost if dropped: TSVB rendering data from a rollup target index.
- CCS variant of `rollup_jobs.js` (run via `config.ccs.ts:22` against `ftr-remote:` source patterns): blocked — Scout has no remote-cluster topology. Tracked in the deferred-CCS umbrella issue #281791. The FTR file and the `config.ccs.ts` entry must **stay** until Scout supports CCS. Consequence: `rollup_jobs.js`, `index.js`, and both helpers cannot be deleted at the end of this migration — only `hybrid_index_pattern.js`, `tsvb.js` (if dropped), the standalone `config.ts`, and the a11y file can be removed, with `index.js` trimmed to load only `rollup_jobs` (it already skips the other two under CCS).

---

## 2. Test type routing

### UI tests

| FTR file | Proposed spec path | Key flows covered |
|----------|--------------------|-------------------|
| `rollup_jobs.js` + a11y `rollup_jobs.ts` | `test/scout/ui/tests/rollup_jobs_wizard.spec.ts` | Deprecation prompt on empty list; 6-step create wizard (logistics → date histogram → terms → histogram → metrics → review); save without starting; details flyout; job list row values; plus `page.checkA11y()` inside each `test.step` |
| `hybrid_index_pattern.js` | `test/scout/ui/tests/hybrid_data_view.spec.ts` | Data view over mixed regular+rollup indices gets Rollup badge and correct field list; same via alias to the rollup index |

### API tests

None. All ES-level rollup behavior (`_rollup/job` PUT/DELETE/stop) is Elasticsearch functionality used here as setup, not Kibana API surface worth migrating. The rollup plugin's own HTTP API has no FTR coverage in this source directory.

### Unit tests (RTL/Jest)

None recommended. The wizard steps are already covered by client_integration tests in the plugin (`x-pack/platform/plugins/private/rollup/fixtures`/client integration setup); no FTR case here reduces to a component-level test without losing the journey intent.

---

## 3. Parallelism plan

### Parallel-safe (can be space-isolated)

None fully. Every spec mutates cluster-scoped state (rollup jobs, indices with reserved names).

### Must be sequential

| Proposed spec | Why sequential |
|--------------|---------------|
| `rollup_jobs_wizard.spec.ts` | The deprecation-prompt assertion requires **zero rollup jobs in the cluster**; rollup jobs are cluster-level (not space-scoped); the mock rollup index is shared cluster state |
| `hybrid_data_view.spec.ts` | Creates cluster-level rollup job + indices `rollup-target-data`, `regular-index*`, `rollup-source-data*`; also relies on `defaultIndex` UI setting |

The two specs must not run concurrently with each other (both create rollup jobs; the wizard spec asserts on an empty job list). Recommendation: single worker / sequential project config for this module, like other management plugins with cluster-level state (watcher does the same and even cleans pre-existing watches defensively). Each spec must clean up its rollup jobs so the next spec's empty-state precondition holds.

---

## 4. Test data and setup

### Archives inventory

| Archive path | Contents | Size | Used by (files) | Verdict |
|-------------|----------|------|-----------------|---------|
| `x-pack/platform/test/functional/fixtures/kbn_archives/rollup/rollup.json` | 1 config SO (uiSettings incl. `defaultIndex: rollup`) + 1 `rollup*` data view | ~1KB | `tsvb.js` only | Drop with tsvb deferral; if tsvb survives, replace with programmatic data-view creation |
| `src/platform/test/functional/fixtures/es_archiver/logstash_functional` | logstash indices (~large) | ~MB | a11y `rollup_jobs.ts` (via `RollupPageObject.activateFeature`) | Drop — only used so the wizard's index pattern `logstash*` has matching indices; a tiny programmatically-created index serves the same purpose |

### UI settings mutations

| FTR call | Semantics | Files |
|----------|-----------|-------|
| `kibanaServer.uiSettings.replace({ defaultIndex: 'rollup' })` | **Wipes all settings**, then sets | `hybrid_index_pattern.js:42` |
| `kibanaServer.uiSettings.update({ defaultIndex, 'metrics:allowStringIndices', 'timepicker:timeDefaults' })` | Merge | `tsvb.js:46` |
| `kibanaServer.uiSettings.update({ 'metrics:allowStringIndices': false })` + `replace({})` | Merge, then wipe-all | `tsvb.js:122-123` |

In Scout these become the `uiSettings` fixture with per-test set/unset; no replace-all semantics.

### Shared constants to extract

| Value | Occurrences | Current locations |
|-------|-------------|-------------------|
| `MOCK_ROLLUP_INDEX_NAME` (`'mock-rollup-index'`) + `createMockRollupIndex` | 3 files | `rollup_jobs.js:11`, `hybrid_index_pattern.js:11`, `tsvb.js:10` — already extracted in `test_helpers.ts`; port as-is to a Scout fixture/helper |
| `'rollup-target-data'` / `'rollup-source-data'` | 2 files | `hybrid_index_pattern.js:25-27`, `tsvb.js:32-33` — keep inline per spec; values are coincidentally equal, not shared state |

### Fresh server required

- None. But `rollup_jobs_wizard.spec.ts` needs a **rollup-job-free cluster** at start; a defensive cleanup loop over `GET _rollup/job/_all` in `beforeAll` (watcher-style) is safer than assuming freshness.

---

## 5. Auth and roles

### Role inventory

| Role name | Source | Privileges (summary) | Used by (files) | Scout role target | Notes |
|-----------|--------|---------------------|-----------------|-------------------|-------|
| `superuser` | `rollup_jobs.js:49` | everything | 1 file | `browserAuth.loginAsAdmin()` | Used as a **workaround** — `manage_rollups_role` is commented out due to [#143720](https://github.com/elastic/kibana/issues/143720). `NEEDS VERIFICATION`: whether admin suffices or the Scout custom-role path works where FTR's didn't |
| `manage_rollups_role` | `config.base.ts:500` | cluster `manage`+`manage_rollup`; all indices read/delete/create/view_metadata; kibana `discover: read` | 0 files (commented out) | n/a | Dead config; do not port. Delete from `config.base.ts` only when no other suite references it (it doesn't today) |
| `test_rollup_reader` | `config.base.ts:520` | read + view_index_metadata on `rollup-*`, `regular-index*` | 2 files (`hybrid_index_pattern.js:40`, `tsvb.js:42`) | `loginAsAdmin()` (or `editor`) | Not a permission-scoping test — the narrow role is incidental. No built-in role maps to index-scoped read; keeping it custom adds cost with no assertion value |
| `global_index_pattern_management_all` | `config.base.ts` | kibana indexPatterns:all | `hybrid_index_pattern.js:39` | covered by admin/editor | Incidental |
| `global_visualize_all` | `config.base.ts` | kibana visualize:all | `tsvb.js:42` | covered by admin/editor | Only relevant if tsvb survives |
| a11y default test user | a11y `config.ts` | superuser-equivalent | a11y file | `loginAsAdmin()` | — |

### Over-privileged tests

| File | What it actually exercises | Suggested minimum privilege |
|------|---------------------------|----------------------------|
| `rollup_jobs.js` | Create/manage rollup jobs + management UI | cluster `manage_rollup` + management UI access — but see #143720 workaround; recommend `loginAsAdmin()` and do **not** attempt a custom role in the first pass |

### Roles deserving shared helpers (used in ≥3 files)

None — recommend built-in `admin` everywhere; no custom roles ported.

### Special auth patterns

None (`run_as`, API keys, certs not used).

---

## 6. Reusability audit

### FTR services and page objects in use

| FTR name | What it does | Used by (files) | Scout equivalent exists? | Hidden assertions? | Recommended scope |
|----------|-------------|-----------------|-------------------------|-------------------|-------------------|
| `PageObjects.rollup` (`page_objects/rollup_page.ts`) | Wizard driving, job list parsing, `activateFeature` | `rollup_jobs.js`, a11y | no | **yes** — `verifyIndexPatternAccepted` (`rollup_page.ts:161-166`) asserts inside PO; `saveJob`/`closeFlyout`/`clickRollupJobsTab` embed `retry.waitFor` | plugin-local Scout page object (`test/scout/ui/fixtures/page_objects/rollup_page.ts`), assertions moved to specs |
| `PageObjects.settings` | Data view creation, field list reading | `hybrid_index_pattern.js`, `tsvb.js` | `NEEDS VERIFICATION` — check `kbn-scout` page objects for data-view management coverage before writing a new one | some | use existing if present; else plugin-local minimal helper |
| `PageObjects.visualize` / `visualBuilder` / `timePicker` | TSVB driving | `tsvb.js` | partial | yes (`checkVisualBuilderIsPresent` etc.) | moot if tsvb deferred |
| `security.testUser.setRoles` | role switching | all | Scout `browserAuth` | no | built-in |
| `esDeleteAllIndices` | teardown | all | `esClient.indices.delete` | no | inline |
| `kibanaServer.importExport` / `uiSettings` | archive + settings | `hybrid`, `tsvb` | Scout fixtures | no | built-in |
| `remoteEs` | CCS remote data | `rollup_jobs.js` (CCS mode only) | **no Scout equivalent** | no | blocker → CCS deferral |

### EUI components interacted with directly

| Component | Interaction pattern | Files |
|----------|-------------------|-------|
| `EuiCheckbox` | raw CSS click `.euiCheckbox__input` (start-immediately) | `rollup_page.ts:183` |
| `EuiFlyout` | close via `euiFlyoutCloseButton` | `rollup_page.ts:194` |
| `EuiBasicTable` (job list) | per-cell `data-test-subj` reads | `rollup_page.ts:200-229` |
| `EuiSteps` (wizard) | `createRollupStep{N}--active` existence | `rollup_page.ts:139` |

Use Scout's EUI helpers (`page.components.*`) where available instead of porting these raw interactions.

### Brittle locator strategies

| File | Line | Current locator | Target component |
|------|------|----------------|-----------------|
| `rollup_page.ts` | 183 | `find.byCssSelector('.euiCheckbox__input')` | "Start job now" checkbox — has no `data-test-subj`; `NEEDS VERIFICATION` whether one must be added to `job_create` source |
| `rollup_page.ts` | 163 | `span.findByCssSelector('p')` inside success callout | index-pattern success message |

### Page objects with hidden assertions

| FTR helper | Method | Assertion | File:line |
|-----------|--------|-----------|-----------|
| `PageObjects.rollup` | `verifyIndexPatternAccepted` | `expect(text).to.be.equal('Success! ...')` | `rollup_page.ts:161-166` |
| `PageObjects.rollup` | `verifyStepIsActive` | **none — latent no-op**: `testSubjects.exists(...)` return value is discarded, so it never fails | `rollup_page.ts:138-140` |

---

## 7. Server configuration

### FTR server args (full chain)

| Arg | Source config | Category | Notes |
|-----|-------------|----------|-------|
| (none rollup-specific) | `apps/rollup_job/config.ts` | — | Suite runs on plain `config.base.ts`; **Scout's default stateful server config suffices** |

### ES server args

| Arg | Source config | Notes |
|-----|-------------|-------|
| (none rollup-specific) | — | Rollup APIs are available on a default license/trial ES; the UI is unhidden with data (mock rollup index), not flags |

### Custom server config needed?

No. Default Scout servers config for everything migrated. The only environment Scout cannot provide is the CCS remote cluster (deferral, not a config-set problem).

---

## 8. Deployment targets

| Proposed spec | Where it should run | Reasoning |
|--------------|--------------------|-----------|
| `rollup_jobs_wizard.spec.ts` | stateful only (`['@local-stateful-classic', '@cloud-stateful-classic']`, watcher precedent) | Rollup does not exist in serverless; serverless `disabled_uis.ts` covers absence |
| `hybrid_data_view.spec.ts` | stateful only (same tags) | Same |

### Stateful/serverless mirror FTR files

None found after searching by basename (`rollup_jobs`, `hybrid_index_pattern`, `tsvb`), test titles (`rollup job`, `hybrid index pattern`, `tsvb integration`), and `loadTestFile` references. Serverless references to rollup are negative tests (`x-pack/platform/test/serverless/functional/test_suites/management/disabled_uis.ts`) and stay in place. The CCS run (`config.ccs.ts:22`) is a re-execution of the same file, not a mirror.

### Coverage gaps

None — stateful-only is correct for a deprecated stateful-only feature.

### Cloud portability issues

| File | Line | Issue |
|------|------|-------|
| `rollup_jobs.js` | 23-25, 33-35 | CCS mode (`ftr-remote:` cluster) — not portable, stays in FTR |
| all | — | `NEEDS VERIFICATION`: `PUT /_rollup/job` requires `manage_rollup`; confirm the Scout cloud-stateful admin user has it on ECH before adding the `@cloud-stateful-classic` tag |

---

## 9. FTR test smells

| Smell | File | Lines | Description | Context |
|-------|------|-------|------------|---------|
| Over-privileged + linked bug | `rollup_jobs.js` | 46-49 | `superuser` used because `manage_rollups_role` broke (issue #143720); role line commented out | Decide admin-vs-custom-role before writing the spec |
| Fire-and-forget async | `hybrid_index_pattern.js` | 54, 91 | `await pastDates.map(async ...)` awaits an **array**, not the promises — indexing races with the test; masked by the later `retry.waitForWithTimeout` | Rewrite with `Promise.all` + explicit refresh |
| Fire-and-forget async | `tsvb.js` | 87 | Same pattern | Same fix |
| Wrong-variable assertion | `hybrid_index_pattern.js` | 129-131 | The alias test filters index-pattern names by `rollupIndexPatternName` instead of `rollupAlias` — it re-asserts the *first* test's data view, so the alias badge is never actually checked | Fix the assertion in the Scout version; this is silent lost coverage today |
| Hardcoded sleep | `tsvb.js` | 102 | `PageObjects.common.sleep(3000)` before reading the metric | Replace with condition-based wait (moot if deferred) |
| Sequential journey as separate `it`s | `rollup_jobs.js`, a11y file | all | Deprecation prompt → wizard steps share browser/cluster state | Model as one Scout test with `test.step()`s (watcher recipe) |
| Name collision workaround | `rollup_jobs.js:30`, `hybrid_index_pattern.js:24`, `tsvb.js:31`, a11y `:16` | — | `Date.now()` in job names because a rollup job name can never be reused, even after delete | Keep the pattern in Scout (worker-scoped unique names) |
| Replace-all uiSettings | `hybrid_index_pattern.js:42`, `tsvb.js:123` | — | `uiSettings.replace(...)` wipes all settings globally | Use scoped set/unset |
| Heavy UI-activation setup | a11y `rollup_jobs.ts:20` + `rollup_page.ts:24-87` | — | `activateFeature` loads the full `logstash_functional` es_archive and creates a real 1-second-cron rollup job, only so the wizard's `logstash*` pattern matches something | Replace with `createMockRollupIndex` + one tiny programmatic index |
| Missing cleanup (partial) | `rollup_jobs.js` | 82-92 | `after` stops/deletes the job via raw `transport.request` with no try/catch — a mid-test failure before job creation makes teardown throw and mask the real error | Watcher-style defensive teardown |

---

## 10. Migration batches

### Batch 1: Wizard spec (functional + a11y merged)

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 1 | `test/scout/ui/tests/rollup_jobs_wizard.spec.ts` | `rollup_jobs.js` + `accessibility/apps/group3/rollup_jobs.ts` | medium | New plugin-local page object + `createMockRollupIndex` helper; `page.checkA11y()` inside each `test.step` (empty state, wizard steps, flyout, table); replaces `activateFeature`'s logstash archive with `createMockRollupIndex` + one tiny programmatic index |

- **Human involvement**: `guided` — sign-off on admin-vs-custom-role (#143720)
- **Dependencies**: none (Scout module scaffolding created here: `playwright.config.ts`, fixtures, page object)
- **Blockers**: none

### Batch 2: Hybrid data view spec

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 2 | `test/scout/ui/tests/hybrid_data_view.spec.ts` | `hybrid_index_pattern.js` | medium | Fixes the alias-assertion bug (§9); needs data-view management page object — check `kbn-scout` for an existing one first |

- **Human involvement**: `guided` — confirm existing Scout data-view page object, confirm the alias-assertion fix preserves intent
- **Dependencies**: Batch 1 scaffolding
- **Blockers**: none

### Batch 3: Deferred / blocked

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 3 | (tsvb — pending owner decision) | `tsvb.js` | complex | `NEEDS VERIFICATION` with code owners: drop, or migrate under TSVB's own coverage |
| 4 | (CCS rollup job — stays FTR) | `rollup_jobs.js` via `config.ccs.ts` | blocked | Scout lacks remote-cluster topology (same as issue #281246) |

- **Human involvement**: `hands-on` (ownership + infrastructure decisions)
- **Dependencies**: none
- **Blockers**: Scout CCS support; TSVB coverage ownership

### Cleanup after Batches 1-2 (with Batch 3 pending)

- Delete: `apps/rollup_job/config.ts` (+ its `.buildkite/ftr-manifests/ftr_platform_stateful_configs.yml:281` entry), `hybrid_index_pattern.js`, `accessibility/apps/group3/rollup_jobs.ts` (+ its `index.ts` entry), a11y-only page-object methods if unused.
- Keep (CCS): `rollup_jobs.js`, `index.js` (trimmed), `test_helpers.ts`, `hybrid_index_helper.js`, `page_objects/rollup_page.ts` (trimmed), `config.ccs.ts` entry.
- `tsvb.js` + `kbn_archives/rollup/rollup.json`: delete only after the Batch 3 ownership decision.

### Scout CI registration (do in the PR that adds the first Scout config)

Required for CI to discover and run the new specs — do once per plugin, and re-run whenever specs or tags change (kapral18, PR #281731 — committing it avoids a later metadata-cleanup PR):

- Add the plugin under `plugins.enabled` (alphabetical) in `.buildkite/scout_ci_config.yml`.
- Regenerate and commit the Scout test-config manifest: `node scripts/scout.js update-test-config-manifests --includingUpToDate --noSummary`. Commit only this plugin's `test/scout/.meta/**`; the command also regenerates other plugins' manifests, so revert that unrelated drift (`git checkout -- <paths>`) before staging.
- Verify discovery finds the config: `node scripts/scout discover-playwright-configs --target local-stateful-only --configs x-pack/platform/plugins/private/rollup/test/scout/ui/playwright.config.ts` (expect "Found Playwright config files in 1 plugin(s)").

---

## 11. Effort summary

| Metric | Value |
|--------|-------|
| Total FTR test files analyzed | 4 (3 functional `.js` + 1 a11y `.ts`; plus 2 helpers, 1 config, 1 index, 1 page object) |
| > UI tests | 2 Scout specs (wizard with merged a11y; hybrid data view) |
| > API tests | 0 |
| > Unit tests (RTL/Jest) | 0 |
| > Dropped | 0 |
| > Deferred | 2 (tsvb pending ownership; CCS variant blocked on Scout topology) |
| New page objects needed | 1 plugin-local (`rollup_page`), possibly 0 for data views if a Scout one exists |
| New API services needed | 0 (one small helper: `createMockRollupIndex`) |
| `data-test-subj` additions to source code | likely 1 (start-immediately checkbox, `NEEDS VERIFICATION`) |
| Custom server config sets | 0 new / reuse default |
| Migration batches | 3 (2 executable now, 1 deferred) |

### Risks and open questions

- `NEEDS VERIFICATION` — role strategy: FTR fell back to `superuser` because of [#143720](https://github.com/elastic/kibana/issues/143720). Plan says `loginAsAdmin()`; confirm that's acceptable rather than retrying a custom `manage_rollup` role in Scout.
- `NEEDS VERIFICATION` — tsvb.js ownership: does TSVB-reads-rollup coverage survive at all, and if so, in whose test suite? Blocks Batch 3 and the deletion of `kbn_archives/rollup/rollup.json`.
- `NEEDS VERIFICATION` — existing Scout data-view/settings page object coverage before writing a new one for Batch 2.
- `NEEDS VERIFICATION` — `@cloud-stateful-classic` tag: confirm `PUT /_rollup/job` privileges for the Scout admin user on ECH.
- `NEEDS VERIFICATION` — whether the start-immediately checkbox needs a `data-test-subj` added to the wizard source (only if the migrated spec exercises `startImmediately: true`; the current FTR does via `createNewRollUpJob(..., true, ...)`).
- Human sign-off — the alias-assertion bug fix in `hybrid_index_pattern.js:129-131` means the Scout spec will assert something the FTR never actually verified; if the alias badge is broken in the product, the new test will catch it (and fail) for the first time.
