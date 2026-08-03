# FTR to Scout Migration Plan

| Field | Value |
|-------|-------|
| Source | `x-pack/platform/test/functional/apps/index_management` (stateful UI), `x-pack/platform/test/api_integration/apis/management/index_management` (stateful API), `x-pack/platform/test/serverless/functional/test_suites/management/index_management` (serverless UI), `x-pack/platform/test/serverless/api_integration/test_suites/index_management` (serverless API) |
| Target module root | `x-pack/platform/plugins/shared/index_management` |
| Generated | 2026-07-29 |
| Deployment targets | both |
| FTR config chain | Stateful UI: `x-pack/platform/test/functional/apps/index_management/config.ts` > `x-pack/platform/test/functional/config.base.ts`. Stateful API: `x-pack/platform/test/api_integration/apis/management/config.ts` > `x-pack/platform/test/api_integration/config.ts` > `x-pack/platform/test/functional/config.base.ts`; plus `.../index_management/disabled_data_enrichers/config.ts` > `x-pack/platform/test/api_integration/config.ts` (own CI entry). Serverless UI: `x-pack/platform/test/serverless/functional/configs/{search,security,observability}/config.group1.ts` > `config.<project>.base.ts` > `x-pack/platform/test/serverless/functional/config.base.ts`. Serverless API: `x-pack/platform/test/serverless/api_integration/configs/{search,security,observability}/config.group1.ts` > `x-pack/platform/test/serverless/api_integration/config.base.ts` |

