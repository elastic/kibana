# FTR to Scout Migration Plan

| Field | Value |
|-------|-------|
| Source | `x-pack/platform/test/functional/apps/transform` (plus `x-pack/platform/test/functional_basic/apps/transform`, `x-pack/platform/test/serverless/functional/test_suites/management/transforms`, `x-pack/platform/test/accessibility/apps/group2/transform.ts`) |
| Target module root | `x-pack/platform/plugins/private/transform` |
| Generated | 2026-07-29 |
| Deployment targets | both (stateful + serverless) |
| FTR config chain | per-suite `config.ts` (actions / creation/index_pattern / creation/runtime_mappings_saved_search / edit_clone / permissions) > `x-pack/platform/test/functional/config.base.ts` > `@kbn/test-suites-src/functional/config.base` + `@kbn/test-suites-src/common/config`. Basic-license variants: per-suite `config.ts` > `x-pack/platform/test/functional_basic/apps/transform/config.base.ts` (overrides ES license to `basic`) > `x-pack/platform/test/functional/config.base.ts`. Serverless: `x-pack/platform/test/serverless/functional/configs/{search,observability,security}/config.group1.ts` > `config.{search,oblt,security}.base.ts` > `config.base.ts`. A11y: `x-pack/platform/test/accessibility/apps/group2/config.ts` > `x-pack/platform/test/functional/config.base.ts` |

**Dedupe context (already migrated, out of scope for this plan):**

