# FTR to Scout Migration Plan

| Field | Value |
|-------|-------|
| Source | `x-pack/platform/test/functional/apps/remote_clusters` (+ `x-pack/platform/test/accessibility/apps/group3/remote_clusters.ts`) |
| Target module root | `x-pack/platform/plugins/private/remote_clusters` (Scout tests under `test/scout/ui` — does not exist yet, no prior Scout coverage in this plugin) |
| Generated | 2026-07-29 |
| Deployment targets | stateful only (Remote Clusters UI is disabled in serverless — asserted by `x-pack/platform/test/serverless/functional/test_suites/management/disabled_uis.ts:31-32`) |
| FTR config chain | UI suite: `apps/remote_clusters/config.ts` > `x-pack/platform/test/functional/config.base.ts` • CCS suite: `x-pack/platform/test/functional/config.ccs.ts` > `config.base.ts` • a11y suite: `x-pack/platform/test/accessibility/apps/group3/config.ts` > `config.base.ts` |

**Issue context**: elastic/kibana#281246 marks this suite as a defer candidate due to remote-cluster topology requirements. **Finding of this plan: 3 of 4 source files do NOT need a live remote cluster and are migratable today.** They register remote-cluster *configuration* pointing at fake/unreachable hosts (`test:9400`, `127.0.0.1:9301/9302`) via the UI wizard or `cluster.putSettings`; ES accepts these without a reachable remote, and none of the assertions depend on a connected remote. Only the CCS flow file (`ccs/remote_clusters_index_management_flow.ts`) genuinely requires a second live ES cluster and must be deferred (see "Tests to defer").

---

## 1. Test inventory

Sorted by estimated complexity (simple to complex).