Issue: [elastic/kibana#281244](https://github.com/elastic/kibana/issues/281244). Existing Scout coverage (PRs #242825, #270902) lives in `x-pack/platform/plugins/shared/index_management/test/scout/ui` (6 specs, all tagged `tags.stateful.classic`). The key directive from the issue is honored throughout: stateful and serverless API suites are largely mirrors and are planned as **single tagged Scout API specs** wherever the flows match (see section 8 mirror table).

---

## 1. Test inventory

Sorted by estimated complexity (simple to complex). File paths are relative to the repo root, abbreviated: `SF-UI` = `x-pack/platform/test/functional/apps/index_management`, `SF-API` = `x-pack/platform/test/api_integration/apis/management/index_management`, `SL-UI` = `x-pack/platform/test/serverless/functional/test_suites/management/index_management`, `SL-API` = `x-pack/platform/test/serverless/api_integration/test_suites/index_management`.

| # | FTR file (relative) | Type | Description | `it` count | Complexity | Decision | Justification |
|---|---------------------|------|-------------|-----------|------------|----------|---------------|
| 1 | `SF-API/searchprofiler.ts` | test | GET `/api/searchprofiler/has_indices` returns `{hasIndices:true}` | 1 | simple | out of scope (relocated) | Tests the searchprofiler plugin's route, not index_management; split into its own migration — [#281700](https://github.com/elastic/kibana/issues/281700), plan at `x-pack/platform/plugins/shared/searchprofiler/migration-plan-searchprofiler-2026-07-30.md` |
| 2 | `SF-API/cluster_nodes.ts` | test | GET `/api/index_management/nodes/plugins` returns an array | 1 | simple | API test | Pure HTTP contract; merge with SL mirror (#31) into one tagged spec with env-dependent expected status (200 stateful / 410 serverless) |
| 3 | `SL-API/cluster_nodes.ts` | test | Same endpoint returns 410 in serverless | 1 | simple | API test | Merge into #2 |
| 4 | `SF-API/mapping.ts` | test | GET/PUT `/api/index_management/mapping/{index}` | 2 | simple | API test | HTTP contract; merge with SL mirror (#32) |
| 5 | `SL-API/mappings.ts` | test | GET mapping only (no update case) | 1 | simple | API test | Merge into #4; verify PUT mapping works on serverless (`NEEDS VERIFICATION`) |
| 6 | `SF-API/stats.ts` | test | GET `/api/index_management/stats/{index}` shape | 1 | simple | API test | No serverless mirror (stats API not exposed there); stateful-only tag |
| 7 | `SF-API/index_details.ts` | test | GET `/internal/index_management/indices/{name}` + 404 case | 2 | simple | API test | Merge with the `get index` block of SL `indices.ts` (#34); expected keys differ per env |
| 8 | `SF-API/create_index.ts` | test | PUT `/internal/index_management/indices/create` + duplicate 400 | 2 | simple | API test (fold in) | Duplicates `indices.ts > create` and SL `indices.ts > create index`; fold into the merged indices spec, keep the duplicate-name 400 case |
| 9 | `SF-API/enrich_policies.ts` | test | List/execute/delete enrich policy (public+internal APIs) | 3 | simple | API test | Merge with SL mirror (#35), flows identical |
| 10 | `SL-API/enrich_policies.ts` | test | Same list/execute/delete via role-scoped auth | 3 | simple | API test | Merge into #9 |
| 11 | `SF-API/failure_store_settings.ts` | test | GET failure store settings, default + persistent override | 2 | simple | API test | Merge with SL mirror (#36), near-identical; mutates persistent cluster setting → sequential |
| 12 | `SL-API/failure_store_settings.ts` | test | Same, serverless auth | 2 | simple | API test | Merge into #11 |
| 13 | `SF-API/settings.ts` | test | GET/PUT index settings; asserts ~49 default setting keys exist | 2 | simple | API test | Merge with SL mirror (#37); default-keys list differs per env — keep env-specific expected lists |
| 14 | `SL-API/settings.ts` | test | GET/PUT (refresh_interval) with smaller defaults list | 2 | simple | API test | Merge into #13 |
| 15 | `SF-UI/index_templates_tab/index_template_list.ts` | test | Delete-managed-template warning callout (`ilm-history-7`) | 1 | simple | UI test | Real user flow; stateful-only (relies on the ILM-managed `ilm-history-7` template which doesn't exist on serverless) |
| 16 | `SF-API/index_doc_count.ts` | test | POST `/internal/index_management/index_doc_count` incl. >10 indices and 255-char names | 4 | medium | API test | Data-correctness over HTTP; stateful-only today; endpoint availability on serverless `NEEDS VERIFICATION` before tagging deploymentAgnostic |
| 17 | `SF-API/indices.ts` | test | Index actions: create/clear-cache/close/open/delete/flush/refresh/forcemerge/list/reload | 14 | medium | API test | Merge shared flows (create/delete/list/reload) with SL `indices.ts` (#34); close/open/flush/refresh/forcemerge/clear-cache are stateful-only (endpoints not exposed on serverless) |
| 18 | `SF-API/data_streams.ts` | test | DS get/get-with-stats/get-one, retention update, failure-store config, delete, mappings-from-template, rollover | 12 | medium | API test | Merge flows with SL `datastreams/*` (#38–40); Get-shape assertions are env-specific (metering fields, health) |
| 19 | `SF-API/data_streams_index_mode.ts` | test | `indexMode` in Get DS API across `cluster.logsdb.enabled`/`prior_logs_usage` matrix | 5 | medium | API test | Merge with SL `ds_common.ts` logsdb block; defaults differ per env (see mirror table); mutates persistent cluster settings → sequential; `onlyEsVersion` gate has no Scout equivalent (`NEEDS VERIFICATION`) |
| 20 | `SF-API/create_enrich_policy.ts` | test | Create policy, get_fields_from_indices (indices + data streams), matching indices/data streams | 4 | medium | API test | Merge with SL mirror (#41); stateful adds data-stream cases — verify those endpoints behave the same on serverless (`NEEDS VERIFICATION`), else tag data-stream cases stateful-only |
| 21 | `SF-API/snapshot_repositories.ts` | test | GET snapshot_repositories with/without default repo (fs repo at `/tmp/repo`) | 2 | medium | API test | Stateful-only; `fs` repositories + `path.repo` are local-filesystem assumptions — not portable to ECH/MKI out of the box (see section 8) |
| 22 | `SF-API/data_enrichers/ilm.ts` | test | ILM data enricher populates `ilm` field in GET indices | 2 | medium | API test | Stateful-only (ILM does not exist on serverless) |
| 23 | `SF-UI/create_enrich_policy/create_enrich_policy.ts` | test | Create-enrich-policy wizard end-to-end | 2 | medium | UI test | Real multi-step user flow; near-identical SL mirror (#27) → merge into one deployment-agnostic spec |
| 24 | `SL-UI/create_enrich_policy.ts` | test | Same wizard on serverless (loginAsAdmin) | 2 | medium | UI test | Merge into #23 |
| 25 | `SF-UI/enrich_policies_tab/enrich_policies_tab.ts` | test | Policies list, details flyout, execute, delete, read-only/no-access role checks | 6 | medium | UI test | Merge list/flyout with SL mirror (#28); execute/delete + role-based access are stateful-extra (SL mirror lacks them); split access checks into their own spec (role-per-spec) |
| 26 | `SL-UI/enrich_policies.ts` | test | Policies list + details flyout (subset; `failsOnMKI`) | 2 | medium | UI test | Merge into #25 |
| 27 | `SL-UI/component_templates.ts` | test | Component templates list + create wizard | 3 | medium | UI test | No stateful FTR mirror; existing Scout `home_page.spec.ts` only asserts the tab renders → migrate list+create as a deployment-agnostic spec |
| 28 | `SL-UI/indices.ts` | test | Indices tab render, create index, manage-index context menu → details tabs, delete index | 7 | medium | UI test (partial drop) | `renders`/`create index` already covered by Scout `home_page.spec.ts` (stateful) → expand tags instead; migrate only manage-index context-menu navigation + delete-index flow; `skipSvlSearch` today (search solution has its own suite) |
| 29 | `SL-UI/index_detail.ts` | test | Index details page: tabs exist, mappings add-field enabled, edit settings enabled | 5 | medium | UI test (partial drop) | `renders`/`create index` duplicated from #28 → drop; details-page assertions extend the existing Scout `index_details_page.spec.ts` |
| 30 | `SF-UI/data_streams_tab/data_streams_tab.ts` | test | DS flyout, lifecycle retention edit (details + bulk modal), failure store enable/disable | 7 | complex | UI test | Merge shared flows with SL `data_streams.ts` (#33); bulk-edit retention has no SL mirror — verify feature exists on serverless (`NEEDS VERIFICATION`), else stateful-only |
| 31 | `SL-API/indices.ts` | test | list/get/create/reload/delete with serverless-shaped keys | 8 | medium | API test | Merge into #17 (env-specific expected keys) |
| 32 | `SL-API/index_templates.ts` | test | Template get-all/get-one/create/update/delete/simulate; no legacy templates | 13 | complex | API test | Merge with `SF-API/templates.ts` (#42); legacy-template cases stateful-only; `legacyTemplates.length === 0` becomes the serverless-side assertion |
| 33 | `SL-UI/data_streams.ts` | test | DS tab, flyout, retention edit, project-level retention (security), no-ILM check, index-mode modify journeys | 8 | complex | UI test | Superset mirror of #30 + `SF-UI/index_mode.ts`; merge shared flows; serverless-specific cases (no ILM picker, project-level retention callout) stay serverless-tagged |
| 34 | `SL-API/datastreams/ds_common.ts` | test | logsdb matrix, retention update, delete, mappings-from-template, rollover | 8 | medium | API test | Merge into #18/#19 |
| 35 | `SL-API/datastreams/ds_serverless.ts` | test | Get DS array/one with metering fields (`skipMKI`) | 2 | medium | API test | Env-specific Get-shape; merge as serverless-local variant assertions |
| 36 | `SL-API/datastreams/ds_mki.ts` | test | Same Get assertions on real MKI incl. security project 396d retention branch | 2 | complex | API test (defer parts) | MKI-only, branches on project type at runtime; Scout can express per-project tags — but the security-project retention expectation only exists on real MKI (`NEEDS VERIFICATION` how to cover MKI-only expectations in Scout) |
| 37 | `SF-UI/data_streams_tab/index_mode.ts` | test | Index mode in DS flyout + template-edit journeys standard↔logsdb (2 skipped TSDS cases) | 6 (2 skipped) | complex | UI test | Merge with the `Modify data streams index mode` block of #33 (near-identical); `onlyEsVersion('8.19 \|\| >=9.1')` gate has no Scout equivalent (`NEEDS VERIFICATION`); keep the 2 `it.skip` TSDS cases out (blocked by elastic/elasticsearch#126473) |
| 38 | `SL-API/index_component_templates.ts` | test | Component templates get/update/delete/get-datastreams (no create block; Update duplicated) | 9 | complex | API test | Merge with `SF-API/component_templates.ts` (#43); drop the duplicated `Update #2` block; create-block cases from stateful side — verify lifecycle/`frozen_after` payloads on serverless (`NEEDS VERIFICATION`) |
| 39 | `SL-API/create_enrich_policies.ts` | test | Create policy, get_fields_from_indices, matching indices (no data streams) | 3 | medium | API test | Merge into #20 |
| 40 | `SF-UI/index_templates_tab/index_template_tab.ts` | test | Template wizard: retention, frozen phase, logsdb create; logsdb modify; synthetic-source error; linked ingest pipeline | 6 | complex | UI test | Merge `modify logsdb` with SL `index_templates.ts` (#41, near-identical case); frozen-phase + default-snapshot-repository setup is stateful-only; existing Scout wizard specs cover the plain walk-through only — no dedupe beyond that |
| 41 | `SL-UI/index_templates.ts` | test | Templates tab render/list/create (incl. logsdb)/modify logsdb settings | 6 | complex | UI test | Merge with #40 and dedupe: `renders the tab` covered by Scout `home_page.spec.ts`; plain `Creates index template` covered by Scout `index_template_wizard.spec.ts` (expand tags) |
| 42 | `SF-API/templates.ts` | test | Templates get-all/get-one (DSL, ILM, index-mode, frozen, logsdb matrix)/create/update/delete/simulate, legacy variants | 21 | complex | API test | Merge with #32; ILM-template and legacy-template cases stateful-only; logsdb matrix env defaults differ; mutates persistent cluster settings → sequential |
| 43 | `SF-API/component_templates.ts` | test | Component templates CRUD + get-datastreams | 13 | complex | API test | Merge with #38 |
| 44 | `SF-API/disabled_data_enrichers/indices.ts` | test | GET indices omits `ilm`/`isFollowerIndex`/`isRollupIndex` keys when rollup/ccr/ilm UIs are disabled | 1 | complex | API test (defer) | Requires `--xpack.rollup.ui.enabled=false --xpack.ccr.ui.enabled=false --xpack.ilm.ui.enabled=false` at Kibana boot → custom Scout server config set; no existing config set matches (see section 7) |

Non-test files indexed:

| FTR file | Type | Notes |
|----------|------|-------|
| `SF-UI/index.ts`, `SF-UI/*/index.ts` (4) | index | Pure `loadTestFile` composition, no shared hooks → each target becomes its own spec, nothing else to carry over |
| `SF-UI/config.ts` | config | Adds 4 custom roles (see section 5); `testFiles: [.]` |
| `SF-API/index.ts`, `SF-API/data_enrichers/index.ts`, `SF-API/disabled_data_enrichers/index.ts` | index | Pure composition, no shared hooks |
| `SF-API/disabled_data_enrichers/config.ts` | config | Custom `kbnTestServer.serverArgs` (see section 7); separate CI entry in `ftr_platform_stateful_configs.yml:393` |
| `SF-API/constants.ts` | helper | `API_BASE_PATH`, `INTERNAL_API_BASE_PATH` (duplicates of plugin `common/` exports), `sortedExpectedIndexKeys` (used by 3 files) |
| `SF-API/lib/*.ts` (11 files) | helper | Thin supertest wrappers (`indices.api`, `templates.api`, `component_templates.api`, `mappings.api`, `settings.api`, `enrich_policies.api`, `cluster_nodes.api`) + ES-client helpers with created-resource tracking (`indices.helpers`, `templates.helpers`, `component_template.helpers`, `datastreams.helpers`, `enrich_policies.helpers`, `random`). `templates.api.cleanUpTemplates` silently swallows errors (line 44-52) |
| `SL-API/../services/index_management/*.ts` (14 files) | service | `svl*` mirrors of the stateful `lib/` helpers, near-line-for-line identical apart from role-scoped auth plumbing — strong signal the specs themselves can merge |
| `x-pack/platform/test/functional/page_objects/index_management_page.ts` | page_object | 351 lines, shared by all four suites (see section 6); several hidden assertions |
| `SL-API/index.ts`, `SL-API/datastreams/index.ts`, `SL-UI/index.ts` | index | Pure composition; `SL-API/index.ts` and the serverless functional `management/index.ts` add `this.tags(['esGate'])` |

### Proposed file splits (omit if none)

- `SF-UI/enrich_policies_tab/enrich_policies_tab.ts` (6 `it` blocks, 3 roles), split into:
  - `enrich_policies.spec.ts` (list, flyout, execute, delete — `index_management_user`-equivalent role, merged with SL mirror)
  - `enrich_policies_access.spec.ts` (read-only via `monitor_enrich`-only role; no-access via `monitor`-only role — one login per spec section, stateful-only unless serverless custom roles are verified)
- `SF-API/indices.ts` + `SL-API/indices.ts`, split by deployment availability:
  - `indices.spec.ts` (create incl. modes + validation-400 + duplicate-400 from `create_index.ts`, list, reload, delete, get-details incl. 404 from `index_details.ts` — deployment-agnostic, env-specific expected keys)
  - `indices_actions.spec.ts` (close/open/flush/refresh/forcemerge/clear-cache — stateful-only)
- `SF-API/templates.ts` + `SL-API/index_templates.ts`, split:
  - `index_templates.spec.ts` (composable CRUD, simulate, error-parsing — deployment-agnostic)
  - `index_templates_legacy.spec.ts` (legacy-template cases + ILM-policy template — stateful-only)
  - `index_templates_logsdb_mode.spec.ts` (logs-*-* index-mode matrix; mutates persistent cluster settings — sequential, env-specific defaults)
- `SL-UI/data_streams.ts` + `SF-UI/data_streams_tab/*`, split:
  - `data_streams.spec.ts` (flyout, retention edit, failure store — deployment-agnostic)
  - `data_streams_bulk_retention.spec.ts` (bulk modal — stateful until serverless availability verified)
  - `data_streams_index_mode.spec.ts` (standard↔logsdb journeys — deployment-agnostic)
  - `data_streams_serverless.spec.ts` (no-ILM-picker check + security-project retention callout — serverless-only tags)

### Tests to drop (omit if empty)

- `SL-UI/indices.ts` `renders the indices tab` / `can create an index`, `SL-UI/index_detail.ts` `renders the indices tab` / `can create an index`: exact duplicates of existing Scout `home_page.spec.ts` coverage ("Loads the app...", "can create an index") — coverage preserved by widening the existing specs' tags to serverless.
- `SL-UI/index_templates.ts` `renders the index templates tab` and plain `Creates index template`: covered by Scout `home_page.spec.ts` (tab render) and `index_template_wizard.spec.ts` (create walk-through) — tag-widening instead.
- `SL-API/index_component_templates.ts` `Update #2` describe block: verbatim duplicate of `Update #1` in the same file (lines 201–287); no coverage lost.
- `SF-API/create_index.ts` as a standalone file: both cases folded into the merged `indices.spec.ts` (no coverage lost).
- `SF-UI/index_mode.ts` + `SL-UI/data_streams.ts` `it.skip` TSDS cases (2×2): already skipped, blocked by elastic/elasticsearch#126473 — do not port; note the ES issue in the spec as a TODO.

### Tests to defer (omit if empty)

- `SF-API/disabled_data_enrichers/indices.ts`: blocked by needing Kibana boot-time flags (`xpack.rollup.ui.enabled=false`, `xpack.ccr.ui.enabled=false`, `xpack.ilm.ui.enabled=false`); requires a new Scout server config set (none of the ~40 existing config sets disables these plugins). Decide with owners whether the coverage justifies a config set (single `it`).
- `SL-API/datastreams/ds_mki.ts` security-project 396d retention expectation: only observable on real MKI security projects; Scout local serverless cannot reproduce it. Keep the generic Get-shape merged; defer the MKI-security branch until the Scout-on-MKI expectation strategy is confirmed (`NEEDS VERIFICATION`).
- ES forward-compat gating (`this.onlyEsVersion('8.19 || >=9.1')` in `SF-UI/index_mode.ts:33` and `SF-API/data_streams_index_mode.ts:24`): Scout has no `onlyEsVersion` mechanism (checked `kbn-scout` sources). If Scout suites do not run in the ES forward-compat pipeline this is moot; otherwise these specs need a gate (`NEEDS VERIFICATION` with the DevEx/Scout team before deleting the FTR files).

---

## 2. Test type routing

### UI tests

Proposed spec root: `x-pack/platform/plugins/shared/index_management/test/scout/ui/tests/`.

| FTR file | Proposed spec path | Key flows covered |
|----------|--------------------|-------------------|
| `SF-UI/create_enrich_policy/create_enrich_policy.ts` + `SL-UI/create_enrich_policy.ts` | `ui/tests/create_enrich_policy.spec.ts` | Wizard title/docs link, two-step policy creation, redirect + list assertion |
| `SF-UI/enrich_policies_tab/enrich_policies_tab.ts` + `SL-UI/enrich_policies.ts` | `ui/tests/enrich_policies.spec.ts` | List + docs link, details flyout + URL state, execute policy, delete policy |
| `SF-UI/enrich_policies_tab/enrich_policies_tab.ts` (access block) | `ui/tests/enrich_policies_access.spec.ts` | monitor_enrich-only hides create/delete; monitor-only hides the tab |
| `SF-UI/data_streams_tab/data_streams_tab.ts` + `SL-UI/data_streams.ts` (shared flows) | `ui/tests/data_streams.spec.ts` | Details flyout + URL, retention 7d, infinite retention, failure store enable/disable |
| `SF-UI/data_streams_tab/data_streams_tab.ts` (bulk modal) | `ui/tests/data_streams_bulk_retention.spec.ts` | Bulk edit retention for 2 streams, disable retention, success toasts |
| `SF-UI/data_streams_tab/index_mode.ts` + `SL-UI/data_streams.ts` (index-mode block) | `ui/tests/data_streams_index_mode.spec.ts` | Index mode shown in flyout (standard/logsdb); template-edit journey standard↔logsdb + rollover |
| `SL-UI/data_streams.ts` (serverless-only cases) | `ui/tests/data_streams_serverless.spec.ts` | No ILM/DLM method picker on serverless; security project-level retention callout |
| `SF-UI/index_templates_tab/index_template_tab.ts` + `SL-UI/index_templates.ts` | `ui/tests/index_template_lifecycle.spec.ts` (create w/ retention, frozen phase, logsdb) + `ui/tests/index_template_modify_logsdb.spec.ts` (modify settings/mappings, synthetic source error) | Wizard lifecycle config, review-request assertions, logsdb edit round-trip |
| `SF-UI/index_templates_tab/index_template_list.ts` | `ui/tests/index_template_list.spec.ts` | Managed-template delete warning callout; linked ingest pipeline navigation (from `index_template_tab.ts` list block) |
| `SL-UI/component_templates.ts` | `ui/tests/component_templates.spec.ts` | List shows created template; create wizard end-to-end |
| `SL-UI/indices.ts` (manage block) + `SL-UI/index_detail.ts` (details block) | extend existing `ui/tests/home_page.spec.ts` / `ui/tests/index_details_page.spec.ts` + new `ui/tests/indices_manage.spec.ts` | Manage-index context menu → overview/settings/mappings tabs, delete index, mappings add-field / edit-settings enabled |

### API tests

Proposed spec root: `x-pack/platform/plugins/shared/index_management/test/scout/api/tests/` (new; pattern already used by e.g. `x-pack/platform/plugins/private/painless_lab/test/scout/api`).

| FTR file | Proposed spec path | Why API not UI |
|----------|--------------------|----------------|
| `SF-API/indices.ts` + `SL-API/indices.ts` + `SF-API/create_index.ts` + `SF-API/index_details.ts` | `api/tests/indices.spec.ts` | Pure HTTP contract on list/create/reload/delete/details |
| `SF-API/indices.ts` (actions) | `api/tests/indices_actions.spec.ts` | close/open/flush/refresh/forcemerge/clear-cache, verified via ES cat/stats |
| `SF-API/index_doc_count.ts` | `api/tests/index_doc_count.spec.ts` | Doc-count aggregation correctness |
| `SF-API/mapping.ts` + `SL-API/mappings.ts` | `api/tests/mappings.spec.ts` | Get/update mapping round-trip |
| `SF-API/settings.ts` + `SL-API/settings.ts` | `api/tests/settings.spec.ts` | Get/update settings + defaults contract |
| `SF-API/stats.ts` | `api/tests/stats.spec.ts` | Stats shape contract (stateful-only) |
| `SF-API/data_streams.ts` + `SL-API/datastreams/*` | `api/tests/data_streams.spec.ts` | DS CRUD/retention/failure-store/rollover contract |
| `SF-API/data_streams_index_mode.ts` + `SL-API/datastreams/ds_common.ts` (logsdb block) | `api/tests/data_streams_index_mode.spec.ts` | indexMode matrix vs persistent cluster settings |
| `SF-API/failure_store_settings.ts` + `SL-API/failure_store_settings.ts` | `api/tests/failure_store_settings.spec.ts` | Settings endpoint contract |
| `SF-API/templates.ts` + `SL-API/index_templates.ts` | `api/tests/index_templates.spec.ts`, `api/tests/index_templates_legacy.spec.ts`, `api/tests/index_templates_logsdb_mode.spec.ts` | Template serialization contracts, ES error parsing |
| `SF-API/component_templates.ts` + `SL-API/index_component_templates.ts` | `api/tests/component_templates.spec.ts` | Component template CRUD + datastreams lookup |
| `SF-API/enrich_policies.ts` + `SL-API/enrich_policies.ts` | `api/tests/enrich_policies.spec.ts` | List/execute/delete contract |
| `SF-API/create_enrich_policy.ts` + `SL-API/create_enrich_policies.ts` | `api/tests/create_enrich_policy.spec.ts` | Create + field/index discovery endpoints |
| `SF-API/cluster_nodes.ts` + `SL-API/cluster_nodes.ts` | `api/tests/cluster_nodes.spec.ts` | 200 stateful / 410 serverless contract |
| `SF-API/snapshot_repositories.ts` | `api/tests/snapshot_repositories.spec.ts` | Default-repository reporting (stateful-only) |
| `SF-API/data_enrichers/ilm.ts` | `api/tests/data_enrichers_ilm.spec.ts` | ILM enricher output (stateful-only) |
| `SF-API/searchprofiler.ts` | `searchprofiler/test/scout/api/tests/has_indices.spec.ts` (tracked in #281700, out of this migration's scope) | Route belongs to the searchprofiler plugin |
| `SF-API/disabled_data_enrichers/indices.ts` | deferred (custom server config set) | Boot-time plugin disabling |

### Unit tests (RTL/Jest)

None. No FTR case in these suites reduces to an isolated component behavior — they all exercise Kibana HTTP routes against real ES or multi-page user flows.

---

## 3. Parallelism plan

Scout runs UI specs in parallel workers by default; all four FTR suites use **fixed resource names** (`test-ds-1`, `a_test_template`, `test_index`, `index-template-test-name`, `.a_test_component_template`) and mutate **global cluster state** (templates, data streams, enrich policies are not space-scoped). The single most valuable change during migration: **suffix every resource name with a per-spec random string** (the suites already do this in places via `Math.random()`), which makes most specs parallel-safe without further isolation.

### Parallel-safe (can be space-isolated)

Index Management state is cluster-scoped, not space-scoped — "parallel-safe" here means "collision-free via unique resource names", not space isolation.

| Proposed spec | Why parallel-safe |
|--------------|------------------|
| `api/tests/indices.spec.ts`, `indices_actions.spec.ts`, `index_doc_count.spec.ts`, `mappings.spec.ts`, `stats.spec.ts` | Only touch indices they create with unique/random names |
| `api/tests/index_templates.spec.ts`, `component_templates.spec.ts` (CRUD blocks) | Random template names; assertions find-by-name in lists |
| `api/tests/enrich_policies.spec.ts`, `create_enrich_policy.spec.ts` | Random policy/index names |
| `ui/tests/create_enrich_policy.spec.ts`, `component_templates.spec.ts`, `index_template_*.spec.ts` | Own randomized resources, list lookups by name |
| `ui/tests/data_streams*.spec.ts` | Own data streams — provided names are randomized during migration (today `test-ds-1` collides across the two stateful UI files and the serverless file) |

### Must be sequential

| Proposed spec | Why sequential |
|--------------|---------------|
| `api/tests/data_streams_index_mode.spec.ts` | Mutates persistent cluster settings `cluster.logsdb.enabled` / `logsdb.prior_logs_usage` that change indexMode resolution for every concurrently-running data-stream test |
| `api/tests/index_templates_logsdb_mode.spec.ts` | Same persistent cluster-settings matrix |
| `api/tests/failure_store_settings.spec.ts` | Mutates `data_streams.lifecycle.retention.failures_default` (persistent, cluster-wide) |
| `api/tests/snapshot_repositories.spec.ts` | Mutates `repositories.default_repository` (persistent, cluster-wide) |
| `ui/tests/index_template_lifecycle.spec.ts` (frozen-phase case) | Stateful setup registers a default snapshot repository + sets `repositories.default_repository` (from `index_template_tab.ts:47-71`) |
| `ui/tests/enrich_policies.spec.ts` (list assertions) | `home_page.spec.ts` already deletes **all** enrich policies in `beforeAll` and asserts the enrich tab shows `sectionEmpty`; enrich-policy specs asserting exact list lengths (`policyList.length === 1`, `SF-UI/create_enrich_policy.ts:91`) collide with any concurrently created policy — either make assertions name-scoped or serialize the enrich specs |
| `api/tests/enrich_policies.spec.ts` / `create_enrich_policy.spec.ts` vs `ui` enrich specs | Same global enrich-policy namespace; recommend name-scoped assertions (contains-by-name instead of exact array equality — `SF-API/enrich_policies.ts:49` asserts the whole array equals one policy) |

---

## 4. Test data and setup

### Archives inventory

None. No `esArchiver` or `kbnArchiver` usage anywhere in the four suites — all data setup is programmatic via the ES client (index templates, data streams, indices, enrich policies, component templates, ILM policies, snapshot repositories). This ports cleanly to Scout's `esClient` fixture.

| Archive path | Contents | Size | Used by (files) | Verdict |
|-------------|----------|------|-----------------|---------|
| — | — | — | — | No archives to migrate |

### UI settings mutations

None. No `kibanaServer.uiSettings.*` calls in any of the four suites. One localStorage mutation exists instead (see smells): `browser.setLocalStorageItem('showProjectLevelRetention', 'true')` in `SL-UI/data_streams.ts:162`.

| FTR call | Semantics | Files |
|----------|-----------|-------|
| — | — | No uiSettings usage |

### Shared constants to extract (omit if empty)

| Value | Occurrences | Current locations |
|-------|-------------|-------------------|
| `'/api/index_management'` / `'/internal/index_management'` | 8+ files | `SF-API/constants.ts:8-9`, re-declared literally in `SF-API/create_enrich_policy.ts:11`, `SF-API/searchprofiler.ts:10`, `SL-API/indices.ts:13`, `SL-API/create_enrich_policies.ts:12`, `SL-API/datastreams/*.ts`, `SL-API/failure_store_settings.ts:13`, `SL-API/index_templates.ts:13` — import `API_BASE_PATH`/`INTERNAL_API_BASE_PATH` from `@kbn/index-management-plugin/common` instead of extracting a new constant (`SF-API/index_details.ts:9` already does) |
| `sortedExpectedIndexKeys` (index-object key contract) | 3 files | `SF-API/constants.ts:13-34`, used by `indices.ts:10`, `index_details.ts:11`, `disabled_data_enrichers/indices.ts:12`; serverless expects a different (smaller) list inline — keep as a plugin-local test helper with stateful/serverless variants |
| Template payload factory (`getTemplatePayload`, `getSerializedTemplate`) | 2 suites | `SF-API/lib/templates.helpers.ts` and `SL-API/services/.../svl_templates.helpers.ts` are near-identical — port once as a plugin-local Scout helper |
| Data-stream factory (`createDataStream(name, indexMode?)` + delete/rollover/getMapping) | 2 suites + 3 UI files re-implement inline | `SF-API/lib/datastreams.helpers.ts`, `svl_datastreams.helpers.ts`, inline copies in `SF-UI/data_streams_tab/data_streams_tab.ts:29-55`, `index_mode.ts:37-64`, `SL-UI/data_streams.ts:59-90` — one plugin-local helper |

### Fresh server required (omit if none)

- `SF-API/disabled_data_enrichers/indices.ts`: needs Kibana booted with rollup/ccr/ilm UI plugins disabled — the only test in the whole migration that cannot share the default servers.

---

## 5. Auth and roles

### Role inventory

| Role name | Source | Privileges (summary) | Used by (files) | Scout role target | Notes |
|-----------|--------|---------------------|-----------------|-------------------|-------|
| `index_management_user` | `x-pack/platform/test/functional/config.base.ts:627-644` | ES: cluster `monitor, manage_index_templates, manage_enrich`; indices `*: all`; Kibana: `advancedSettings: read`, all spaces | All 6 stateful UI files; referenced (ineffectively) by 3 serverless UI files | Existing Scout `loginAsIndexManagementUser()` (custom role in `test/scout/ui/fixtures/custom_roles.ts`) | Already ported; reuse as-is |
| `index_management_monitor_enrich_only` | `SF-UI/config.ts:75-93` | ES: cluster `monitor_enrich`; indices `*: all`; Kibana `advancedSettings: read` | `enrich_policies_tab.ts:127` (1 file) | `loginWithCustomRole` with a new plugin-local role | Genuinely permission-scoped behavior under test (read-only enrich UI) — keep custom |
| `index_management_monitor_only` | `SF-UI/config.ts:35-53` | ES: cluster `monitor`; indices `*: all`; Kibana `advancedSettings: read` | `enrich_policies_tab.ts:135` (1 file) | `loginWithCustomRole` with a new plugin-local role | Permission-scoped (enrich tab hidden) — keep custom |
| `index_management_manage_index_templates` | `SF-UI/config.ts:15-33` | cluster `manage_index_templates` | **0 files** | drop | Dead config — defined but never referenced by any remaining FTR test |
| `index_management_manage_enrich_only` | `SF-UI/config.ts:55-73` | cluster `manage_enrich` | **0 files** | drop | Dead config — same |
| FTR default user / `supertest` | `x-pack/platform/test/api_integration/config.ts` (inherits x-pack base) | superuser-equivalent | All 19 stateful API files | Scout API auth default (`requestAuth`/admin API key) | Over-privileged but standard for management API contract tests; downgrade optional |
| serverless `admin` (M2M API key + cookie) | every `SL-API` file via `svlUserManager.createM2mApiKeyWithRoleScope('admin')` / `roleScopedSupertest` | serverless operator/admin | All 12 serverless API files | Scout API auth `admin` | Direct mapping |
| serverless `loginAsAdmin()` | every `SL-UI` file via `svlCommonPage` | serverless admin | All 7 serverless UI files | `browserAuth.loginAsAdmin()` — or preferably reuse the custom `indexManagementUser` role on both envs | Custom-role login on serverless/MKI support: `NEEDS VERIFICATION` |

### Over-privileged tests

| File | What it actually exercises | Suggested minimum privilege |
|------|---------------------------|----------------------------|
| `SL-UI/indices.ts:23-24`, `index_detail.ts:19-20`, `data_streams.ts:92-93` | Set `index_management_user` roles then immediately `loginAsAdmin()` — the setRoles call is dead code; tests run as full admin | Use the same `indexManagementUser` custom role as stateful (if serverless custom-role login is verified) so both envs test the intended privilege level |
| All stateful API files | Route authorization is enforced per-route (`manage`, `monitor`) but tests run as superuser | Acceptable for contract tests; a follow-up could add negative-authz cases, out of scope here |

### Roles deserving shared helpers (used in ≥3 files)

- `index_management_user` / `indexManagementUser`: all UI specs — already a shared fixture (`loginAsIndexManagementUser` in `test/scout/ui/fixtures/index.ts`); keep.
- Serverless admin API auth: every API spec — handled by Scout's built-in API auth fixtures, no new helper needed.

### Special auth patterns (omit if none)

- `svlUserManager.createM2mApiKeyWithRoleScope('admin')` + `roleAuthc.apiKeyHeader` in every serverless API file: API-key-based auth. Scout's API testing fixtures cover role-scoped API auth; no 1:1 port of the M2M key lifecycle (create/invalidate in before/after) is needed.

---

## 6. Reusability audit

### FTR services and page objects in use

| FTR name | What it does | Used by (files) | Scout equivalent exists? | Hidden assertions? | Recommended scope |
|----------|-------------|-----------------|-------------------------|-------------------|-------------------|
| `PageObjects.indexManagement` (`x-pack/platform/test/functional/page_objects/index_management_page.ts`) | Navigation, tab switching, table interactions, create-index modal, manage-index menu, details-page helpers | all 13 UI files | Partially — plugin-local Scout `IndexManagement` PO covers goto/tabs/create-index/details-load/wizard-step-1 | yes: `expectToBeOnIndexManagement` (line 22), `expectIndexToExist` (250), `expectIndexIsDeleted` (284), `confirmDeleteModalIsVisible` (272, asserts modal text), `indexDetailsPage.expect*` (192-229), `manageIndexContextMenuExists` (328) | Extend the plugin-local Scout PO; move assertions into specs |
| `PageObjects.common` | `navigateToApp`, `sleep` | all UI files | yes (Scout `gotoApp`) | no | use existing |
| `PageObjects.header.waitUntilLoadingHasFinished` | global loading-indicator wait | `SF-UI/*`, `SL-UI/*` (very frequent) | restricted in Scout | yes (throws on timeout) | replace with content-specific waits per Scout best practice |
| `PageObjects.svlCommonPage` | serverless login | all `SL-UI` files | yes (`browserAuth`) | no | use existing |
| `PageObjects.appMenu.menuItemExists` | app menu item lookup | `create_enrich_policy` (both envs) | check `page.testSubj` direct locator | no | inline locator |
| `getService('testSubjects')` | element ops incl. `existOrFail`/`missingOrFail` | all UI files | yes (`page.testSubj`) | yes (`existOrFail`/`missingOrFail` are assertions) | convert to explicit `expect().toBeVisible()/toBeHidden()` |
| `getService('comboBox')` | EUI combo box set | `create_enrich_policy` (both), `index_template_tab.ts` | yes — Scout EUI wrappers (`page.components` / `EuiComboBoxWrapper`) | no | use Scout EUI wrappers |
| `getService('toasts')` | toast count/content/dismiss | `data_streams_tab.ts`, `enrich_policies_tab.ts` | yes — Scout toasts fixture/EUI toast helpers | yes (`assertCount`) | use existing, assertions in spec |
| `getService('flyout')` | close any flyout | `enrich_policies_tab.ts:92`, `SL-UI/enrich_policies.ts:88` | trivial with locators | no | inline (`closeDetailsButton` / ESC) |
| `getService('es')` | raw ES client for setup/teardown | nearly every file | yes (`esClient` fixture) | no | use existing |
| `getService('esDeleteAllIndices')` | wipe listed indices incl. wildcards | API suites + `SL-UI/indices.ts` | partial — `esClient.indices.delete` with `ignore:[404]` | no | plugin-local helper (port of `indices.helpers.deleteAllIndices` tracking pattern) |
| `getService('supertest')` / `supertestWithoutAuth` / `roleScopedSupertest` | HTTP clients | all API files | yes (Scout `apiClient` + auth fixtures) | no | use existing |
| `getService('security').testUser.setRoles` | swap default test user's roles mid-suite | stateful UI files | Scout `browserAuth.loginWithCustomRole` (fresh login instead of mutation) | no | use existing; one role per spec |
| `getService('retry')` | retry loops | UI files | Playwright auto-wait + `expect.poll` | no | mostly eliminated by web-first assertions |
| `svl*` API services (14 files under `x-pack/platform/test/serverless/api_integration/services/index_management/`) | serverless clones of `SF-API/lib` | all `SL-API` files | no | `svl_datastreams.helpers.assertDataStreamStorageSizeExists` embeds expects (same in stateful `datastreams.helpers.ts:78-88`) | plugin-local Scout API helpers, written once for both envs |
| `svlCommonApi.assertResponseStatusCode` | status assertion with body dump | all `SL-API` files | n/a | yes (assertion helper) | replace with plain `expect(status)` |

### EUI components interacted with directly

| Component | Interaction pattern | Files |
|----------|-------------------|-------|
| `EuiComboBox` | set value / clear (`comboBox.set`, `comboBoxClearButton`, `comboBoxInput` + Enter) | `SF-UI/create_enrich_policy.ts:75-80`, `SL-UI/create_enrich_policy.ts:82-88`, `SF-UI/index_template_tab.ts:239-246`, `SL-UI/index_templates.ts:182-184` |
| `EuiSwitch` | `isEuiSwitchChecked` + click (`dataStreamField > input`), `includeStatsSwitch`, `subobjectsToggle` | `SF-UI/index_template_tab.ts:76-87`, Scout `home_page.spec.ts:149` |
| `EuiCheckbox` | inherit-lifecycle checkbox, row-select checkboxes (`checkboxSelectRow-<name>`, `input[id="checkboxSelectIndex-<name>"]`) | `SF-UI/data_streams_tab.ts:101-117`, page object `clickBulkEditDataRetention:53-62`, `manageIndex:313-327` |
| `EuiSelect` | `selectValue` for duration units (`deleteDurationUnit`, `frozenDurationUnit`) | `SF-UI/index_template_tab.ts:113,134` |
| Monaco editor (`kibanaCodeEditor`) | `setValue` with `clearWithKeyboard` | `SF-UI/index_template_tab.ts:213-229`, `SF-UI/index_mode.ts:266-294`, `SL-UI/index_templates.ts:158-174` |
| `EuiFlyout` | open/close via test subjects, ESC key | data streams + enrich policies files |
| `EuiToast` | count/content/dismiss | `SF-UI/data_streams_tab.ts:185-218`, `enrich_policies_tab.ts:99-121` |
| Form wizard steps | `formWizardStep-N` direct step jumps | all template/index-mode files |

### Brittle locator strategies

| File | Line | Current locator | Target component |
|------|------|----------------|-----------------|
| `page_objects/index_management_page.ts` | 65, 69, 80 | `find.clickByLinkText(name)` / `find.existsByLinkText` | Template/data-stream name links (have `data-test-subj` alternatives: `templateDetailsLink`, `dataStreamTable` links — prefer role/name locators) |
| `page_objects/index_management_page.ts` | 125, 251, 286 | `find.byCssSelector('table')` | Indices table (use `indexTable` test subj) |
| `page_objects/index_management_page.ts` | 315-317 | `find.byCssSelector('input[id="checkboxSelectIndex-${name}"]')` | Row-select checkbox — id is stable but a `data-test-subj` would be better; Playwright can use `#id` locator without source change |
| `SF-UI/index_template_tab.ts` | 39-43, 183-186 | `browser.execute(() => document.querySelector('[data-test-subj="reloadButton"]').click())` | Bypasses actionability entirely — replace with a normal locator click |
| Scout PO `index_management_page.ts` | 139-156 | `.kbnSolutionNav`, `.euiSideNavItem--root` CSS classes | Sidebar smoke test reads EUI internals — existing debt, unchanged by this migration |

No mandatory `data-test-subj` additions to source code were identified; all flows have workable stable locators.

### Page objects with hidden assertions

| FTR helper | Method | Assertion | File:line |
|-----------|--------|-----------|-----------|
| `PageObjects.indexManagement` | `expectToBeOnIndexManagement` | `expect(headingText).to.be('Index Management')` | `index_management_page.ts:22-25` |
| `PageObjects.indexManagement` | `expectIndexToExist` / `expectIndexIsDeleted` | list-membership expects (+ StaleElementReference swallowing in the latter) | `index_management_page.ts:250-259, 284-312` |
| `PageObjects.indexManagement` | `confirmDeleteModalIsVisible` | asserts modal title text mid-action, then clicks confirm | `index_management_page.ts:272-282` |
| `PageObjects.indexManagement.indexDetailsPage` | `expectIndexDetailsPageIsLoaded`, `expectUrlShouldChangeTo`, `expectEditSettingsToBeEnabled`, `expectIndexDetailsMappingsAddFieldToBeEnabled`, `expectTabsExists`, `expectBreadcrumbNavigationToHaveBreadcrumbName` | `existOrFail`/URL expects inside PO | `index_management_page.ts:192-229` |
| `datastreams.helpers` / `svl_datastreams.helpers` | `assertDataStreamStorageSizeExists` | 4 expects on storage size types | `SF-API/lib/datastreams.helpers.ts:78-88` |
| `svlCommonApi` | `assertResponseStatusCode` | throws with body dump | serverless shared service |
| `testSubjects` | `existOrFail` / `missingOrFail` | throw-on-absence/presence | FTR built-in, pervasive |

---

## 7. Server configuration

### FTR server args (full chain)

Only args relevant to these suites are listed; the x-pack base config args (encryption keys, etc.) are already in Scout's default config.

| Arg | Source config | Category | Notes |
|-----|-------------|----------|-------|
| `--xpack.rollup.ui.enabled=false` | `SF-API/disabled_data_enrichers/config.ts:21` | requires a custom server config set | Plugin UI enablement is read at Kibana boot; not runtime-settable. No existing Scout config set under `src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/` disables these plugins |
| `--xpack.ccr.ui.enabled=false` | `SF-API/disabled_data_enrichers/config.ts:22` | requires a custom server config set | same |
| `--xpack.ilm.ui.enabled=false` | `SF-API/disabled_data_enrichers/config.ts:23` | requires a custom server config set | same |
| `--xpack.security.session.idleTimeout=3600000`, `--telemetry.optIn=true`, fleet/ruleRegistry/monitoring args | `x-pack/platform/test/api_integration/config.ts:29-35` | not needed | Incidental base-config args, unrelated to index_management behavior |
| serverless project args (`--coreApp.allowDynamicConfigOverrides`, dataUsage flags) | `x-pack/platform/test/serverless/*/configs/*/config.group1.ts` | not needed | Unrelated to these suites |

### ES server args

| Arg | Source config | Notes |
|-----|-------------|-------|
| `path.repo=/tmp/repo,/tmp/repo_1,/tmp/repo_2,/tmp/cloud-snapshots/` | `x-pack/platform/test/api_integration/config.ts:43` | Needed by `snapshot_repositories.ts` (`location: '/tmp/repo'`) and `SF-UI/index_template_tab.ts` frozen-phase setup (`location: '/tmp/'`). **Scout's default stateful config already sets the same `path.repo`** (`kbn-scout/src/servers/configs/config_sets/default/stateful/base.config.ts:92-93`) — no custom config needed locally. Cloud portability is a separate concern (section 8) |
| `node.attr.name=apiIntegrationTestNode` | `x-pack/platform/test/api_integration/config.ts:42` | Not used by these tests |

### Custom server config needed? (omit if all args are covered)

- **Reason**: only `disabled_data_enrichers` needs boot-time args (`xpack.rollup.ui.enabled=false`, `xpack.ccr.ui.enabled=false`, `xpack.ilm.ui.enabled=false`).
- **Closest existing config set**: none (reviewed the ~40 config sets under `kbn-scout/src/servers/configs/config_sets/` — none disables these plugin UIs).
- **Args that require it**: the three flags above.
- **Recommendation**: defer this single-`it` suite (batch 4) and decide with owners whether a new config set is worth the CI cost, or whether the enricher-registration behavior can be covered by a Jest integration test on the route handler instead (`NEEDS VERIFICATION` with the Kibana Management team).

---

## 8. Deployment targets

Where FTR runs today (from `.buildkite/ftr-manifests/`): stateful UI config at `ftr_platform_stateful_configs.yml:236`; stateful API via `ftr_platform_stateful_configs.yml:392` (`apis/management/config.ts`) plus the disabled-enrichers config at line 393; serverless UI+API via the search/security/observability `config.group1.ts` entries in `ftr_search_serverless_configs.yml`, `ftr_security_serverless_configs.yml`, `ftr_oblt_serverless_configs.yml` (both serverless suites are additionally gated with `this.tags(['esGate'])`).

Platform plugin → merged specs should use `tags.deploymentAgnostic` where the flow exists everywhere, per platform convention.

| Proposed spec | Where it should run | Reasoning |
|--------------|--------------------|-----------|
| `api/tests/indices.spec.ts`, `mappings.spec.ts`, `settings.spec.ts`, `enrich_policies.spec.ts`, `create_enrich_policy.spec.ts`, `component_templates.spec.ts`, `data_streams.spec.ts`, `failure_store_settings.spec.ts`, `index_templates.spec.ts`, `cluster_nodes.spec.ts` | everywhere (`tags.deploymentAgnostic`) | Mirrored FTR coverage exists on both sides; env differences are expectation-level (handled in-spec) |
| `api/tests/indices_actions.spec.ts`, `stats.spec.ts`, `index_templates_legacy.spec.ts`, `snapshot_repositories.spec.ts`, `data_enrichers_ilm.spec.ts` | stateful only | Endpoints/features (close/open/flush, stats, legacy templates, snapshot repos, ILM) not available on serverless |
| `api/tests/index_doc_count.spec.ts` | stateful now; expand if endpoint verified on serverless | Currently only wired in the stateful suite; `NEEDS VERIFICATION` |
| `api/tests/data_streams_index_mode.spec.ts`, `index_templates_logsdb_mode.spec.ts` | everywhere, env-conditional expectation matrices | Stateful and serverless defaults for `cluster.logsdb.enabled` differ (see FTR comments `SF-API/data_streams_index_mode.ts:59-62` vs `SL-API/ds_common.ts:54`) |
| `ui/tests/create_enrich_policy.spec.ts`, `enrich_policies.spec.ts`, `data_streams.spec.ts`, `data_streams_index_mode.spec.ts`, `component_templates.spec.ts`, `index_template_modify_logsdb.spec.ts` | everywhere | Mirrored flows on both sides |
| `ui/tests/index_template_lifecycle.spec.ts`, `index_template_list.spec.ts`, `data_streams_bulk_retention.spec.ts`, `enrich_policies_access.spec.ts` | stateful only (pending verification for bulk retention + serverless custom roles) | Frozen phase needs snapshot repo; managed `ilm-history-7` template is ILM; bulk retention/access flows unverified on serverless |
| `ui/tests/data_streams_serverless.spec.ts` | serverless only | Asserts ILM absence and project-level retention callout |
| Existing Scout specs (`home_page`, `index_details_page`, wizard ×3) | widen from `tags.stateful.classic` toward serverless where the SL FTR mirrors prove the flow works | This is the dedupe payoff — but note the SL FTR `indices.ts`/`index_detail.ts` carry `skipSvlSearch` (the search solution ships its own index-management UI suites), so widened tags should exclude the search project for those flows, mirroring today's coverage |

### Stateful/serverless mirror FTR files

Mirror-suite discovery was performed by basename, `describe` titles, and `loadTestFile` references across `x-pack/platform/test/**`, `x-pack/solutions/**/test/**`, and `src/platform/test/**`. Beyond the four suites in scope, related-but-out-of-scope suites found: `x-pack/solutions/search/test/serverless/functional/test_suites/index_management.ts` and `x-pack/solutions/search/test/functional_search/tests/index_management.ts` + `search_index_details.ts` (search-solution-owned UI variants of the indices/manage-index flows — the reason `SL-UI/indices.ts`/`index_detail.ts` are tagged `skipSvlSearch`; leave them untouched, they are not part of issue #281244), and `x-pack/platform/test/accessibility/apps/group1/management.ts` (a11y suite, out of scope).

API mirrors (the issue's key directive — merge counts: **10 merge, 6 stateful-only keep, 1 drop-one-side**):

| Primary FTR file | Mirror FTR file | Similarity | Current tags/skips | Decision | Notes |
|------------------|-----------------|------------|--------------------|----------|-------|
| `SF-API/indices.ts` | `SL-API/indices.ts` | near-identical (list/create/reload/delete/get) + stateful-extra actions | SL: `esGate` (suite-level) | merge + stateful-only actions spec | Expected index keys differ (16 keys vs 6/7); serverless has no close/open/flush/refresh/forcemerge/clear-cache |
| `SF-API/index_details.ts` + `create_index.ts` | `SL-API/indices.ts` (get/create blocks) | near-identical | — | merge into `indices.spec.ts` | Env-specific keys |
| `SF-API/mapping.ts` | `SL-API/mappings.ts` | near-identical (SL lacks update case) | — | merge | Verify PUT mapping on serverless |
| `SF-API/settings.ts` | `SL-API/settings.ts` | near-identical flow, divergent expected defaults + update field | — | merge | Env-specific expected-defaults lists; update `number_of_replicas` (stateful) vs `refresh_interval` (serverless — replicas not settable) |
| `SF-API/cluster_nodes.ts` | `SL-API/cluster_nodes.ts` | divergent expectation, same endpoint | — | merge | 200+array vs 410 |
| `SF-API/failure_store_settings.ts` | `SL-API/failure_store_settings.ts` | identical | — | merge | Straight merge |
| `SF-API/enrich_policies.ts` | `SL-API/enrich_policies.ts` | identical flow | — | merge | SL asserts `toContainEqual` (list may contain others) — adopt the name-scoped assertion for both |
| `SF-API/create_enrich_policy.ts` | `SL-API/create_enrich_policies.ts` | near-identical; stateful adds data-stream field/matching cases | — | merge | Data-stream cases: verify on serverless, else stateful-tag them |
| `SF-API/data_streams.ts` | `SL-API/datastreams/ds_common.ts` + `ds_serverless.ts` + `ds_mki.ts` | near-identical flows; divergent Get-shapes (metering fields, health green vs yellow, security-MKI retention) | `ds_serverless`: `skipMKI`; `ds_mki`: `skipSvlWorkplaceAI,skipSvlOblt,skipSvlSearch,skipSvlSec` (MKI-only in practice) | merge flows; env-specific Get assertions; defer MKI-security branch | See section 1 #36 |
| `SF-API/data_streams_index_mode.ts` | `SL-API/datastreams/ds_common.ts` (logsdb block) | near-identical matrix, divergent defaults | `onlyEsVersion` on stateful side | merge with env-conditional matrix | `prior_logs_usage` rows are stateful-only (setting doesn't apply on serverless) |
| `SF-API/templates.ts` | `SL-API/index_templates.ts` | near-identical for composable CRUD/simulate/error-parsing; stateful-extra legacy/ILM/frozen/get-all-shapes | — | merge + stateful-only legacy spec | Serverless asserts `legacyTemplates.length === 0` — keep as the serverless-side case in the merged spec |
| `SF-API/component_templates.ts` | `SL-API/index_component_templates.ts` | near-identical (SL lacks Create block, has duplicated Update block) | — | merge; drop `Update #2` | Verify frozen_after/lifecycle create payloads on serverless |
| `SF-API/stats.ts` | — | no mirror | — | keep stateful-only | |
| `SF-API/index_doc_count.ts` | — | no mirror | — | keep stateful-only (verify) | |
| `SF-API/snapshot_repositories.ts` | — | no mirror | — | keep stateful-only | |
| `SF-API/data_enrichers/ilm.ts` | — | no mirror | — | keep stateful-only | |
| `SF-API/disabled_data_enrichers/indices.ts` | — | no mirror | own CI config entry | defer | |
| `SF-API/searchprofiler.ts` | — | no mirror | — | relocate (#281700) | |

UI mirrors (**4 merge, 3 stateful-only keep, 2 serverless-only keep-or-extend, several drops into existing Scout specs**):

| Primary FTR file | Mirror FTR file | Similarity | Current tags/skips | Decision | Notes |
|------------------|-----------------|------------|--------------------|----------|-------|
| `SF-UI/create_enrich_policy/create_enrich_policy.ts` | `SL-UI/create_enrich_policy.ts` | near-identical (auth differs) | — | merge | One deployment-agnostic spec |
| `SF-UI/enrich_policies_tab/enrich_policies_tab.ts` | `SL-UI/enrich_policies.ts` | SL is a 2-case subset | SL: `failsOnMKI` (suite) | merge; execute/delete + access cases carried from stateful side | Investigate the `failsOnMKI` root cause (chrome selector timeout) before tagging MKI |
| `SF-UI/data_streams_tab/data_streams_tab.ts` | `SL-UI/data_streams.ts` (retention/flyout blocks) | near-identical for flyout + retention; SL lacks bulk modal + failure store; SL adds no-ILM + project-retention | SL retention block: `failsOnMKI` (kibana#181242); project-retention: `skipSvlOblt,skipSvlSearch` | merge shared; split env-specific | |
| `SF-UI/data_streams_tab/index_mode.ts` | `SL-UI/data_streams.ts` (`Modify data streams index mode` block) | near-identical journeys | SF: `skipFIPS`, `onlyEsVersion` | merge | 2 `it.skip` TSDS cases dropped on both sides |
| `SF-UI/index_templates_tab/index_template_tab.ts` (modify-logsdb case) | `SL-UI/index_templates.ts` (`Modify index template` block) | near-identical | SF: `skipFIPS` on the modification describe | merge | Timestamp-format combobox handling differs slightly (SF has retry hardening) — keep the hardened variant |
| `SF-UI/index_templates_tab/index_template_tab.ts` (creation cases) | `SL-UI/index_templates.ts` (`Create index template` cases) | overlapping (logsdb create on both; retention/frozen stateful-only; plain create serverless-only) | — | merge logsdb create; retention/frozen stateful-only; plain create dropped (Scout wizard spec covers it) | |
| `SF-UI/index_templates_tab/index_template_list.ts` | — | no mirror | — | keep stateful-only | Managed-template callout relies on ILM-managed template |
| `SL-UI/indices.ts` | — (stateful equivalent already migrated to Scout `home_page.spec.ts`) | partial overlap with existing Scout | `skipSvlSearch` | drop duplicates; migrate manage-index/delete flows; widen Scout tags | |
| `SL-UI/index_detail.ts` | — (Scout `index_details_page.spec.ts`) | partial overlap | `skipSvlSearch` | drop duplicates; extend Scout details spec | |
| `SL-UI/component_templates.ts` | — | no stateful FTR mirror (stateful coverage = Scout `home_page` tab render only) | — | migrate as deployment-agnostic | |

### Coverage gaps (omit if none)

- Existing Scout specs (`home_page`, `index_details_page`, wizard ×3, sidebar smoke) run stateful-classic only; the serverless FTR mirrors prove most of these flows exist on serverless — widen tags during migration (except search-project exclusions noted above, and the sidebar smoke test which is stateful-specific navigation).
- `SL-UI/component_templates.ts` create-wizard flow has no stateful FTR/Scout equivalent — the merged spec adds stateful coverage for free.
- `SF-API/index_doc_count.ts` runs stateful-only today; the internal endpoint likely exists on serverless (`NEEDS VERIFICATION`) — cheap win if so.

### Cloud portability issues (omit if none)

| File | Line | Issue |
|------|------|-------|
| `SF-API/disabled_data_enrichers/config.ts` | 21-23 | Boot-time plugin-disabling flags — cannot run on Cloud at all without a custom (local-only) server config set |
| `SF-API/snapshot_repositories.ts` | 27-38 | Registers an `fs` repository at `/tmp/repo` — `fs` repositories are not available on ECH/MKI (only local); the spec must stay local-stateful or switch to a cloud-compatible repository type (`NEEDS VERIFICATION` whether ECH's `found-snapshots` repo can serve as the "default repository" fixture) |
| `SF-UI/index_template_tab.ts` | 47-61 | Same `fs`/`/tmp/` snapshot repository + `repositories.default_repository` persistent setting for the frozen-phase wizard case |
| `SF-API/data_streams_index_mode.ts`, `SF-API/templates.ts`, `SL-API/ds_common.ts`, `SL-API/index_templates.ts` | 67-78 / 401-412 / 59-67 / 204-212 | `es.cluster.putSettings({persistent: ...})` for logsdb flags — allowed on MKI/ECH? Operator-only cluster settings may be rejected on Cloud (`NEEDS VERIFICATION`); if rejected, the logsdb-matrix specs are local-only |
| `SL-API/datastreams/ds_mki.ts` | 27-28, 63-64 | Reads `kbnTestServer.serverArgs` via `getopts` to infer project type — config introspection has no Scout equivalent; replace with Scout's project-type awareness (tags) |
| `SF-UI/index_mode.ts`, `SF-API/data_streams_index_mode.ts` | 33 / 24 | `onlyEsVersion` forward-compat gate — no Scout equivalent |

---

## 9. FTR test smells

| Smell | File | Lines | Description | Context |
|-------|------|-------|------------|---------|
| Hardcoded timeout | `SF-UI/enrich_policies_tab/enrich_policies_tab.ts` | 109-113 | `await pageObjects.common.sleep(2000)` before deleting a policy | Server disables `wait_for_completion`; replace with polling the enrich policy execution state via ES |
| Hardcoded timeout | `SF-API/enrich_policies.ts` / `SL-API/enrich_policies.ts` | 66 / 70 | `await new Promise(r => setTimeout(r, 2000))` after execute | Same root cause; poll instead |
| Loose status assertion | `SF-API/enrich_policies.ts` / `SL-API/enrich_policies.ts` | 74 / 78 | `expect([200,429]).to.contain(status)` on delete | Masks the race above; after proper polling this should be a strict 200 |
| Shared mutable state / sequential journey | `SF-UI/data_streams_tab/data_streams_tab.ts` | 119-165 | "keep data indefinitely" depends on the previous `it` having set 7d retention | Merge into one test or reset state per test |
| Sequential journey | `SF-UI/create_enrich_policy/create_enrich_policy.ts` + `SL-UI` mirror | 66-92 | `before` clicks the create button (UI-based setup); second `it` continues the wizard the first `it` asserted on | Restructure as a single journey test with `test.step` |
| Conditional test logic | `SF-UI/data_streams_tab/data_streams_tab.ts` | 110-117, 128-131, 152-154, 229-232, 251-254 | `if (exists/isChecked) click` branches inside helpers/its to normalize state | Make setup deterministic (API-created lifecycle state) so branches disappear |
| Conditional test logic | `SL-API/datastreams/ds_mki.ts` | 64-135, 151-229 | `if (projectType === 'security')` selects between two full expected payloads | Split per-project expectations via tags |
| try/catch swallowing | `SF-UI/enrich_policies_tab/enrich_policies_tab.ts` | 29-32 | `try { delete index } catch (e) {}` (eslint-disabled empty block) in `before` | Use `ignore: [404]` options instead |
| try/catch swallowing | `SF-API/lib/templates.api.ts` | 44-52 | `cleanUpTemplates` silently swallows all errors | Port with explicit `ignore: [404]` and let real errors fail |
| Global loading indicator waits | all UI files | pervasive | `header.waitUntilLoadingHasFinished()` after most navigations/clicks | Replace with content-ready assertions (restricted in Scout) |
| Retry wrappers | `SF-UI/index_template_tab.ts` | 77-83, 99-101, 187-192, 239-244 | `retry.try` around click sequences and even around `clickNextButton` in `afterEach` | Symptoms of re-render races; Playwright auto-wait + web-first assertions replace most; the timestamp-combobox retry (239-244) documents a real mid-render race to preserve intentionally |
| DOM-script click | `SF-UI/index_template_tab.ts` | 38-43, 183-186 | `browser.execute(document.querySelector('[data-test-subj="reloadButton"]').click())` | Bypasses visibility/actionability checks — use a locator click |
| UI-based setup | `SF-UI/create_enrich_policy.ts` / `SL-UI/create_enrich_policy.ts` | 44-48 / 49-55 | `before` navigates + clicks "create policy" button | Keep navigation in `beforeEach` but move state prep to API |
| Onboarding/localStorage bypass | `SL-UI/data_streams.ts` | 160-164 | `browser.setLocalStorageItem('showProjectLevelRetention', 'true')` + refresh to force a callout | Document why in the migrated spec; consider a deterministic trigger |
| Brittle selector | `page_objects/index_management_page.ts` | 65-81, 125, 313-317 | `clickByLinkText`, `byCssSelector('table')`, `input[id=...]` | See section 6 |
| Missing cleanup | `SF-API/templates.ts` (logs-*-* block) / `SL-API/index_templates.ts` / `SL-API/ds_common.ts` | 399-417 / 202-221 / 57-77 | Persistent `cluster.logsdb.enabled` / `logsdb.prior_logs_usage` settings are mutated per-iteration and never reset in `after` (last iteration leaves `prior_logs_usage=false` / non-default values) | Add explicit `null` resets in the merged specs' `afterAll` |
| Missing cleanup | `SF-UI/create_enrich_policy.ts` | 19-20 | `Math.random()` names + delete-by-exact-name cleanup: if creation partially fails the wizard-created policy name may differ from `POLICY_NAME` | Low risk; keep names but clean by prefix |
| Over-privileged execution | `SL-UI/indices.ts`, `index_detail.ts`, `data_streams.ts` | 23-24 / 19-20 / 92-93 | `setRoles(['index_management_user'])` immediately followed by `loginAsAdmin()` — role assignment is dead code, tests run as admin | Decide one auth level in the merged specs |
| Duplicate test cases | `SL-API/index_component_templates.ts` | 112-199 vs 201-287 | `Update #1` and `Update #2` are verbatim copies | Drop one |
| Duplicate test cases | `SL-UI/indices.ts` vs `SL-UI/index_detail.ts` | 24-33 / 24-33 | Identical `renders`/`create index` cases in two files | Covered by existing Scout home page spec |
| Brittle contract assertions | `SF-API/settings.ts` | 30-90 | Asserts 49 ES default-settings keys exist — breaks whenever ES adds/removes a default | Preserve intent (detect ES API drift) but consider trimming to a stable subset during migration (call out to owners) |
| Fixed resource names | `SF-UI/data_streams_tab/*`, `SL-UI/data_streams.ts`, API DS files | throughout | `test-ds-1`, `test-data-stream`, `a_test_template`, `test_index` shared across files | Randomize per spec for parallelism (section 3) |

---

## 10. Migration batches

Ordering note: API batches first — they are mechanical, high-count, and validate the merged stateful/serverless tagging approach cheaply before the UI work.

### Batch 1: Simple merged API specs (quick wins)

| # | Proposed spec | From FTR file(s) | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 1 | `api/tests/cluster_nodes.spec.ts` | `SF-API/cluster_nodes.ts` + `SL-API/cluster_nodes.ts` | simple | First merged-tag spec; proves the 200/410 env-conditional pattern |
| 2 | `api/tests/mappings.spec.ts` | `SF-API/mapping.ts` + `SL-API/mappings.ts` | simple | |
| 3 | `api/tests/settings.spec.ts` | `SF-API/settings.ts` + `SL-API/settings.ts` | simple | Env-specific defaults lists |
| 4 | `api/tests/stats.spec.ts` | `SF-API/stats.ts` | simple | stateful-only |
| 5 | `api/tests/failure_store_settings.spec.ts` | both `failure_store_settings.ts` | simple | sequential (cluster setting) |
| 6 | `api/tests/enrich_policies.spec.ts` | both `enrich_policies.ts` | simple | Fix sleep→poll |
| 7 | `api/tests/index_doc_count.spec.ts` | `SF-API/index_doc_count.ts` | medium | stateful first; widen after verification |

- **Human involvement**: `autopilot`
- **Dependencies**: none (new `test/scout/api/playwright.config.ts` scaffold, mirroring e.g. painless_lab)
- **Blockers**: none

### Batch 2: Larger merged API specs

| # | Proposed spec | From FTR file(s) | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 8 | `api/tests/indices.spec.ts` + `indices_actions.spec.ts` | `SF-API/indices.ts`, `create_index.ts`, `index_details.ts`, `SL-API/indices.ts` | medium | Env-specific index-key contracts; port `indices.helpers` as plugin-local helper |
| 9 | `api/tests/data_streams.spec.ts` | `SF-API/data_streams.ts` + `SL-API/datastreams/*` | medium | Env-specific Get shapes; ds_mki security branch deferred |
| 10 | `api/tests/data_streams_index_mode.spec.ts` | `SF-API/data_streams_index_mode.ts` + `ds_common.ts` logsdb block | medium | Sequential; add missing cluster-settings cleanup |
| 11 | `api/tests/create_enrich_policy.spec.ts` | `SF-API/create_enrich_policy.ts` + `SL-API/create_enrich_policies.ts` | medium | Data-stream cases pending serverless verification |
| 12 | `api/tests/index_templates*.spec.ts` (3 specs) | `SF-API/templates.ts` + `SL-API/index_templates.ts` | complex | Port `templates.helpers` once; add settings cleanup |
| 13 | `api/tests/component_templates.spec.ts` | `SF-API/component_templates.ts` + `SL-API/index_component_templates.ts` | complex | Drop duplicated Update block |
| 14 | `api/tests/snapshot_repositories.spec.ts`, `data_enrichers_ilm.spec.ts` | `SF-API/snapshot_repositories.ts`, `data_enrichers/ilm.ts` | medium | stateful/local-only tags |

- **Human involvement**: `guided` (env-conditional expectation matrices and the serverless-endpoint verifications need judgment)
- **Dependencies**: batch 1 (API scaffold + helper patterns)
- **Blockers**: `NEEDS VERIFICATION` items on serverless endpoint parity (PUT mapping, enrich data-stream endpoints, component-template lifecycle payloads, index_doc_count)

### Batch 3: UI specs (merged stateful+serverless) and Scout-spec tag widening

| # | Proposed spec | From FTR file(s) | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 15 | Widen tags on existing Scout `home_page` / `index_details_page` / wizard specs | dedupe of `SL-UI/indices.ts`, `index_detail.ts`, `index_templates.ts` | simple | Exclude search project where FTR used `skipSvlSearch` |
| 16 | `ui/tests/indices_manage.spec.ts` + extend `index_details_page.spec.ts` | `SL-UI/indices.ts` (manage), `index_detail.ts` (details) | medium | New PO methods: manageIndex menu, delete flow |
| 17 | `ui/tests/create_enrich_policy.spec.ts` | both create_enrich_policy UI files | medium | Journey restructure (test.step) |
| 18 | `ui/tests/enrich_policies.spec.ts` | `enrich_policies_tab.ts` + `SL-UI/enrich_policies.ts` | medium | Poll instead of sleep; name-scoped list assertions |
| 19 | `ui/tests/component_templates.spec.ts` | `SL-UI/component_templates.ts` | medium | Deployment-agnostic |
| 20 | `ui/tests/data_streams.spec.ts` + `data_streams_bulk_retention.spec.ts` | `data_streams_tab.ts` + `SL-UI/data_streams.ts` | complex | Randomize DS names; de-conditionalize lifecycle state |
| 21 | `ui/tests/data_streams_index_mode.spec.ts` | `index_mode.ts` + SL index-mode block | complex | onlyEsVersion question must be answered first |
| 22 | `ui/tests/index_template_modify_logsdb.spec.ts` | `index_template_tab.ts` modify block + SL mirror | complex | Keep the hardened combobox handling |

- **Human involvement**: `guided` (auth-level decision for serverless, failsOnMKI root causes, feature-availability verifications)
- **Dependencies**: page-object extensions (created in this batch); custom roles for access specs
- **Blockers**: serverless custom-role login verification; bulk-retention availability on serverless

### Batch 4: Complex / blocked

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 23 | `ui/tests/index_template_lifecycle.spec.ts` | `index_template_tab.ts` creation block | complex | Snapshot-repo default setup; local/stateful-only pending Cloud repo answer |
| 24 | `ui/tests/index_template_list.spec.ts` | `index_template_list.ts` + linked-pipeline case | medium | Depends on managed `ilm-history-7` template existing — stateful-only |
| 25 | `ui/tests/enrich_policies_access.spec.ts` | `enrich_policies_tab.ts` access block | medium | Two new custom roles; FIPS-related caveat noted in FTR (`skipFIPS`) |
| 26 | `ui/tests/data_streams_serverless.spec.ts` | `SL-UI/data_streams.ts` serverless cases | medium | Security-project-only retention callout — per-project tags |
| 27 | `api/tests/disabled_data_enrichers.spec.ts` | `disabled_data_enrichers/indices.ts` | complex | Blocked on new server config set decision |
| 28 | searchprofiler relocation | `SF-API/searchprofiler.ts` | simple | Out of scope — split into #281700 (own plan + PR); that migration deletes the FTR file and the `index.ts:27` entry |

- **Human involvement**: `hands-on` (infrastructure and ownership decisions)
- **Dependencies**: batches 1–3
- **Blockers**: custom server config set (27); Cloud snapshot repository strategy (23); MKI security-project expectations (from batch 2 deferral)

### Scout CI registration (do in the PR that adds the first Scout config)

Required for CI to discover and run the new specs — do once per plugin, and re-run whenever specs or tags change (kapral18, PR #281731 — committing it avoids a later metadata-cleanup PR):

- Add the plugin under `plugins.enabled` (alphabetical) in `.buildkite/scout_ci_config.yml`.
- Regenerate and commit the Scout test-config manifest: `node scripts/scout.js update-test-config-manifests --includingUpToDate --noSummary`. Commit only this plugin's `test/scout/.meta/**`; the command also regenerates other plugins' manifests, so revert that unrelated drift (`git checkout -- <paths>`) before staging.
- Verify discovery finds the config: `node scripts/scout discover-playwright-configs --target local-stateful-only --configs x-pack/platform/plugins/shared/index_management/test/scout/api/playwright.config.ts` (repeat for the `ui/` config; expect "Found Playwright config files in 1 plugin(s)").

---

## 11. Effort summary

| Metric | Value |
|--------|-------|
| Total FTR test files analyzed | 44 (6 stateful UI, 19 stateful API, 7 serverless UI, 12 serverless API) + 10 index files, 3 configs, 25 helper/service files, 1 shared page object |
| > UI tests | 13 FTR files → ~12 Scout UI specs (after merging mirrors and dropping Scout-covered duplicates) |
| > API tests | 31 FTR files → ~17 Scout API specs (10 mirror pairs merged into single tagged specs) |
| > Unit tests (RTL/Jest) | 0 |
| > Dropped | 2 whole files folded/dropped (`create_index.ts` folded, `Update #2` block), ~8 duplicate `it` cases dropped against existing Scout coverage, 4 already-`it.skip` TSDS cases not ported |
| > Deferred | 3 (`disabled_data_enrichers`, ds_mki security-retention branch, `onlyEsVersion`-gated deletion question) + 1 relocation (`searchprofiler`) |
| New page objects needed | 0 new, 1 extended (plugin-local Scout `IndexManagement`: data-stream links/flyout, enrich policy rows, template links/manage menu, manage-index menu, bulk-retention modal) |
| New API services needed | 0 shared; ~4 plugin-local helper modules (ports of `indices/templates/datastreams/component_template` helpers, written once for both envs) |
| `data-test-subj` additions to source code | 0 required (2 optional improvements noted in section 6) |
| Custom server config sets | 1 potentially new (disabled data enrichers — deferred pending decision) / 0 reused beyond the default |
| Migration batches | 4 |

### Risks and open questions

- `NEEDS VERIFICATION` (serverless endpoint parity, gates merges): PUT mapping update; `get_fields_from_indices`/`get_matching_data_streams` with data streams; component-template create with `lifecycle`/`frozen_after`; `index_doc_count` endpoint availability; UI bulk-edit data retention availability.
- `NEEDS VERIFICATION` (platform/infra): custom-role browser login on serverless and MKI (Scout `loginWithCustomRole`); whether `es.cluster.putSettings` for `cluster.logsdb.*` / `repositories.default_repository` / `data_streams.lifecycle.retention.failures_default` is permitted on ECH/MKI (determines whether several merged API specs are Cloud-portable or local-only); Cloud-compatible replacement for the `fs`/`/tmp` snapshot repository fixture; how Scout handles ES forward-compat runs before deleting the two `onlyEsVersion`-gated FTR files; how MKI-only expectations (`ds_mki.ts`, security 396d retention) are expressed in Scout.
- `NEEDS VERIFICATION` (ownership): whether `disabled_data_enrichers` coverage justifies a new server config set or should become a Jest integration test. (The `searchprofiler.ts` relocation question is resolved: split into #281700.)
- Human sign-off wanted: dropping the two dead roles (`index_management_manage_index_templates`, `index_management_manage_enrich_only`) from `SF-UI/config.ts` when the FTR config is deleted; trimming the 49-key ES-defaults contract in `settings.ts`; root-causing the two `failsOnMKI` tags (`SL-UI/enrich_policies.ts`, `SL-UI/data_streams.ts` retention — kibana#181242) instead of blindly excluding MKI.
- FTR deletion sequencing: the stateful UI config and the disabled-enrichers config have their own entries in `.buildkite/ftr-manifests/ftr_platform_stateful_configs.yml` (lines 236, 392–393); serverless suites are loaded from six shared `config.group1.ts` files — removal there must not disturb the sibling suites in those groups.