- All transform **API** coverage (CRUD, bulk actions, create/preview/stats/update, nodes, reauthorize/reset/start/stop/schedule_now, incl. 403-for-viewer checks) already exists at `x-pack/platform/plugins/private/transform/test/scout/api/` (PR #245130). All specs are tagged `tags.stateful.all` only.
- Transform **feature_controls** UI FTR was deleted in PR #270902; coverage lives in `src/platform/plugins/shared/management/test/scout/ui/parallel_tests/data_section.spec.ts` (transform link visibility per role) — do not recreate.
- Consequence for this plan: the UI action specs (delete/reset/start/reauthorize) must assert **UI affordances** (row action enabled/disabled state, confirm modals, callout, expanded-row messages/health) — the underlying state transitions and authorization outcomes are already covered by the Scout API suite, so redundant deep state assertions can be slimmed, not duplicated.

---

## 1. Test inventory

Sorted by estimated complexity (simple to complex).

| # | FTR file (relative) | Type | Description | `it` count | Complexity | Decision | Justification |
|---|---------------------|------|-------------|-----------|------------|----------|---------------|
| 1 | `x-pack/platform/test/serverless/functional/test_suites/management/transforms/search_bar_features.ts` | test | Serverless nav search returns "Data / Transforms" for query "transform" | 1 (data-driven, up to 2) | simple | UI test (serverless-only) | Exercises real serverless side-nav search; nothing to assert without a browser |
| 2 | `x-pack/platform/test/functional/apps/transform/creation/index_pattern/wizard_max_page_search_size_reset.ts` | test | Wizard resets `max_page_search_size` to per-function default when switching pivot↔latest | 2 | simple | UI test | Wizard steps need live field caps/preview APIs to advance; RTL would require heavy wizard-provider mocking (see downgrade note below) |
| 3 | `x-pack/platform/test/serverless/functional/test_suites/management/transforms/transform_list.ts` | test | Serverless: transform list renders (empty state or table), wizard opens, data-tier options hidden | 2 | simple | UI test — merge | Fold into the migrated permissions/list specs + creation wizard spec with serverless tags; only serverless-unique assertions kept (data-tier options hidden, use-full-data visible) |
| 4 | `x-pack/platform/test/functional/apps/transform/permissions/read_transform_access.ts` | test | Viewer: empty state + disabled create button; with data: disabled actions popover, expanded row | 2 | medium | UI test | Permission-scoped rendering with a custom ES-privilege role; UI-only concern |
| 5 | `x-pack/platform/test/functional/apps/transform/permissions/full_transform_access.ts` | test | Poweruser: empty state + enabled create; with data: per-action enabled/disabled matrix, edit flyout control states | 3 | medium | UI test | Same as above for the manager role |
| 6 | `x-pack/platform/test/functional/apps/transform/actions/deleting.ts` | test | Delete action: disabled while continuous+started, stop → delete modal → row gone (3 config variants) | 3 (1 `it` × 3 data) | medium | UI test | Modal/action-state flow is UI-only; deletion outcome already API-covered — keep slim UI assertions |
| 7 | `x-pack/platform/test/functional/apps/transform/actions/resetting.ts` | test | Reset action: disabled while started, stop → reset modal → reset message in expanded row (3 variants) | 3 (1 × 3) | medium | UI test | Same pattern as deleting |
| 8 | `x-pack/platform/test/functional/apps/transform/actions/starting.ts` | test | Start action + confirm modal; health label/description in row and expanded row incl. unhealthy (yellow) transform (5 variants) | 5 (1 × 5) | medium | UI test | Health badge/expanded-row rendering is UI-only; includes deliberately-broken transform (script error) |
| 9 | `x-pack/platform/test/functional/apps/transform/edit_clone/editing.ts` | test | Edit flyout: update description/docs-per-second/frequency/retries/retention policy, verify row + messages + JSON tab (2 variants) | 6 (3 × 2) | medium | UI test | Flyout form interactions and expanded-row verification; update endpoint API-covered |
| 10 | `x-pack/platform/test/functional/apps/transform/actions/reauthorizing.ts` | test | Transforms created via API-key secondary auth by lower-privileged user; reauthorize callout, action enabled/disabled matrix, reauthorize flow (4 variants) | 4 (1 × 4) | complex | UI test | Callout + per-user action state is UI-only; reauthorize endpoint itself API-covered |
| 11 | `x-pack/platform/test/functional/apps/transform/permissions/index.ts` | index | Creates transform roles/users, loads `ml/ecommerce` archive, loads 2 suites | - | - | split | Hook logic moves to spec-level setup / global setup |
| 12 | `x-pack/platform/test/functional/apps/transform/actions/index.ts` | index | Same shared setup, loads 4 action suites | - | - | split | Same |
| 13 | `x-pack/platform/test/functional/apps/transform/edit_clone/index.ts` | index | Same shared setup, loads cloning + editing | - | - | split | Same |
| 14 | `x-pack/platform/test/functional/apps/transform/creation/index_pattern/index.ts` | index | Same shared setup, loads 3 creation suites | - | - | split | Same |
| 15 | `x-pack/platform/test/functional/apps/transform/creation/runtime_mappings_saved_search/index.ts` | index | Roles/users + `ml/farequote` archive, loads 2 suites | - | - | split | Same |
| 16 | `x-pack/platform/test/functional/apps/transform/helpers.ts` | helper | Test-data types + `getPivotTransformConfig`/`getLatestTransformConfig` generators | - | - | port as helper | Reuse alongside the existing Scout `api/helpers/transform_config.ts` |
| 17 | `x-pack/platform/test/functional/apps/transform/creation/runtime_mappings_saved_search/creation_saved_search.ts` | test | Full wizard from a saved search (filtered source): filtered preview, query input hidden, create+start, list verification (pivot + latest) | 6 (3 × 2) | complex | UI test | End-to-end wizard journey; core product flow |
| 18 | `x-pack/platform/test/functional/apps/transform/creation/runtime_mappings_saved_search/creation_runtime_mappings.ts` | test | Full wizard with runtime mappings editor: histograms, previews, create+start, Discover shows runtime fields (pivot + latest) | 6 (3 × 2) | complex | UI test | End-to-end wizard journey incl. Discover handoff |
| 19 | `x-pack/platform/test/functional/apps/transform/edit_clone/cloning.ts` | test | Clone action pre-fills wizard (plain, runtime mappings, bool/term/exists filter aggs, latest), create + verify (4 variants) | 12 (3 × 4) | complex | UI test | Pre-fill fidelity is UI-only; large data matrix, keep all 4 variants (each exercises distinct config shapes) |
| 20 | `x-pack/platform/test/functional/apps/transform/creation/index_pattern/creation_index_pattern.ts` | test | Full wizard from data view: date picker, index preview, histogram charts w/ canvas color stats, field-stats flyouts, nested filter aggs, advanced editor, retries validation, create+start, Discover verification (3 pivot + 1 latest) | 12 (3 × 4) | complex | UI test | The flagship wizard journey; canvas color-stat assertions need a decision (see §8/§9) |
| 21 | `x-pack/platform/test/functional/apps/transform/creation/index_pattern/continuous_transform.ts` | test | Continuous transforms from Kibana sample data (recent timestamps): wizard + continuous switch, stop, Discover, reset, restart (pivot + latest) | 10 (5 × 2) | complex | UI test | Continuous lifecycle through the UI; needs sample-data ingestion because sync requires recent timestamps |
| 22 | `x-pack/platform/test/accessibility/apps/group2/transform.ts` | test | a11y snapshots across list page + each wizard step (pivot and latest), incl. run + return to list | 13 | complex | merge into UI specs | Per Scout maintainer guidance (dmlemeshko, PR #281288): avoid standalone a11y specs — add `page.checkA11y()` inside `test.step` blocks of the migrated creation-wizard + list functional specs (which already walk these states). Reference: `src/platform/plugins/shared/discover/test/scout/metrics_experience/ui/parallel_tests/flyout_persistence.spec.ts` |
| 23 | `x-pack/platform/test/functional_basic/apps/transform/**` (5 configs + 5 index wrappers + `config.base.ts`) | config/index | Re-runs the exact same functional suites (via `loadTestFile` into `../../functional/apps/transform/*`) against ES `license: basic` (+ tags `skipFirefox`, `skipFIPS`) | - | - | drop (deliberate) | See "Tests to drop"; no basic-license Scout config set exists and duplicating every suite contradicts Scout batching. Coverage change documented below |

### Proposed file splits

Files that test multiple roles or unrelated flows and should become separate specs (final naming is the executor's call):

- `creation/index_pattern/creation_index_pattern.ts` (4 data variants × 3 sequential `it`s), split into:
  - pivot wizard spec (covering the richest pivot variant end-to-end + retries validation; the remaining two pivot variants add only different agg types — fold their unique agg/percentiles/terms-agg configuration into the same spec or a second slim spec rather than 3 full journeys)
  - latest-function wizard spec (unique keys, sort, data view time field, retries error case)
- `creation/index_pattern/continuous_transform.ts`, split into: continuous pivot spec and continuous latest spec (each is a full journey: create → stop → discover → reset → restart).
- `creation/runtime_mappings_saved_search/creation_runtime_mappings.ts`, split into pivot and latest runtime-mappings specs.
- `creation/runtime_mappings_saved_search/creation_saved_search.ts`, split into pivot and latest saved-search specs.
- `edit_clone/cloning.ts` (4 variants), split into: plain pivot clone, runtime-mappings clone, filter-aggs clone, latest clone.
- `edit_clone/editing.ts` (2 variants), split into: edit pivot spec, edit latest (retention policy) spec.
- `actions/*.ts`: each file keeps its data variants but each variant becomes one `test()` (batch vs continuous behaviors differ, so the current `if (mode === 'continuous')` branches become separate tests).
- `permissions/*`: two specs (one per role), each covering empty state + with-data state; fold the serverless `transform_list.ts` list-rendering assertions into these with deployment-agnostic tags.

### Tests to drop

- `x-pack/platform/test/functional_basic/apps/transform/**`: the entire basic-license mirror tree. It contains **zero unique test code** — every `index.ts` just `loadTestFile`s the trial-license suites and every config swaps the ES license to `basic`. Recommendation: do **not** duplicate suites or add a basic-license Scout config set now. **Coverage lost**: regressions that only manifest under a basic license (e.g. license checks accidentally gating transform UI features) would no longer be caught by UI tests. Mitigation options if the team wants it back: a single basic-license smoke spec under a new `basic_license` Scout server config set (custom config sets don't run on Cloud and add CI cost — last resort), or rely on license-checking unit tests in the plugin. `NEEDS VERIFICATION`: product/team confirmation that dropping dedicated basic-license UI runs is acceptable (transform is available at basic license, so this is a real, if historically quiet, coverage line).
- Histogram-chart **color-stats** assertions inside `creation_index_pattern.ts` and `creation_runtime_mappings.ts` (`transform.wizard.assertIndexPreviewHistogramCharts` with `colorStats`, backed by the FTR `canvasElement` service with anti-aliasing disabling): no Scout equivalent exists for canvas pixel-color sampling. Keep the structural assertions (chart present, legend text per column) and drop the pixel-percentage checks. **Coverage lost**: rendering-level regressions in the histogram bars' color split (already brittle/sampling-dependent per in-file comments). `NEEDS VERIFICATION`: whether the ML/Transform team wants a replacement (e.g. screenshot testing) before sign-off.

### Tests to defer

- None. (Everything else is migratable with existing Scout capabilities.)

---

## 2. Test type routing

### UI tests

All target specs live under `x-pack/platform/plugins/private/transform/test/scout/ui/tests/` (sequential; see §3).

| FTR file | Proposed spec path (under `test/scout/ui/tests/`) | Key flows covered |
|----------|--------------------|-------------------|
| `permissions/full_transform_access.ts` (+ serverless `transform_list.ts` merge) | `permissions_full_access.spec.ts` | Empty state, enabled create button, per-action enabled/disabled matrix, edit flyout control states, expanded row; serverless: list renders, data-tier options hidden |
| `permissions/read_transform_access.ts` | `permissions_read_access.spec.ts` | Viewer empty state, disabled create, disabled actions popover, expanded row readable |
| `actions/deleting.ts` | `actions_deleting.spec.ts` | Delete disabled for running continuous, stop, delete modal, row removed |
| `actions/resetting.ts` | `actions_resetting.spec.ts` | Reset disabled for running continuous, stop, reset modal, reset message in messages tab |
| `actions/starting.ts` | `actions_starting.spec.ts` | Start + confirm modal, progress, health label/description incl. yellow health |
| `actions/reauthorizing.ts` | `actions_reauthorizing.spec.ts` | Reauthorize callout, per-user action state, reauthorize confirm, health goes green, action disappears |
| `edit_clone/editing.ts` | `editing_pivot.spec.ts`, `editing_latest.spec.ts` | Edit flyout fields, retention policy toggle, update, row/messages/JSON verification |
| `edit_clone/cloning.ts` | `cloning_pivot.spec.ts`, `cloning_runtime_mappings.spec.ts`, `cloning_filter_aggs.spec.ts`, `cloning_latest.spec.ts` | Clone pre-fill fidelity (group-bys, aggs incl. nested/bool/exists filters, runtime mappings, retention policy, advanced settings), create clone |
| `creation/index_pattern/creation_index_pattern.ts` (+ a11y wizard snapshots) | `creation_wizard_pivot.spec.ts`, `creation_wizard_latest.spec.ts` | Source selection, date picker/full data, index preview, histogram charts (structural), field-stats flyouts, group-by/agg comboboxes incl. sub-aggs, advanced pivot editor, details step, retries validation, create+start, list row, Discover handoff; `page.checkA11y()` inside the relevant `test.step`s |
| `creation/index_pattern/wizard_max_page_search_size_reset.ts` | `creation_wizard_max_page_search_size.spec.ts` | `max_page_search_size` default reset switching pivot↔latest |
| `creation/index_pattern/continuous_transform.ts` | `creation_continuous_pivot.spec.ts`, `creation_continuous_latest.spec.ts` | Continuous mode switch + date field, create+start (no progress bar), stop, Discover, reset, restart |
| `creation/runtime_mappings_saved_search/creation_runtime_mappings.ts` | `creation_runtime_mappings.spec.ts` (pivot + latest as two tests or two specs) | Runtime mappings editor, previews include runtime columns, Discover shows runtime fields |
| `creation/runtime_mappings_saved_search/creation_saved_search.ts` | `creation_saved_search.spec.ts` | Saved-search source: filtered preview, query input hidden, full journey |
| serverless `search_bar_features.ts` | `serverless_search_bar.spec.ts` (serverless-only tags) | Serverless nav search surfaces "Data / Transforms" |
| a11y `transform.ts` | merged into the creation-wizard + list functional specs via `page.checkA11y()` inside `test.step` | a11y checks at each state the functional journey already walks: empty list page, source-selection modal, wizard define step (empty + loaded preview), pivot preview, JSON editor, details step, create step, post-create list — for both pivot and latest |

### API tests

None — all API-shaped coverage already exists in `test/scout/api` (see dedupe context). No FTR file in scope downgrades cleanly to a pure API test: each remaining file asserts UI affordances.

### Unit tests (RTL/Jest)

None proposed as a migration target. One candidate flagged but **not** recommended now: `wizard_max_page_search_size_reset.ts` tests client-side form-state logic, but reproducing the wizard's step context in RTL requires substantial provider/API mocking; keeping it as a cheap 2-test UI spec preserves intent at lower cost. Revisit only if the team extracts the reset logic into a testable reducer.

---

## 3. Parallelism plan

### Parallel-safe (can be space-isolated)

| Proposed spec | Why parallel-safe |
|--------------|------------------|
| `serverless_search_bar.spec.ts` | Read-only nav search; no data mutations |

### Must be sequential

Everything else. Transforms are **cluster-level resources**: the transform list page shows all transforms in the cluster (no space scoping), specs assert filtered row **counts** (`filterWithSearchString(id, 1)`, `clearSearchString(testDataList.length)`), the empty-state tests require **zero transforms in the cluster**, and the shared cleanup helper (`cleanTransformIndices`) stops and deletes **every** transform plus `.transform-notifications-*` indices — running two workers would destroy each other's fixtures.

| Proposed spec (group) | Why sequential |
|--------------|---------------|
| `permissions_*` | Requires empty cluster state ("no transforms found") and exact row counts |
| `actions_*` | Creates/starts/stops/deletes cluster-level transforms; `cleanTransformIndices` wipes all transforms |
| `editing_*`, `cloning_*` | Same shared transform list + destructive cleanup |
| `creation_*` | Creates and runs transforms; `assertTransformsTableExists` vs empty-state depends on global state; continuous specs additionally install/remove sample data; the merged `page.checkA11y()` calls run inline in these specs (no separate a11y worker) |

Recommendation: use the sequential `tests/` directory (not `parallel_tests/`), single worker, with per-spec unique transform-id prefixes (already the FTR pattern via `Date.now()` + prefix) and per-spec cleanup that deletes only its own transforms where possible — reserve `cleanTransformIndices` for the empty-state permissions specs and suite teardown. `NEEDS VERIFICATION`: whether solutions auto-create transforms on the Scout serverless projects (the FTR comments warn "Solutions might set up transforms automatically" — this drove the empty-or-table conditional in the serverless list test and the `cleanTransformIndices` calls in permissions specs; on serverless the empty-state assertions may need the same tolerant handling or serverless-specific skips).

---

## 4. Test data and setup

### Archives inventory

| Archive path | Contents | Size | Used by (files) | Verdict |
|-------------|----------|------|-----------------|---------|
| `x-pack/platform/test/fixtures/es_archives/ml/ecommerce` | `ft_ecommerce` index (ecommerce docs, fixed Jun–Jul 2023 dates) | ~1MB | actions (4), edit_clone (2), permissions (2), creation/index_pattern (2 of 3), a11y | Keep — load once via `globalSetupHook` (`loadIfNeeded`), same pattern as the existing Scout API suite's `global.setup.ts` |
| `x-pack/platform/test/fixtures/es_archives/ml/farequote` | `ft_farequote` index (airline/responsetime docs, Feb 2016 dates) | ~1.3MB | creation/runtime_mappings_saved_search (2) | Keep — load in the same global setup (also already loaded by the Scout API suite) |
| Kibana sample data `ecommerce` (installed via `POST /api/sample_data/ecommerce`, not an archive) | `kibana_sample_data_ecommerce` with **install-time-relative** timestamps | n/a | `continuous_transform.ts` | Keep — continuous (`sync`) transforms need timestamps near `now`; static archives can't provide that. Install/uninstall via API within the continuous specs |
| `x-pack/platform/test/fixtures/es_archives/logstash_functional` + `kbn_archives/visualize/default` | logstash indices + saved objects | large | serverless `transform_list.ts` only | Drop — after the merge, the migrated specs use `ft_ecommerce`; the logstash data was only a generic source for the wizard-open smoke |

### UI settings mutations

| FTR call | Semantics | Files |
|----------|-----------|-------|
| `transform.testResources.setKibanaTimeZoneToUTC()` (`kibanaServer.uiSettings.update({'dateFormat:tz': 'UTC'})`) | Selective set | every suite's `before` (e.g. `actions/deleting.ts:75`, `creation_index_pattern.ts:22`) — expected time strings (`'Jun 12, 2023 @ 00:04:19.000'`, Discover hit counts by date) depend on it |
| `transform.testResources.resetKibanaTimeZone()` | Selective delete | only `accessibility/apps/group2/transform.ts:100` — the functional suites never reset it (relying on the base config default `'dateFormat:tz': 'UTC'`) |
| `esArchiver.emptyKibanaIndex()` | **Wipes all saved objects** | `continuous_transform.ts:27` — heavy-handed; in Scout replace with targeted cleanup (delete sample-data saved objects / data views) |

### Shared constants to extract

| Value | Occurrences | Current locations |
|-------|-------------|-------------------|
| `'ft_ecommerce'` + time field `'order_date'` | 9 files | `actions/*.ts`, `edit_clone/*.ts`, `permissions/*.ts`, `creation_index_pattern.ts`, a11y |
| `'ft_farequote'` + time field `'@timestamp'` | 2 files | `creation_runtime_mappings.ts:32`, `creation_saved_search.ts:19` |
| `getPivotTransformConfig` / `getLatestTransformConfig` generators | 7 files | `apps/transform/helpers.ts` — port into `test/scout/ui/fixtures/` (note: overlaps with existing `test/scout/api/helpers/transform_config.ts`; consider one shared helper under `test/scout/`) |
| Archive paths (`ml/ecommerce`, `ml/farequote`) | 5 index files + a11y | move into the UI global setup only |

### Fresh server required

- None strictly. But `permissions_*` empty-state tests and the merged serverless list test require **zero transforms in the cluster** at run time — order them first in the sequential run (or make them create-free and tolerate pre-existing transforms the way `transform_list.ts` does).

---

## 5. Auth and roles

### Role inventory

| Role name | Source | Privileges (summary) | Used by (files) | Scout role target | Notes |
|-----------|--------|---------------------|-----------------|-------------------|-------|
| `transform_source` | `services/transform/security_common.ts:27` | ES: `read`,`view_index_metadata` on `*` | composed into poweruser | fold into custom role | |
| `transform_dest` | `security_common.ts:33` | ES: `read`,`index`,`manage`,`delete` on `user-*` | composed into poweruser | fold into custom role | |
| `transform_dest_readonly` | `security_common.ts:40` | ES: `read` on `user-*` | composed into viewer | fold into custom role | |
| `transform_ui_extras` | `security_common.ts:47` | ES cluster: `monitor`,`read_pipeline` | composed into poweruser | fold into custom role | `read_pipeline` needed for ingest-pipeline select in edit flyout |
| `transform_poweruser` (user) | `security_common.ts:57` | `kibana_admin` + built-in `transform_admin` + the three roles above | all suites (login) | **reuse `TRANSFORM_USERS.transformManager`** from `test/scout/api/fixtures/constants.ts` via `browserAuth.loginWithCustomRole` | The Scout API suite already translated this (cluster: `manage_transform`,`monitor`,`read_pipeline`; same index privileges; Kibana `base:['all']`) |
| `transform_viewer` (user) | `security_common.ts:69` | `kibana_admin` + built-in `transform_user` + `transform_dest_readonly` | permissions/read, reauthorizing | **reuse `TRANSFORM_USERS.transformViewerUser`** (cluster: `monitor_transform`) | |
| `transform_unauthorized` (user) | `security_common.ts:75` | `kibana_admin` only | none of the in-scope UI files (only API suite) | already exists in Scout constants | no UI spec needed |
| `superuser` (via `security.testUser.setRoles(['superuser'])`) | `continuous_transform.ts:26` | full | sample-data install only | use an admin-privileged API call for sample-data install, then log in as transformManager | over-privilege is incidental (sample-data API needs broad rights) |
| serverless `loginAsAdmin` + `setRoles(['transform_user'])` | serverless `transform_list.ts:22-23` | operator/admin | serverless smoke | replace with the same custom-role login (`NEEDS VERIFICATION`: `loginWithCustomRole` availability/behavior on serverless targets for these ES-privilege-based roles) | the FTR test sets a role then logs in as admin anyway — the role assignment is dead weight |

### Over-privileged tests

| File | What it actually exercises | Suggested minimum privilege |
|------|---------------------------|----------------------------|
| serverless `transform_list.ts` | Renders list, opens wizard | transformManager custom role instead of admin |
| `continuous_transform.ts` (`superuser` for setup) | Sample-data install | admin only for the install step (API-side), transformManager for the UI journey |

Kibana-side, both custom roles carry `base: ['all']` (from `kibana_admin` in FTR / `base:['all']` in Scout constants) — broader than needed, but the permission behavior under test is driven by **ES cluster privileges** (`manage_transform` vs `monitor_transform`), so keeping the existing Scout role definitions is the pragmatic, already-reviewed choice.

### Roles deserving shared helpers (used in ≥3 files)

- `transformManager` (FTR poweruser): every spec — extend the UI fixture with `loginAsTransformManager()` mirroring the API suite's `samlAuth.asTransformManager`.
- `transformViewerUser`: 2 specs + reauthorizing — include in the same shared fixture.

### Special auth patterns

- **API-key secondary authorization** in `actions/reauthorizing.ts:49-54,131-150`: creates ES API keys per user (`security_common.createApiKeyForTransformUsers`), then creates transforms with an `es-secondary-authorization: ApiKey ...` header so the transform is "owned" by the lower-privileged user (driving the red-health/unauthorized state the UI must surface). Scout side: the API suite's `reauthorize_transforms.spec.ts` already does this via `requestAuth.getApiKeyForCustomRole` — reuse that pattern in the UI fixture. Cleanup invalidates **all** API keys in the cluster (`clearAllTransformApiKeys` queries and invalidates every key) — over-broad; scope to the created keys in Scout.

---

## 6. Reusability audit

### FTR services and page objects in use

| FTR name | What it does | Used by (files) | Scout equivalent exists? | Hidden assertions? | Recommended scope |
|----------|-------------|-----------------|-------------------------|-------------------|-------------------|
| `transform.api` (`services/transform/api.ts`, 322 ln) | ES-level transform CRUD, wait-for-state, `cleanTransformIndices`, index create/delete | all suites (setup/teardown) | **yes** — `test/scout/api/services/transform_api_service.ts` (verify it exposes create-and-run + wait helpers; extend if not) | yes (`expect` on status codes — acceptable for API service) | reuse/extend plugin-local Scout service |
| `transform.testResources` (ML `test_resources.ts`) | Data view create/delete, saved search create/delete, timezone set/reset | all suites | partial — Scout `apiServices`/kbnClient cover saved objects; no transform-specific wrapper | yes | plugin-local thin helpers over Scout core API services |
| `transform.securityCommon` (`security_common.ts`, 166 ln) | Roles/users/API keys | index files, reauthorizing, a11y | yes — Scout custom roles + `requestAuth` API keys | no | reuse Scout auth |
| `transform.securityUI` (`security_ui.ts`, 41 ln) | Login/logout via login page | all suites | yes — `browserAuth.loginWithCustomRole` (API-based, faster) | no | reuse Scout core |
| `transform.navigation` (`navigation.ts`, 25 ln) | `navigateToApp('transform')` (= `/app/management/data/transform`) | all suites | no transform page object | yes (`existOrFail`) | plugin-local page object |
| `transform.management` (`management.ts`, 76 ln) | List-page existence/empty-state/buttons/callout assertions | all suites | no | yes (every method) | plugin-local page object; return state, assert in specs |
| `transform.sourceSelection` (`source_selection.ts`, 34 ln) | Source (data view/saved search) picker modal | creation, cloning, a11y | no | yes | plugin-local page object |
| `transform.wizard` (`wizard.ts`, **1220 ln**) | Entire wizard: function selector, comboboxes, previews (EuiDataGrid), histogram charts (canvas color stats), ace editors, switches, accordions, create/start/progress | creation (4), cloning, a11y | no | yes, pervasive | plugin-local page object — the biggest single migration artifact; split into wizard-define / wizard-details / wizard-create sections |
| `transform.table` (`transform_table.ts`, **645 ln**) | Transform list table: search, refresh, row fields, row actions popover, confirm modals (start/stop/delete/reset/reauthorize), expanded row tabs (details/JSON/messages/preview/health) | actions, edit_clone, permissions, creation | no | yes, pervasive | plugin-local page object |
| `transform.editFlyout` (`edit_flyout.ts`, 157 ln) | Edit flyout inputs/accordions/retention policy/update | editing, permissions/full | no | yes | plugin-local page object |
| `transform.datePicker` (`date_picker.ts`, 99 ln) | Super date picker quick select (incl. new `dateRangePickerControlButton` variant), full-data button, data-tier options | creation, cloning, a11y, serverless list | partial — kbn-scout has `date_picker.ts` page object (`NEEDS VERIFICATION`: covers quick-select-by-unit and "use full data" + data-tier popover) | yes | reuse core where possible; plugin-local for `mlDatePickerUseFullDataButton`/data-tier assertions (component lives in an ML shared package) |
| `transform.discover` (`discover.ts`, 51 ln) | Discover hit-count assertions post-handoff | creation | partial — kbn-scout `discover_app.ts` | yes | reuse core + tiny plugin-local additions |
| `transform.testExecution` (`test_execution.ts`, 18 ln) | `logTestStep` logging | all | yes — Playwright `test.step` | no | drop; use `test.step` |
| `transform.alerting` (`alerting.ts`, 59 ln) | Transform health rule helpers | **not used** by in-scope files (only `screenshot_creation/apps/transform_docs`) | n/a | n/a | out of scope — do not port |
| `canvasElement` service | Canvas pixel color sampling + anti-aliasing toggling | `creation_index_pattern.ts:585-599`, `creation_runtime_mappings.ts` (via wizard) | **no** | no | drop color-stat assertions (see §1 "Tests to drop") |
| `sampleData.testResources` | Install/remove Kibana sample data via API | `continuous_transform.ts:28` | no dedicated fixture; plain `POST /api/sample_data/ecommerce` via Scout API client | no | inline API call or tiny helper |
| `PageObjects.discover.waitUntilSearchingHasFinished` | Discover ready-wait | creation specs | yes (Scout discover page object) | yes | reuse core |
| serverless `svlCommonNavigation.search` | Serverless nav search | `search_bar_features.ts` | `NEEDS VERIFICATION`: Scout equivalent for the serverless side-nav search popover | yes | if missing, plugin-local minimal locators (it's 3 test-subj interactions) |

### EUI components interacted with directly

| Component | Interaction pattern | Files |
|----------|-------------------|-------|
| `EuiComboBox` | set/get selected options (group-by, aggs, unique keys, sort field, ingest pipeline, retention field) | `wizard.ts:393-560`, `edit_flyout.ts` |
| `EuiDataGrid` | column count via `.euiDataGridHeaderCell__content`, cell values, virtualization limits (assertions commented out due to elastic/eui#4470) | `wizard.ts:202+`, `transform_table.ts` (expanded-row preview) |
| `EuiInMemoryTable` + search bar | filter by search string, row counts, expanded rows | `transform_table.ts:88-160` |
| `EuiSuperDatePicker` (+ ML `DatePickerWrapper`) | quick select, absolute range, "Use full data", data-tier options popover | `date_picker.ts` |
| `EuiSwitch` | advanced editors, continuous mode, create-data-view, dest-same-as-id, retention policy | `wizard.ts` throughout |
| `EuiAccordion` | advanced settings (details + summary), edit flyout sections | `wizard.ts`, `edit_flyout.ts` |
| Ace editor (`aceEditor` service) | advanced pivot editor, runtime mappings editor content get/set | `wizard.ts:344-356,657` — check current source: if the wizard now renders Monaco (`kbn-monaco`), use Scout's Monaco helpers; `NEEDS VERIFICATION` which editor the wizard uses today |
| `EuiPopover` (row actions) | open actions menu, per-action enabled state, ESC to close (`browser.pressKeys(ESCAPE)` at `transform_table.ts:418`) | `transform_table.ts` |
| `EuiConfirmModal` | start/stop/delete/reset/reauthorize confirmations | `transform_table.ts` |
| Toasts | `assertErrorToastsNotExist` | `wizard.ts` |

Executor note: use Scout's `page.components.*` EUI helpers rather than 1:1 porting FTR wrappers.

### Brittle locator strategies

| File | Line | Current locator | Target component |
|------|------|----------------|-----------------|
| `services/transform/date_picker.ts` | 46-47 | `find.selectValue('[aria-label*="Time value"]', ...)` / `[aria-label*="Time unit"]` | EUI quick-select selects (no test subj) — acceptable aria-based fallback; Scout date-picker helper may already cover it |
| `services/transform/wizard.ts` | 202 | `$('.euiDataGridHeaderCell__content')` class-based column count | EuiDataGrid header — use Scout data-grid helper |
| `services/transform/wizard.ts` | 221 | canvas color sampling via `canvasElement` | histogram charts — dropped (see above) |

Everything else is `data-test-subj`-driven (the transform UI is well instrumented); no source-code `data-test-subj` additions identified as required.

### Page objects with hidden assertions

| FTR helper | Method | Assertion | File:line |
|-----------|--------|-----------|-----------|
| `transform.management` | all `assert*` methods | `existOrFail`/`expect` | `management.ts` (whole file) |
| `transform.table` | `filterWithSearchString(filter, expectedRowCount)` | asserts exact filtered row count | `transform_table.ts:124` |
| `transform.table` | `assertTransformRowFields`, `assertTransformRowActionEnabled`, modal assert/confirm methods | `expect`/`existOrFail` inside retries | `transform_table.ts` throughout |
| `transform.wizard` | ~80 `assert*` methods (step active, preview loaded, switch states, editor content, retries value...) | `expect`/`existOrFail` | `wizard.ts` throughout |
| `transform.editFlyout` | `assertTransformEditFlyoutInputValue`, retention policy asserts | `expect` | `edit_flyout.ts` |
| `transform.api` | `assertResponseStatusCode` et al. | `expect` on HTTP status | `api.ts:35` |

Migration rule: page objects return state/locators; `expect` moves into specs.

---

## 7. Server configuration

### FTR server args (full chain)

| Arg | Source config | Category | Notes |
|-----|-------------|----------|-------|
| `xpack.security.authc.api_key.enabled=true` (ES) | `x-pack/platform/test/functional/config.base.ts:38` | already in Scout default | needed by reauthorizing (API keys) |
| `path.repo=/tmp/` (ES) | `config.base.ts:38` | not needed | snapshot tests only; transform unaffected |
| `--xpack.security.encryptionKey`, `--xpack.encryptedSavedObjects.encryptionKey` | `config.base.ts:49-50` | already in Scout default | |
| `--status.allowAnonymous`, `--server.uuid`, maps flags, discoverEnhanced flag, SO import payload/api flags, `--server.restrictInternalApis=false`, task-manager fleet exclusion | `config.base.ts:45-58` | not needed by transform | inherited platform noise; no transform test depends on them (`NEEDS VERIFICATION` at run time: internal `/internal/transform/*` calls are made by the UI itself, not the tests, so `restrictInternalApis` default in Scout is fine — the existing Scout API suite already passes with Scout defaults) |
| `uiSettings.defaults: 'dateFormat:tz': 'UTC'`, `accessibility:disableAnimations`, `hideAnnouncements` | `config.base.ts:64-72` | runtime-settable | set via Scout `uiSettings` fixture per suite (the specs' expected date strings require UTC) |
| ES `license: 'trial'` | `config.base.ts:36` | already in Scout default (`config_sets/default/stateful/base.config.ts:86`) | |
| ES `license: 'basic'` + `xpack.license.self_generated.type=basic` | `functional_basic/apps/transform/config.base.ts:20-24` | requires custom server config | **no existing Scout config set**; basic-license reruns dropped (deliberate, §1) |
| serverless `esGate` tag | serverless management `index.ts:12` | n/a | ES-gated CI grouping; Scout serverless targets handle this differently — no action |

### ES server args

| Arg | Source config | Notes |
|-----|-------------|-------|
| (none transform-specific) | - | Transform is enabled by default on trial/basic and on all serverless projects |

### Custom server config needed?

- Not for the migrated suites — Scout **default** servers config suffices for all specs in scope.
- Only the (dropped) basic-license reruns would need one (`license: basic`); revisit only if the team rejects the drop.

---

## 8. Deployment targets

| Proposed spec | Where it should run | Reasoning |
|--------------|--------------------|-----------| 
| `permissions_full_access.spec.ts`, `permissions_read_access.spec.ts` | everywhere (`tags.deploymentAgnostic`) | Transform list UI exists in stateful + all serverless projects; absorbs serverless `transform_list.ts` coverage. Serverless caveat: pre-existing solution-created transforms may break empty-state assertions — see §3 verification item |
| `actions_*.spec.ts` | everywhere | Actions UI identical across targets; API keys + secondary auth exist on serverless (`NEEDS VERIFICATION`: reauthorize flow on serverless — the FTR reauthorizing suite never ran there and the Scout API reauthorize spec is `tags.stateful.all` only) |
| `editing_*`, `cloning_*` | everywhere | Same UI in serverless management |
| `creation_wizard_*`, `creation_runtime_mappings`, `creation_saved_search`, `creation_wizard_max_page_search_size` | everywhere, with serverless-specific expectation for the data-tier options (hidden on serverless per `transform_list.ts:71`) | Wizard identical; only the ML date-picker data-tier popover differs |
| `creation_continuous_*` | everywhere (`NEEDS VERIFICATION`: sample-data API availability on serverless projects) | continuous transforms fully supported on serverless |
| `serverless_search_bar.spec.ts` | serverless only (all three projects) | stateful has no side-nav search of this kind |

Note: the FTR stateful suites today run **only stateful** (trial + basic); serverless UI coverage was just the two smoke files. Migrating with deployment-agnostic tags is a deliberate coverage **expansion** consistent with "the transform UI should work the same" comments in the basic-license wrappers.

### Stateful/serverless mirror FTR files

Searched by basename, `loadTestFile` references, `getService('transform')` usage and test titles across `x-pack/platform/test/**` and `x-pack/solutions/**`.

| Primary FTR file | Mirror FTR file | Similarity | Current tags/skips | Decision | Notes |
|------------------|-----------------|------------|--------------------|----------|-------|
| `x-pack/platform/test/functional/apps/transform/**` (all 13 test files) | `x-pack/platform/test/functional_basic/apps/transform/**` | identical (same files re-executed via `loadTestFile`, basic license) | basic side adds `skipFirefox`, `skipFIPS` | drop the basic side | See §1 drop rationale; delete the whole `functional_basic/apps/transform` tree + its 6 config entries in `.buildkite/ftr-manifests/ftr_platform_stateful_configs.yml` (lines 16, 209–213) when the functional side is removed (lines 285–289) |
| `permissions/*` + list assertions | `x-pack/platform/test/serverless/functional/test_suites/management/transforms/transform_list.ts` | divergent (smoke subset + serverless-only data-tier assertion) | `esGate` on serverless management index | merge into deployment-agnostic permissions/creation specs | Also remove the two `loadTestFile` entries in `test_suites/management/index.ts:15-16` |
| (none) | `x-pack/platform/test/serverless/functional/test_suites/management/transforms/search_bar_features.ts` | unique (serverless nav search) | `esGate` | keep as separate serverless-only Scout spec | |
| creation wizard suites | `x-pack/platform/test/accessibility/apps/group2/transform.ts` | near-identical wizard walk with `a11y.testAppSnapshot()` at each step | none | merge a11y checks into the functional wizard/list specs | Per Scout maintainer guidance (dmlemeshko, PR #281288), add `page.checkA11y()` inside the functional specs' `test.step` blocks rather than a standalone a11y spec. Remove `loadTestFile` entry in `accessibility/apps/group2/index.ts` on deletion |
| (out of scope, noted for completeness) | `x-pack/platform/test/screenshot_creation/apps/transform_docs/transform_alerts.ts` | different purpose (docs screenshots, transform health rules) | on-demand pipeline | keep FTR, untouched | Uses `transform.alerting` service — do not delete shared services it needs |

### Coverage gaps

- The migrated stateful-only suites (actions, edit/clone, creation, permissions) currently never run on serverless although the feature exists there — plan expands them via deployment-agnostic tags (see above).
- Inverse gap (context only): the existing Scout **API** suite is `tags.stateful.all` only, while transform APIs exist on serverless — out of scope here, but worth a follow-up.

### Cloud portability issues

| File | Line | Issue |
|------|------|-------|
| `creation/index_pattern/continuous_transform.ts` | 27 | `esArchiver.emptyKibanaIndex()` wipes all saved objects — unacceptable against shared/Cloud clusters; replace with targeted cleanup |
| `services/transform/api.ts` | 107-134 | `cleanTransformIndices` stops/deletes **every** transform in the cluster and deletes `.transform-notifications-*` — destructive on any shared cluster; scope to test-created transform IDs wherever possible |
| `services/transform/security_common.ts` | 134-144 | `clearAllTransformApiKeys` invalidates **all** API keys in the cluster — must be scoped to keys created by the test |
| `creation/index_pattern/creation_index_pattern.ts` | 119-121, 280 | Expected values hardcoded to archive content + UTC ('Jun 12, 2023 @ ...', `discoverQueryHits: '7,270'`) — portable only with the pinned archive + UTC uiSetting; keep both explicit in Scout |
| `actions/starting.ts` | 118-124 | Painless script referencing missing field to force yellow health — fine on Cloud, but depends on `deferValidation` create; no change needed |

No hardcoded localhost URLs, ports, or node-topology assumptions found in the in-scope files.

---

## 9. FTR test smells

| Smell | File | Lines | Description | Context |
|-------|------|-------|------------|---------|
| Conditional test logic | `actions/deleting.ts` / `actions/resetting.ts` | 98-110 / 100-110 | `if (mode === 'continuous')` inside `it` changes the flow (stop first) | Split batch vs continuous into separate `test()`s |
| Conditional test logic | `actions/reauthorizing.ts` | 194-213 | `if (reauthorizeEnabled) {...} else {...}` picks which assertions run | Split into "can reauthorize" and "cannot reauthorize" tests |
| Conditional test logic | serverless `transform_list.ts` | 57-64 | empty-state-or-table branch at runtime | Driven by unpredictable solution-created transforms; resolve via cleanup or explicit serverless expectation |
| Sequential journey as separate `it` blocks | all creation specs, `cloning.ts`, `editing.ts` | whole files | 3–5 `it`s forming one wizard/flyout journey sharing browser state | Merge each journey into a single Scout `test()` with `test.step`s |
| Shared mutable state | `actions/reauthorizing.ts` | 59, 131-137 | `apiKeysForTransformUsers` map populated in `before`, read in tests | Becomes fixture-provided state |
| Missing cleanup | `creation/index_pattern/continuous_transform.ts` | 32-35 | Sample data (`kibana_sample_data_ecommerce`) never uninstalled; `after` deletes data view `'ft_ecommerce'` which this suite never created (copy-paste) — sample-data indices/saved objects leak | Fix in migration: uninstall sample data + delete its dest artifacts |
| Missing cleanup | `actions/*`, `permissions/*`, `edit_clone/*` index hooks | index files | Roles/users created in `before`, never removed (only the a11y suite cleans them) | Scout custom-role login removes the need |
| Over-broad cleanup | `services/transform/api.ts` / `security_common.ts` | 107-134 / 134-144 | Deletes ALL transforms / invalidates ALL API keys | See Cloud portability; scope to owned resources |
| Over-privileged execution | `continuous_transform.ts` | 26 | `security.testUser.setRoles(['superuser'])` just to install sample data | Install via admin API call, run UI as transformManager |
| Over-privileged execution | serverless `transform_list.ts` | 22-23 | Sets `transform_user` role then logs in as admin anyway | Use custom role login |
| UI-based setup/teardown | all suites (`securityUI.loginAs*`) | before hooks | Login through the login page per suite (with forceLogout) — slow and a documented flakiness source ("Logout needs to happen before anything else to avoid flaky behavior", `full_transform_access.ts:26`) | Scout `browserAuth` is API-based |
| Retry wrappers | `services/transform/*` | pervasive | `retry.tryForTime` around nearly every assertion (incl. 2-minute waits for transform states) | Playwright auto-wait + explicit `expect.poll` for ES-side state |
| Global loading indicator waits | serverless `search_bar_features.ts` | 25, 44 | `header.waitUntilLoadingHasFinished()` | Replace with content-ready signals |
| Commented-out assertions (lost coverage) | `creation_index_pattern.ts`, `creation_saved_search.ts`, `creation_runtime_mappings.ts` | e.g. 707-712, 313-318, 381-386 | Preview column value assertions disabled due to EuiDataGrid cell virtualization (elastic/eui#4470) | Decide during execution whether Playwright can assert virtualized cells (scroll into view); otherwise document as known gap |
| Canvas pixel assertions | `creation_index_pattern.ts` | 584-599 | `canvasElement.disableAntiAliasing()` + color-percentage checks; in-file comments admit sampling variance | Dropped (§1) |
| Known-failing marker | `edit_clone/cloning.ts` | 188 | Comment `// Failing: See #165883` above an **unskipped** suite | `NEEDS VERIFICATION`: is issue 165883 resolved / is the suite currently stable in CI? |
| Count-coupled assertions | `actions/*` | e.g. `reauthorizing.ts:214` | `clearSearchString(testDataList.length)` asserts total row count equals suite's own fixtures | Breaks if any other transform exists; assert on filtered subsets instead |
| Duplicate journeys | `creation_index_pattern.ts` | testData 2 & 3 | Second and third pivot variants repeat the full 3-`it` journey only to vary agg types (percentiles/terms, exists-filter) | Fold unique agg interactions into one spec rather than 3 full wizard runs |

---

## 10. Migration batches

### Batch 1: List & permissions foundation (quick wins)

Builds the base UI fixture set: transform navigation, management/list page object, table basics, custom-role login helpers (reusing `TRANSFORM_USERS`), UI global setup (archives).

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 1 | `permissions_full_access.spec.ts` | `permissions/full_transform_access.ts` (+ serverless `transform_list.ts` merge) | medium | includes edit-flyout control-state checks; ordered first while cluster is transform-free |
| 2 | `permissions_read_access.spec.ts` | `permissions/read_transform_access.ts` | medium | viewer custom role |
| 3 | `serverless_search_bar.spec.ts` | serverless `search_bar_features.ts` | simple | serverless-only tags |

- **Human involvement**: `autopilot`
- **Dependencies**: none (creates navigation/management/table-lite page objects + auth fixture used by all later batches)
- **Blockers**: none

### Batch 2: Row actions

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 4 | `actions_deleting.spec.ts` | `actions/deleting.ts` | medium | needs row-actions popover + confirm-modal page-object methods |
| 5 | `actions_resetting.spec.ts` | `actions/resetting.ts` | medium | + expanded-row messages tab |
| 6 | `actions_starting.spec.ts` | `actions/starting.ts` | medium | + expanded-row health tab; yellow-health fixture via `deferValidation` create |
| 7 | `actions_reauthorizing.spec.ts` | `actions/reauthorizing.ts` | complex | needs API-key secondary-auth helper (port from Scout API suite); scoped key invalidation |

- **Human involvement**: `autopilot` for 4–6, `guided` for 7 (serverless behavior of reauthorize needs a human check — see §8)
- **Dependencies**: Batch 1 fixtures + full table page object (created here)
- **Blockers**: none

### Batch 3: Edit & clone

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 8 | `editing_pivot.spec.ts`, `editing_latest.spec.ts` | `edit_clone/editing.ts` | medium | edit-flyout page object (started in batch 1) completed here |
| 9 | `cloning_pivot.spec.ts`, `cloning_runtime_mappings.spec.ts`, `cloning_filter_aggs.spec.ts`, `cloning_latest.spec.ts` | `edit_clone/cloning.ts` | complex | first consumer of the wizard page object (read/assert mode); verify #165883 stability first |

- **Human involvement**: `guided` (wizard page-object design decisions; cloning flakiness history)
- **Dependencies**: Batch 2 table page object; wizard page object (define-step read/assert subset created here)
- **Blockers**: `NEEDS VERIFICATION` on issue #165883 status before porting cloning 1:1

### Batch 4: Creation wizard journeys (+ merged a11y checks)

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 10 | `creation_wizard_max_page_search_size.spec.ts` | `wizard_max_page_search_size_reset.ts` | simple | cheap once wizard page object exists |
| 11 | `creation_wizard_pivot.spec.ts`, `creation_wizard_latest.spec.ts` | `creation_index_pattern.ts` + a11y `transform.ts` | complex | full wizard write-mode page object; add `page.checkA11y()` inside the relevant `test.step`s to cover the 13 a11y snapshot states (list, source modal, define/pivot-preview/JSON-editor/details/create steps, post-create list — pivot + latest); drop canvas color stats; fold duplicate pivot variants |
| 12 | `creation_saved_search.spec.ts` | `creation_saved_search.ts` | complex | saved-search fixture via kbnClient |
| 13 | `creation_runtime_mappings.spec.ts` | `creation_runtime_mappings.ts` | complex | runtime-mappings editor helper (ace vs Monaco — verify) |
| 14 | `creation_continuous_pivot.spec.ts`, `creation_continuous_latest.spec.ts` | `continuous_transform.ts` | complex | sample-data install/uninstall helper; fix leaked-cleanup bug; explicit dest-index mappings for latest |

- **Human involvement**: `guided` → `hands-on` for 11 (a11y `test.step` placement, histogram-assertion replacement decision, variant folding needs reviewer sign-off)
- **Dependencies**: Batches 1–3 (all page objects)
- **Blockers**: decisions on canvas color-stat drop and EuiDataGrid virtualized-cell assertions

### Cleanup (after all batches pass)

Delete: `x-pack/platform/test/functional/apps/transform/**`, `x-pack/platform/test/functional_basic/apps/transform/**`, `x-pack/platform/test/serverless/functional/test_suites/management/transforms/**` (+ index entries), `x-pack/platform/test/accessibility/apps/group2/transform.ts` (+ index entry), the 11 manifest lines in `.buildkite/ftr-manifests/ftr_platform_stateful_configs.yml`, and the `services/transform/*` providers **except** what `screenshot_creation/apps/transform_docs` still imports (`transform.alerting`, wizard, table, api — verify usage before deleting shared services). `NEEDS VERIFICATION`: full consumer list of `getService('transform')` outside the deleted trees (known consumers: `screenshot_creation/apps/transform_docs/transform_alerts.ts`; ML suites use their own `ml` service).

### Scout CI registration (do in the PR that adds the first Scout config)

Required for CI to discover and run the new specs — do once per plugin, and re-run whenever specs or tags change (kapral18, PR #281731 — committing it avoids a later metadata-cleanup PR):

- Add the plugin under `plugins.enabled` (alphabetical) in `.buildkite/scout_ci_config.yml`.
- Regenerate and commit the Scout test-config manifest: `node scripts/scout.js update-test-config-manifests --includingUpToDate --noSummary`. Commit only this plugin's `test/scout/.meta/**`; the command also regenerates other plugins' manifests, so revert that unrelated drift (`git checkout -- <paths>`) before staging.
- Verify discovery finds the config: `node scripts/scout discover-playwright-configs --target local-stateful-only --configs x-pack/platform/plugins/private/transform/test/scout/ui/playwright.config.ts` (expect "Found Playwright config files in 1 plugin(s)").

---

## 11. Effort summary

| Metric | Value |
|--------|-------|
| Total FTR test files analyzed | 16 test files (+5 index, +11 configs, +1 helper, +14 service files) |
| > UI tests | 15 (13 stateful + 2 serverless; a11y checks merged into the wizard/list specs, no standalone a11y spec) |
| > API tests | 0 (all pre-existing) |
| > Unit tests (RTL/Jest) | 0 |
| > Dropped | basic-license mirror tree (no unique code) + canvas color-stat assertions |
| > Deferred | 0 |
| New page objects needed | 6 plugin-local (navigation/management, table, wizard [large], edit flyout, source selection, date-picker extras) |
| New API services needed | 0-1 (extend existing Scout `transform_api_service` with create-and-run/wait-for-state; sample-data helper) |
| `data-test-subj` additions to source code | 0 identified |
| Custom server config sets | 0 new / 0 reused (default only) |
| Migration batches | 4 + cleanup |

### Risks and open questions

- `NEEDS VERIFICATION` — basic-license drop: team sign-off that dropping the dedicated basic-license UI reruns is acceptable (no Scout basic-license config set exists; transform is a basic-license feature).
- `NEEDS VERIFICATION` — `edit_clone/cloning.ts` carries a `// Failing: See #165883` comment on an unskipped suite; confirm current CI stability before porting.
- `NEEDS VERIFICATION` — canvas histogram color-stat assertions have no Scout equivalent; confirm dropping them (structural chart assertions retained) or define a replacement.
- `NEEDS VERIFICATION` — solution-auto-created transforms on serverless (FTR comments) may break empty-state/row-count assertions when the suites are expanded to serverless.
- `NEEDS VERIFICATION` — reauthorize flow (API keys + `es-secondary-authorization`) on serverless targets; the Scout API reauthorize spec is stateful-only today.
- `NEEDS VERIFICATION` — `browserAuth.loginWithCustomRole` support for these ES-cluster-privilege roles on serverless projects.
- `NEEDS VERIFICATION` — wizard advanced editors: FTR drives them via the `aceEditor` service; confirm whether the current UI uses Ace or Monaco and which Scout helper applies.
- `NEEDS VERIFICATION` — kbn-scout `date_picker.ts` page object coverage for quick-select units, "Use full data" button and data-tier options popover (ML shared date-picker component).
- `NEEDS VERIFICATION` — serverless nav-search page-object equivalent for `search_bar_features.ts`.
- `NEEDS VERIFICATION` — Kibana sample-data install API availability/permissions on serverless projects (continuous specs).
- `NEEDS VERIFICATION` — remaining consumers of the FTR `transform` service before deleting `services/transform/*` (screenshot_creation suite must keep working).
- Decision for human sign-off: folding the 3 pivot wizard variants of `creation_index_pattern.ts` into fewer journeys (keeps unique agg interactions, cuts ~2 full wizard runs).
- a11y checks are merged into the functional wizard/list specs via `page.checkA11y()` in `test.step` blocks (per Scout maintainer guidance, PR #281288) — they inherit their host spec's deployment tags, so no separate a11y-tag decision is needed.
- Decision for human sign-off: sequential single-worker execution for the whole UI suite (cluster-level transforms; destructive shared cleanup helpers).