| # | FTR file (relative) | Type | Description | `it` count | Complexity | Decision | Justification |
|---|---------------------|------|-------------|-----------|------------|----------|---------------|
| 1 | `x-pack/platform/test/functional/apps/remote_clusters/index.ts` | index | Loads `home_page` and `remote_clusters`; no shared hooks | - | - | split | Each `loadTestFile` target folds into the new CRUD spec |
| 2 | `x-pack/platform/test/functional/apps/remote_clusters/home_page.ts` | test | App loads; empty-state create button is displayed | 1 | simple | UI test (merge) | Single trivial assertion; becomes the empty-state step of the CRUD spec |
| 3 | `x-pack/platform/test/functional/apps/remote_clusters/config.ts` | config | Plain wrapper over `config.base.ts`, no extra server args | - | - | - | Scout default servers config suffices |
| 4 | `x-pack/platform/test/functional/apps/remote_clusters/remote_clusters.ts` | test | Adds a remote cluster via the 3-step wizard (fake host `test:9400`), asserts details flyout name + seeds/proxy address; cleans up via `cluster.putSettings` | 1 | simple | UI test | Real user journey through the add wizard; no live remote needed (ES accepts unreachable seeds) |
| 5 | `x-pack/platform/test/accessibility/apps/group3/remote_clusters.ts` | test | a11y snapshots of: empty list, add-wizard trust/form/review steps, request flyout, list with clusters, details flyout, delete modal, edit form (sniff + proxy modes, seeded via `cluster.putSettings` with fake local addresses) | 13 | medium | UI test (merge a11y into functional specs) | a11y checks fold into the functional specs as `page.checkA11y()` calls inside `test.step` blocks at each of the 13 states — Scout maintainer guidance (dmlemeshko, PR #281288): avoid standalone a11y specs, add checks in existing functional tests. Reference: `src/platform/plugins/shared/discover/test/scout/metrics_experience/ui/parallel_tests/flyout_persistence.spec.ts`. The edit/delete/request-flyout flows (covered today only as a11y snapshots) become functional assertions in the same specs that carry the a11y checks — one merged outcome, no separate a11y spec |
| 6 | `x-pack/platform/test/functional/apps/remote_clusters/ccs/remote_clusters_index_management_flow.ts` | test | With a real second ES cluster (`ftr-remote`): verifies Connected status in the list, creates a follower index via CCR UI wizard, verifies replication in Index Management | 3 | complex | defer (partial salvage possible) | Requires `remoteEs` service and `esTestCluster.ccs.remoteClusterUrl` — Scout cannot start a second stateful cluster (see "Tests to defer") |

### Tests to defer

- `x-pack/platform/test/functional/apps/remote_clusters/ccs/remote_clusters_index_management_flow.ts`: blocked by **missing Scout support for a second (remote) stateful ES cluster**. Tracked in the deferred-CCS umbrella issue #281791. Evidence:
  - The FTR CCS config (`x-pack/platform/test/functional/config.ccs.ts:46-59`) sets `esTestCluster.ccs.remoteClusterUrl` and registers `remoteEs` / `remoteEsArchiver` services; the FTR runner starts/attaches a second cluster from that key.
  - Scout's server-config schema *accepts* `esTestCluster.ccs.remoteClusterUrl` (`src/platform/packages/shared/kbn-scout/src/servers/configs/schema/schema.ts:88-92`) but `runElasticsearch` never reads it (`src/platform/packages/shared/kbn-scout/src/servers/run_elasticsearch.ts` — the only multi-cluster path is serverless CPS `linkedProject`, lines 91-107). No `remoteEs` fixture exists in `kbn-scout`.
  - No Scout server config set under `src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/` provides a remote cluster.
  - **Coverage lost and where it moves**:
    - *"Verify ftr-remote remote cluster exists / Connected"* (lines 41-52) — **recoverable today** using the self-referential-remote pattern already proven in `x-pack/platform/plugins/private/cross_cluster_replication/test/scout/ui/tests/cross_cluster_replication_with_data.spec.ts:34-96` (register the local node's transport publish address as a remote seed; the remote genuinely reports `connected: true`). Proposed as an optional test in the edit/delete spec (batch 2).
    - *"Create Follower Index"* via CCR wizard (lines 66-74) — belongs to the `cross_cluster_replication` plugin, not `remote_clusters`; CCR already has Scout coverage that provisions followers against a self-remote (API-level). The UI-wizard leg should be considered in a CCR-scoped migration, not here.
    - *"Verify follower index is duplicating"* (lines 87-100) — **this assertion is dead code in FTR today** (see smells: unreachable statements after `return` inside `retry.waitForWithTimeout`), so no working coverage is actually lost. True two-cluster replication verification should wait for Scout remote-cluster support (or be judged redundant with ES-level CCR tests).
  - Recommendation: keep the FTR file and `config.ccs.ts` wiring in place until Scout supports remote-cluster topology (or until a deliberate decision moves the CCR-wizard leg into the CCR plugin's Scout suite).

### Tests to drop

- None. (The three non-CCS files are all migrated; nothing is redundant. Note an *API-level* CRUD suite already exists at `x-pack/platform/test/api_integration/apis/management/remote_clusters/` — it is out of scope for issue #281246 and stays as-is; it does not duplicate the UI-wizard journey.)

---

## 2. Test type routing

### UI tests

| FTR file | Proposed spec path | Key flows covered |
|----------|--------------------|-------------------|
| `home_page.ts` + `remote_clusters.ts` + a11y "Add remote cluster" states | `x-pack/platform/plugins/private/remote_clusters/test/scout/ui/tests/remote_clusters_crud.spec.ts` | Empty-state prompt, add wizard trust/form/review steps, request flyout, submit with fake host, details flyout shows name + seeds/proxy address, API cleanup. Functional assertions **plus** `page.checkA11y()` inside `test.step` blocks at each state (empty list, trust step, form step, review step, request flyout) |
| a11y "Edit remote cluster (sniff/proxy mode)" states, promoted to functional coverage (+ optional salvage of CCS list assertion) | `x-pack/platform/plugins/private/remote_clusters/test/scout/ui/tests/remote_clusters_edit_delete.spec.ts` | Seed clusters via `esClient.cluster.putSettings` (sniff + proxy), assert list rendering, details flyout, delete confirmation modal, edit form + request flyout as functional behavior (new coverage; today these flows are exercised only as a11y snapshots), **and** `page.checkA11y()` inside `test.step` blocks at each of those states; optional: self-referential remote showing `Connected` status/mode/address in the list |

### API tests

| FTR file | Proposed spec path | Why API not UI |
|----------|--------------------|----------------|
| — | — | None. API CRUD coverage already exists in `x-pack/platform/test/api_integration/apis/management/remote_clusters/` (separate suite, out of scope). |

### Unit tests (RTL/Jest)

| FTR file | Component under test | Proposed test path | What to test |
|----------|---------------------|-------------------|-------------|
| — | — | — | None. The plugin already has extensive Jest coverage under `x-pack/platform/plugins/private/remote_clusters/__jest__/`; all migrated flows are genuine multi-page user journeys against a real ES. |

---

## 3. Parallelism plan

### Parallel-safe (can be space-isolated)

| Proposed spec | Why parallel-safe |
|--------------|------------------|
| — | None. Remote-cluster definitions are **persistent cluster settings** (`cluster.remote.*`), cluster-scoped and not space-isolable. |

### Must be sequential

| Proposed spec | Why sequential |
|--------------|---------------|
| `remote_clusters_crud.spec.ts` | Asserts the **empty-state** prompt, which requires zero remote clusters registered anywhere on the cluster; then registers/removes a cluster-scoped persistent setting |
| `remote_clusters_edit_delete.spec.ts` | Registers/removes cluster-scoped persistent settings (`cluster.remote.clusterSniffMode` / `clusterProxyMode`); its list assertions would also break the CRUD spec's empty-state assertion if interleaved |

Both specs mutate the same global namespace and the CRUD spec needs an empty list, so they cannot run in parallel with each other. Recommendation: run the suite with a single worker (`workers: 1` in `playwright.config.ts`); the executor may alternatively use distinct cluster names per spec, but that still cannot rescue the CRUD spec's empty-state assertion, so single-worker is the simplest correct mechanism.

---

## 4. Test data and setup

### Archives inventory

| Archive path | Contents | Size | Used by (files) | Verdict |
|-------------|----------|------|-----------------|---------|
| — | — | — | — | No es_archiver or kbn_archiver usage anywhere in the source suites |

### UI settings mutations

| FTR call | Semantics | Files |
|----------|-----------|-------|
| — | — | None found |

### Shared constants to extract

| Value | Occurrences | Current locations |
|-------|-------------|-------------------|
| Remote-cluster "delete via settings" payload (all-`null` fields) | 3 | `remote_clusters.ts:34-50`, a11y `remote_clusters.ts:65-78`; the same shape recurs in CCR's Scout cleanup. Extract a plugin-local `deleteRemoteClusterSettingsPayload(name)` helper in the Scout fixtures |
| Test-subject IDs for the wizard/list/flyouts | 2 files | a11y `remote_clusters.ts:11-25` declares 15 consts; FTR page object `x-pack/platform/test/functional/page_objects/remote_clusters_page.ts` repeats most of them. They become locators inside the new plugin-local page object rather than exported constants |

### Fresh server required

- None. Both specs need an **empty remote-cluster registry** at start, achieved with a defensive `beforeAll` cleanup via `esClient.cluster.putSettings` (null-out any leftovers), not a fresh server.

---

## 5. Auth and roles

### Role inventory

| Role name | Source | Privileges (summary) | Used by (files) | Scout role target | Notes |
|-----------|--------|---------------------|-----------------|-------------------|-------|
| `global_ccr_role` | `x-pack/platform/test/functional/config.base.ts:489-499` | ES cluster: `manage`, `manage_ccr`; Kibana: base `all`, all spaces | `home_page.ts:18`, `remote_clusters.ts:24` | `loginWithCustomRole` with cluster `['manage']` + Kibana base `all` | `manage_ccr` is CCR-specific and not needed by the Remote Clusters UI; drop it. A leaner `remote_clusters_user` role (cluster `manage` only) already exists at `config.base.ts:713-717` but is unused by these tests |
| FTR default test user (superuser-equivalent) | a11y suite uses no `setRoles` | full privileges | a11y `remote_clusters.ts` (all 13 its) | same custom role as above | Over-privileged today; downgrade |
| `superuser` | `ccs/remote_clusters_index_management_flow.ts:28` | everything | 1 file (deferred) | n/a (deferred) | Explicit workaround for elastic/kibana#143720 (follower-index wizard permissions); revisit when the CCS test is unblocked |

### Over-privileged tests

| File | What it actually exercises | Suggested minimum privilege |
|------|---------------------------|----------------------------|
| a11y `remote_clusters.ts` (all) | Remote Clusters management UI + `cluster.putSettings` for seeding (seeding moves to the `esClient` fixture, which authenticates separately) | ES cluster `manage` + Kibana management access |
| `ccs/remote_clusters_index_management_flow.ts` | Remote cluster list, CCR follower wizard, index flush | Deferred; blocked on #143720 for the wizard leg |

### Roles deserving shared helpers (used in ≥3 files)

- None reach the ≥3-file threshold in FTR, but the single custom-role constant (cluster `['manage']` + Kibana base `all`) is shared by both proposed specs — define it once in the plugin-local Scout fixtures (`fixtures/constants.ts`), same pattern as watcher's `WATCHER_ADMIN_ROLE` and CCR's `CUSTOM_ROLES.global_ccr_role`.

### Special auth patterns

- None (no `run_as`, API keys, or certificate auth).

---

## 6. Reusability audit

### FTR services and page objects in use

| FTR name | What it does | Used by (files) | Scout equivalent exists? | Hidden assertions? | Recommended scope |
|----------|-------------|-----------------|-------------------------|-------------------|-------------------|
| `PageObjects.remoteClusters` (`x-pack/platform/test/functional/page_objects/remote_clusters_page.ts`) | Wizard driver (`createNewRemoteCluster`), empty-state button, list-row scraper | `home_page.ts`, `remote_clusters.ts`, `ccs/...flow.ts` | no | no explicit asserts, but `createNewRemoteCluster` embeds `retry.waitFor` step-gating | plugin-local Scout page object (`fixtures/page_objects/remote_clusters_page.ts`), mirroring CCR/watcher structure |
| `PageObjects.common` | `navigateToApp('remoteClusters')` (path `/app/management/data/remote_clusters`, `config.base.ts:161-163`) | all files | yes (Scout navigation via page object `goto`) | no | use existing pattern |
| `getService('security').testUser` | set/restore roles | `home_page.ts`, `remote_clusters.ts`, CCS file | yes (`browserAuth.loginWithCustomRole`) | no | use existing |
| `getService('es')` | cluster-settings cleanup/seed | `remote_clusters.ts`, a11y file, CCS file | yes (`esClient` fixture) | no | use existing |
| `getService('deployment').isCloud()` | picks proxy-address vs seeds form field | `remote_clusters.ts:23` | yes (`config` fixture exposes `isCloud`, `kbn-scout .../core_fixtures.ts:105`) | no | use existing; see Cloud portability |
| `getService('a11y').testAppSnapshot()` | axe snapshot | a11y file (13 calls) | yes (`page.checkA11y`) | yes — throws on violations | `page.checkA11y()` inside `test.step` blocks in the functional specs (not a separate spec), per Scout maintainer guidance (PR #281288); reference `src/platform/plugins/shared/discover/test/scout/metrics_experience/ui/parallel_tests/flyout_persistence.spec.ts` |
| `getService('retry')` | waitFor polling | a11y + CCS files | yes (Playwright auto-wait / `expect().toBeVisible()`) | n/a | replace with web-first assertions |
| `getService('testSubjects')` | find/click/setValue | all files | yes (`page.testSubj`) | `existOrFail`-style methods assert internally | use existing |
| `getService('remoteEs')` | ES client against the remote cluster | CCS file only | **missing — no Scout equivalent** | no | blocker for the deferred file; would be a `kbn-scout` (shared) fixture if/when remote topology lands |
| `PageObjects.indexManagement`, `PageObjects.crossClusterReplication` | CCS journey legs | CCS file only | partial (CCR has plugin-local Scout page objects; Index Management has its own Scout suite) | NEEDS VERIFICATION (only relevant if the deferred file is revived) | n/a for this migration |

### EUI components interacted with directly

| Component | Interaction pattern | Files |
|----------|-------------------|-------|
| `EuiComboBox` (seeds input, `remoteClusterFormSeedsInput`, `sniff_connection.tsx:112-129`) | `testSubjects.setValue` types free text + implicit option creation | `remote_clusters_page.ts:44`, a11y `remote_clusters.ts:139` — executor should use Scout's EUI combo-box helper, not raw `fill` |
| `EuiBasicTable` (list, `remoteClusterListTable`) | row iteration via `.euiTableRow` CSS | `remote_clusters_page.ts:53-78` |
| `EuiFlyout` (details + request flyouts) | title/text reads, `euiFlyoutCloseButton` | `remote_clusters.ts:54-61`, a11y file |
| `EuiConfirmModal` (delete) | title text read | a11y `remote_clusters.ts:193-208` |
| Wizard step buttons (`EuiSteps` flow) | sequential next-button clicks | `remote_clusters_page.ts:29-51`, a11y file |

### Brittle locator strategies

| File | Line | Current locator | Target component |
|------|------|----------------|-----------------|
| `x-pack/platform/test/functional/page_objects/remote_clusters_page.ts` | 55 | `table.findAllByCssSelector('.euiTableRow')` | Remote-clusters table rows — every needed cell already has a `data-test-subj` (`remoteClustersTableListClusterLink`, `remoteClusterConnectionStatusMessage`, etc.), so no source changes required; the Scout page object should scope by test subjects |

No missing `data-test-subj` attributes were found; the UI is well instrumented.

### Page objects with hidden assertions

| FTR helper | Method | Assertion | File:line |
|-----------|--------|-----------|-----------|
| `getService('a11y')` | `testAppSnapshot()` | throws on axe violations | (FTR built-in) — becomes explicit `expect(violations).toStrictEqual([])` in specs |
| `getService('testSubjects')` | `existOrFail`-family | throws if not found | (FTR built-in) |

---

## 7. Server configuration

### FTR server args (full chain)

| Arg | Source config | Category | Notes |
|-----|-------------|----------|-------|
| (none suite-specific) | `apps/remote_clusters/config.ts` | — | Plain passthrough of `config.base.ts`; Scout default servers config covers it |
| `--data.search.sessions.enabled=true` | `accessibility/apps/group3/config.ts:24` | not needed | Serves the search-sessions a11y suite in group3, unrelated to remote clusters |
| `--xpack.upgrade_assistant.ui.enabled=true` | `accessibility/apps/group3/config.ts:25` | not needed | Serves the upgrade-assistant a11y suite, unrelated to remote clusters |

### ES server args

| Arg | Source config | Notes |
|-----|-------------|-------|
| `esTestCluster.ccs.remoteClusterUrl` | `config.ccs.ts:48-53` | Starts/attaches the second ES cluster for the CCS suite only. Scout accepts the key in its schema but never consumes it — this is the deferral blocker |
| `security.remoteEsRoles.ccs_remote_search` | `config.ccs.ts:32-42` | Role provisioned on the remote cluster; only meaningful with the deferred CCS file |

### Custom server config needed?

- Not for the migratable specs — Scout's **default** stateful config set is sufficient (no boot-time args, no feature flags).
- The deferred CCS file would require new Scout infrastructure (second stateful cluster + `remoteEs` fixture), which no existing config set under `src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/` provides.

---

## 8. Deployment targets

| Proposed spec | Where it should run | Reasoning |
|--------------|--------------------|-----------|
| `remote_clusters_crud.spec.ts` | stateful classic (`tags.stateful.classic` = local + ECH), **with the cloud caveat below** | Serverless UI is disabled (`disabled_uis.ts`). On ECH the add-form renders a proxy-address input (`remoteClusterFormRemoteAddressInput`, `connection_mode_cloud.tsx`) instead of the sniff seeds combo box — the FTR test branched on `deployment.isCloud()` (`remote_clusters.ts:23,59-61`); the Scout spec can branch on the `config.isCloud` fixture, or start local-only (`@local-stateful-classic`) and expand later. NEEDS VERIFICATION: whether Scout ECH runs render the cloud form variant identically to FTR-cloud (the `cloud` plugin is optional for this plugin, `kibana.jsonc`) |
| `remote_clusters_edit_delete.spec.ts` | stateful classic (local + ECH) | Seeding via `cluster.putSettings` with unreachable `127.0.0.1` addresses; edit/details/delete UI is mode-driven by the stored settings, not by the deployment — no cloud branch expected. Its inline `page.checkA11y()` calls inherit this spec's tag. NEEDS VERIFICATION: that ECH allows `PUT _cluster/settings` for `cluster.remote.*` with unreachable seeds (expected yes — it is how ECH remotes are configured — but untested here) |

Today's FTR coverage for reference: functional suite runs in `.buildkite/ftr-manifests/ftr_platform_stateful_configs.yml:279`, a11y group3 at line 142, CCS config at line 293 — all local stateful CI only. The FTR `home_page.ts` attempted `skipCloud` (see smells) and `remote_clusters.ts` handled cloud via branching.

### Stateful/serverless mirror FTR files

None found after searching by basename (`home_page.ts`, `remote_clusters.ts`), distinctive test titles ("Remote Clusters app", "remoteClusterListTable", describe names), and `loadTestFile` references across `x-pack/platform/test/serverless/**`, `x-pack/solutions/*/test/**`, and `src/platform/test/**`. The only serverless reference is the *negative* check in `x-pack/platform/test/serverless/functional/test_suites/management/disabled_uis.ts:31-32` (asserts the app is absent) — keep as-is, it is not a mirror. The API-integration suite (`x-pack/platform/test/api_integration/apis/management/remote_clusters/`) is a different layer, not a mirror of the UI flows.

### Coverage gaps

- The edit/delete/request-flyout flows are exercised today only as a11y snapshots. Merging the a11y checks into `remote_clusters_edit_delete.spec.ts` (via inline `page.checkA11y()` in `test.step` blocks) upgrades those flows to functional coverage while preserving the a11y assertions in the same spec — no extra spec needed.
- The `Connected`-status list assertion currently lives only in the deferred CCS file; the self-referential-remote pattern (CCR precedent) can restore it in stateful Scout without a second cluster.

### Cloud portability issues

| File | Line | Issue |
|------|------|-------|
| `remote_clusters.ts` | 23, 59-61 | Branches on `deployment.isCloud()` because the ECH add-form uses proxy mode; the Scout spec must branch on `config.isCloud` or restrict to local |
| a11y `remote_clusters.ts` | 138-139 | Fills `remoteClusterFormSeedsInput` unconditionally — would fail on ECH where the seeds combo box is replaced by the proxy-address input (suite never ran on cloud, so latent) |
| `home_page.ts` | 17 | `this.tags('skipCloud')` — cloud was explicitly excluded for the FTR home-page check |
| `ccs/remote_clusters_index_management_flow.ts` | 48 | Asserts remote address contains `localhost` — inherently local-topology; deferred anyway |

---

## 9. FTR test smells

| Smell | File | Lines | Description | Context |
|-------|------|-------|------------|---------|
| Tag applied at hook runtime | `home_page.ts` | 17 | `this.tags('skipCloud')` inside `before()` — FTR tag filtering happens at collection time, so this likely never excluded the suite on cloud (NEEDS VERIFICATION; harmless after migration since Scout tags are static) | Intent was "skip on cloud" |
| UI-based setup | `remote_clusters.ts` | 22-31 | The add-wizard journey (the behavior under test) runs in `before()`, so wizard regressions surface as hook failures, not test failures | Restructure as `test.step`s inside the test body |
| Conditional test logic | `remote_clusters.ts` | 23, 59-61 | `isCloud` branch selects seeds vs proxy-address field and assertion target | Deployment-form divergence; carry over via `config.isCloud` or restrict tags |
| Sequential journey as separate `it` blocks | a11y `remote_clusters.ts` | 92-148 | The 5 "Add remote cluster" its form one wizard walk-through; each depends on the previous step's page state | Becomes one Scout test with `test.step`s |
| Duplicated navigation in `beforeEach` | a11y `remote_clusters.ts` | 160-162 | Re-navigates to the app before every `it` in the edit describes | Playwright journey structure makes this unnecessary |
| Retry wrappers | a11y `remote_clusters.ts` | 94, 101, 106, 114, 120, 129, 142, 173, 180, 186, 194, 200, 211, 216, 221 | `retry.waitFor` around visibility/text checks throughout | Replace with web-first `expect(...).toBeVisible()/toHaveText()` |
| Over-privileged execution | a11y `remote_clusters.ts` | all | Runs as the FTR default (superuser-equivalent) user; only needs cluster `manage` + management UI | Downgrade to the custom role |
| **Dead code / unreachable assertion** | `ccs/remote_clusters_index_management_flow.ts` | 92-99 | Inside `retry.waitForWithTimeout`, the callback `return`s on line 93; the follower doc-count assertions on lines 94-98 are unreachable — the test's stated purpose ("verify the follower index is duplicating") is never actually asserted | Means deferring this file loses *no working* replication assertion |
| Over-privileged execution (documented) | `ccs/remote_clusters_index_management_flow.ts` | 28-33 | `superuser` workaround for elastic/kibana#143720 (follower wizard permissions) | Revisit if/when the file is revived |
| Missing cleanup guards | `ccs/remote_clusters_index_management_flow.ts` | 103-111 | `after` deletes follower/leader indices unconditionally — a mid-journey failure cascades into hook failures; also never unregisters `ftr-remote` | Deferred file; note for eventual revival |
| Shared mutable state / cross-`describe` journey | `ccs/remote_clusters_index_management_flow.ts` | 25-100 | `leaderName`/`followerName` shared across three describes spanning three Kibana apps | Single journey disguised as three suites |
| Brittle CSS selector | `page_objects/remote_clusters_page.ts` | 55 | `.euiTableRow` CSS iteration | Cells have test subjects; rework in the Scout page object |

---

## 10. Migration batches

### Batch 1: CRUD spec (quick win)

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 1 | `test/scout/ui/tests/remote_clusters_crud.spec.ts` | `home_page.ts` + `remote_clusters.ts` + a11y "Add" states | simple | Creates the plugin's `test/scout/ui` scaffolding (playwright.config, fixtures, page object, custom role) — model on `x-pack/platform/plugins/private/watcher/test/scout/ui` and `x-pack/platform/plugins/private/cross_cluster_replication/test/scout/ui`, and merge a11y checks via `page.checkA11y()` inside `test.step` blocks per Scout maintainer guidance (PR #281288; reference `src/platform/plugins/shared/discover/test/scout/metrics_experience/ui/parallel_tests/flyout_persistence.spec.ts`). Empty state (+checkA11y) → wizard trust/form/review (+checkA11y per step) → request flyout (+checkA11y) → submit fake host → details flyout → `esClient` cleanup |

- **Human involvement**: `autopilot`
- **Dependencies**: none (all Scout fixtures exist; page object is new but plugin-local)
- **Blockers**: none. Decision needed on cloud tag scope (`@local-stateful-classic` only vs `tags.stateful.classic` + `config.isCloud` branch)

### Batch 2: Edit/delete functional spec (with merged a11y)

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 2 | `test/scout/ui/tests/remote_clusters_edit_delete.spec.ts` | a11y `remote_clusters.ts` "Edit remote cluster (sniff/proxy)" states, promoted to functional coverage + merged a11y | medium | Seed sniff + proxy clusters via `esClient.cluster.putSettings`; assert list rendering, details flyout, delete modal, edit form + request flyout as functional behavior, **and** call `page.checkA11y()` inside each `test.step` (empty/list/details/delete/edit states, both modes). Optional add-on: self-referential remote (CCR pattern, `cross_cluster_replication_with_data.spec.ts:34-57`) to salvage the `Connected` status/mode/address assertions from the deferred CCS file |
- **Human involvement**: `autopilot`; `guided` if the optional self-remote `Connected` test is included (fidelity call: same-cluster remote vs true remote)
- **Dependencies**: batch 1 scaffolding (fixtures, page object, role)
- **Blockers**: none

### Batch 3: CCS flow — deferred

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 3 | (none — stays in FTR) | `ccs/remote_clusters_index_management_flow.ts` | complex | Blocked on Scout remote-cluster topology: `esTestCluster.ccs` unconsumed by `run_elasticsearch.ts`, no `remoteEs` fixture, no CCS config set. Also spans CCR + Index Management plugins and carries the #143720 superuser workaround and a dead-code final assertion |

- **Human involvement**: `hands-on` (new Scout server/fixture infrastructure, cross-plugin ownership decision)
- **Dependencies**: Scout support for a second stateful ES cluster
- **Blockers**: as above; keep `config.ccs.ts` wiring and the FTR file until then

### Scout CI registration (do in the PR that adds the first Scout config)

Required for CI to discover and run the new specs — do once per plugin, and re-run whenever specs or tags change (kapral18, PR #281731 — committing it avoids a later metadata-cleanup PR):

- Add the plugin under `plugins.enabled` (alphabetical) in `.buildkite/scout_ci_config.yml`.
- Regenerate and commit the Scout test-config manifest: `node scripts/scout.js update-test-config-manifests --includingUpToDate --noSummary`. Commit only this plugin's `test/scout/.meta/**`; the command also regenerates other plugins' manifests, so revert that unrelated drift (`git checkout -- <paths>`) before staging.
- Verify discovery finds the config: `node scripts/scout discover-playwright-configs --target local-stateful-only --configs x-pack/platform/plugins/private/remote_clusters/test/scout/ui/playwright.config.ts` (expect "Found Playwright config files in 1 plugin(s)").

---

## 11. Effort summary

| Metric | Value |
|--------|-------|
| Total FTR test files analyzed | 4 (+2 configs, +1 index, +1 page object) |
| > UI tests | 3 (migrated into 2 functional Scout specs with a11y checks merged inline via `page.checkA11y()` in `test.step` blocks) |
| > API tests | 0 |
| > Unit tests (RTL/Jest) | 0 |
| > Dropped | 0 |
| > Deferred | 1 (`ccs/remote_clusters_index_management_flow.ts`) |
| New page objects needed | 1 (plugin-local `remote_clusters_page`) |
| New API services needed | 0 (only `esClient.cluster.putSettings` helpers in plugin fixtures) |
| `data-test-subj` additions to source code | 0 |
| Custom server config sets | 0 new / default config reused |
| Migration batches | 3 (2 executable now, 1 deferred) |

### Risks and open questions

- `NEEDS VERIFICATION` — **ECH form variant under Scout**: whether Scout `@cloud-stateful-classic` runs render the cloud (proxy-address) add-form exactly as FTR-cloud did, and whether the `config.isCloud` branch is worth carrying vs tagging the CRUD spec local-only initially. The FTR a11y suite (now merged into the functional specs) never ran on cloud and its seeds-input step would fail there, so the add-wizard states — and the a11y checks folded into them — may need to start `@local-stateful-classic`.
- `NEEDS VERIFICATION` — **`cluster.remote.*` persistent settings on ECH** with unreachable `127.0.0.1` seeds are accepted (expected yes, but not verified here).
- `NEEDS VERIFICATION` — whether `home_page.ts:17`'s runtime `this.tags('skipCloud')` ever actually excluded the suite (affects only how we document historical cloud coverage, not the migration).
- Human sign-off needed: (a) tag scope for cloud (above); (b) whether to include the optional self-referential-remote `Connected` test in batch 2 (recovers the only live assertion of the deferred CCS file, at reduced topological fidelity); (c) confirmation of single-worker execution across the two functional specs (they share cluster-scoped `cluster.remote.*` state and the CRUD spec asserts the empty-list state).
- Missing Scout capability blocking the deferred test: second stateful ES cluster (`esTestCluster.ccs.remoteClusterUrl` is schema-validated but ignored by `src/platform/packages/shared/kbn-scout/src/servers/run_elasticsearch.ts`) and a `remoteEs` client fixture. Until that lands, the CCS FTR file and `x-pack/platform/test/functional/config.ccs.ts` entry must stay.
- Issue #281246 disposition recommendation: **partial migration now** (batches 1-2 cover 3 of 4 files, including all a11y coverage), defer only the CCS flow file — not the whole suite.
