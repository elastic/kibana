# FTR to Scout Migration Plan

| Field | Value |
|-------|-------|
| Source | `x-pack/platform/test/functional/apps/lens/group5` |
| Target module root | `x-pack/platform/plugins/shared/lens/test/scout` |
| Generated | `2026-07-21` |
| Deployment targets | stateful classic (matches FTR CI; expand later if serverless verified) |
| FTR config chain | `group5/config.ts` > `x-pack/platform/test/functional/config.base.ts` > `@kbn/test-suites-src` functional/common bases |
| Tracking issue | [#276949](https://github.com/elastic/kibana/issues/276949) |

---

## 1. Test inventory

Sorted by estimated complexity (simple to complex).

| # | FTR file (relative) | Type | Description | `it` count | Complexity | Decision | Justification |
|---|---------------------|------|-------------|-----------|------------|----------|---------------|
| 1 | `index.ts` | index | Shared before: window size, SO clean, logstash ES, uiSettings, `lens_basic` + `lens/default` kbn archives; loads 6 suites (~16m) | - | - | split | Each `loadTestFile` target becomes its own Scout spec(s) with per-space setup |
| 2 | `config.ts` | config | Thin wrapper — only sets `testFiles` | - | - | drop (config) | Scout uses existing Lens UI playwright configs + default server config set |
| 3 | `geo_field.ts` | test | Drag geo field into Lens workspace → Maps layer with doc-count tooltip | 1 | medium | UI test | Cross-app Lens→Maps interaction requires browser |
| 4 | `tagcloud.ts` | test | Tag cloud render, click-to-filter, filter narrowing | 3 | medium | UI test | Click-to-filter is UI interaction; merge sequential its into one journey |
| 5 | `gauge.ts` | test | Gauge defaults, metric/goal/min/max edits, shape/orientation switches, table fallback | 7 | medium | UI test | Chart shape/orientation + debug-state assertions need browser; L37 standalone, L48+ sequential |
| 6 | `heatmap.ts` | test | Heatmap render, palette stops, number/percent toggles, axis rotation (incl. x-axis label rotation) | 8 active + 1 skipped | medium | UI test | Palette panel + chart debug integration; keep skipped axis-title deferred |
| 7 | `formula.ts` | test | Formula editor: transitions, KQL escaping, persistence, duplication, reference lines, filters | 12 | complex | UI test | Monaco autocomplete + dimension-editor transitions are editor UX; see note on #267490 below |
| 8 | `drag_and_drop.ts` | test | Dimension DnD (mouse + keyboard): workspace drops, reorder, duplicate, swap, combine | 21 active + 5 skipped | complex | UI test | Core Lens editor DnD; split by describe; defer skipped cross-layer block |

### Proposed file splits

- `drag_and_drop.ts` (21 active `it` across 3 describes), split into:
  - `ui/parallel_tests/drag_and_drop/workspace_drop.spec.ts` — `describe('workspace drop')` (2 its: top-values / date-histogram nest+overwrite); **sequential within file** (second `it` continues editor state)
  - `ui/parallel_tests/drag_and_drop/dimension_mouse.spec.ts` — `basic drag and drop` its that form one sequential editor session (table→bar, reorder, move, duplicate, combine)
  - `ui/parallel_tests/drag_and_drop/dimension_keyboard.spec.ts` — keyboard DnD journey (`dragging using the keyboard`)
- `formula.ts` (12 `it`), split into:
  - `ui/parallel_tests/formula/transition_and_crud.spec.ts` — count→formula, update/delete, broken formula, expanded mode, empty+valid
  - `ui/parallel_tests/formula/kql_escaping.spec.ts` — KQL + field-name quote escaping (runtime field via `apiServices.dataViews.update` + cleanup)
  - `ui/parallel_tests/formula/layers_and_filters.spec.ts` — moving-average duplicate, quick-fn/static incomplete, numeric formulas, global filter
- `tagcloud.ts` → single `ui/parallel_tests/tagcloud_filter.spec.ts` with `test.step` (preserves journey; no shared module variable)
- `gauge.ts` → single `ui/parallel_tests/gauge_shapes.spec.ts`: standalone default-gauge step, then `test.step` chain for edits/shapes (L48+)
- `heatmap.ts` → single `ui/parallel_tests/heatmap_palette.spec.ts` with `test.step` (palette mutation chain)
- `geo_field.ts` → `ui/parallel_tests/geo_field.spec.ts`

### Tests to defer

- `drag_and_drop.ts` `describe.skip('dropping between layers')` (5 `it`, lines 340+): FTR itself marks “not supported for layers as tabs”. Coverage lost until product re-enables cross-layer DnD; do not port as `skip`/`fixme`.
- `heatmap.ts` `it.skip('should display axis values when setting axis title mode to Auto')` (line 188): Elastic Charts not reporting title. Defer until EC bug fixed; do not port as skip.

### Tests to drop

- None of the **active** FTR tests. All cover distinct Lens editor behavior.
- [#267490](https://github.com/elastic/kibana/issues/267490) (closed `not_planned`) listed formula parser / drop-target rules as Jest candidates; ticket TODO on #276949 is “consider”. **Decision:** keep full coverage as Scout UI tests (Monaco autocomplete + DnD UX). Do not extract Jest in this migration unless pure helpers are already unit-testable without product refactors — flag any future extraction separately.

---

## 2. Test type routing

### UI tests

| FTR file | Proposed spec path | Key flows covered |
|----------|--------------------|-------------------|
| `geo_field.ts` | `ui/parallel_tests/geo_field.spec.ts` | Geo field drop → Maps layer exists + TOC tooltip doc count |
| `tagcloud.ts` | `ui/parallel_tests/tagcloud_filter.spec.ts` | Render tags → click tag → filter bar → narrowed tags |
| `gauge.ts` | `ui/parallel_tests/gauge_shapes.spec.ts` | Default gauge → edit dims → vertical/arc/circle → table fallback |
| `heatmap.ts` | `ui/parallel_tests/heatmap_palette.spec.ts` | Temperature palette → stop edits → range type toggles → axis rotation (8 active; skip axis-title) |
| `formula.ts` | `ui/parallel_tests/formula/*.spec.ts` (3 files) | Formula editor transitions, escaping, layers, filters |
| `drag_and_drop.ts` | `ui/parallel_tests/drag_and_drop/*.spec.ts` (3 files) | Mouse + keyboard dimension DnD |

### API tests

| FTR file | Proposed spec path | Why API not UI |
|----------|--------------------|----------------|
| — | — | No group5 tests are data-correctness-only without UI interaction |

### Unit tests (RTL/Jest)

| FTR file | Component under test | Proposed test path | What to test |
|----------|---------------------|-------------------|-------------|
| — | — | — | No downgrade in this migration; optional future Jest for pure formula escaping helpers if extracted (see #267490 / Risks) |

---

## 3. Parallelism plan

### Parallel-safe (can be space-isolated)

| Proposed spec | Why parallel-safe |
|--------------|------------------|
| `geo_field.spec.ts` | Space-scoped uiSettings time override + fresh Lens editor; ES logstash shared read-only |
| `tagcloud_filter.spec.ts` | Builds viz in space; filter bar mutations are space/session scoped |
| `gauge_shapes.spec.ts` | Editor session in isolated space; no cluster mutations |
| `heatmap_palette.spec.ts` | Same as gauge |
| `formula/transition_and_crud.spec.ts` | Uses `lens_basic` SO loaded into space; opens listing |
| `formula/kql_escaping.spec.ts` | Runtime field via dataViews API then cleaned up in space |
| `formula/layers_and_filters.spec.ts` | Fresh editor per file; filters space-scoped |
| `drag_and_drop/workspace_drop.spec.ts` | Space-isolated from other files; sequential within file (shared editor session) |
| `drag_and_drop/dimension_mouse.spec.ts` | Single sequential journey in one worker; space-isolated from other files |
| `drag_and_drop/dimension_keyboard.spec.ts` | Same |

### Must be sequential

| Proposed spec | Why sequential |
|--------------|---------------|
| Within `gauge_shapes.spec.ts` | After default-gauge assert: shape/orientation steps depend on “reflect edits” |
| Within `heatmap_palette.spec.ts` | Palette stop / range-type / axis-rotation chain mutates same viz |
| Within `tagcloud_filter.spec.ts` | Click filter → assert narrowed tags |
| Within `workspace_drop.spec.ts` | Second workspace-drop `it` continues editor from first |
| Within `dimension_mouse.spec.ts` / `dimension_keyboard.spec.ts` | Editor session state across steps |

Use `spaceTest` + `parallel.playwright.config.ts`. Do **not** mark individual steps as parallel across workers; keep dependent steps as `test.step` inside one test (or serial `test.describe.configure({ mode: 'serial' })` within the file if multiple tests share setup).

---

## 4. Test data and setup

### Archives inventory

| Archive path | Contents | Size | Used by (files) | Verdict |
|-------------|----------|------|-----------------|---------|
| `x-pack/platform/test/fixtures/es_archives/logstash_functional` | logstash indices | large | all via `index.ts` | Keep — already loaded by `ui/parallel_tests/global.setup.ts` |
| `x-pack/platform/test/functional/fixtures/kbn_archives/lens/lens_basic.json` | index pattern + saved viz `lnsXYvis` (`76fc4200-…3ac2`) + artist metric | ~medium | `formula.ts` (open `lnsXYvis`); skipped DnD block | Keep — load per space in specs that need it |
| `x-pack/platform/test/functional/fixtures/kbn_archives/lens/default` (`default.json`) | additional Lens SOs / index pattern | ~medium | suite `before` | Keep — load with `lens_basic` for parity with FTR suite setup |
| CCS variants under `fixtures/kbn_archives/lens/ccs/` | CCS index pattern titles | — | only if `esTestCluster.ccs` | Drop for Scout — group5 config does not enable CCS |

### UI settings mutations

| FTR call | Semantics | Files |
|----------|-----------|-------|
| `timePicker.setDefaultAbsoluteRangeViaUiSettings()` | Sets default absolute time range | `index.ts:57` |
| `kibanaServer.uiSettings.update({ defaultIndex, 'dateFormat:tz': 'UTC' })` | Selective merge | `index.ts:58–61` |
| `common.setTime({ from, to })` / after reset via `setDefaultAbsoluteRangeViaUiSettings` | Narrow 4h window for geo | `geo_field.ts:20–30` |

Scout mapping: mirror existing Lens pattern (`scoutSpace.uiSettings.set` + `LOGSTASH_IN_RANGE_DATES` / `DATA_VIEW_ID.LOGSTASH` from [`ui/fixtures/constants.ts`](ui/fixtures/constants.ts)). Geo uses a narrower Sep 22 00:00–04:00 window — set in that spec’s `beforeAll`/`beforeEach` and restore in `afterAll`.

### Shared constants to extract

| Value | Occurrences | Current locations |
|-------|-------------|-------------------|
| `lens_basic.json` / `lens/default` archive paths | suite + formula (+ deferred DnD) | Add under `KBN_ARCHIVE_PATHS` in `ui/fixtures/constants.ts` |
| `lnsXYvis` / id `76fc4200-cf44-11e9-b933-fd84270f3ac2` | formula open-saved; deferred DnD | Add `LENS_SAVED_OBJECTS.XY_VIS` constant |
| Logstash data view + default time | all files | Already `DATA_VIEW_ID.LOGSTASH` + `LOGSTASH_IN_RANGE_DATES` |
| Geo time window `Sep 22, 2015 @ 00:00:00.000`–`04:00:00.000` | `geo_field.ts` only | Inline in geo spec (single use) |

### Fresh server required

- None. Suite uses shared logstash + default Scout servers.

---

## 5. Auth and roles

### Role inventory

| Role name | Source | Privileges (summary) | Used by (files) | Scout role target | Notes |
|-----------|--------|---------------------|-----------------|-------------------|-------|
| `superuser` (default) | `config.base.ts` `security.defaultRoles` | Full cluster + all Kibana features | all group5 | `browserAuth.loginAsPrivilegedUser()` | Matches existing Lens editor Scout specs (`metric_progress_bar_lens_editor.spec.ts`) |

### Over-privileged tests

| File | What it actually exercises | Suggested minimum privilege |
|------|---------------------------|----------------------------|
| All group5 | Lens editor + Maps (geo) + filters | Privileged/editor-equivalent is enough; no permission-boundary assertions |

No custom roles to port. Do not introduce `loginAsAdmin` unless a specific test fails without it (none expected).

### Roles deserving shared helpers (used in ≥3 files)

- None beyond existing `loginAsPrivilegedUser` pattern.

---

## 6. Reusability audit

### FTR services and page objects in use

| FTR name | What it does | Used by (files) | Scout equivalent exists? | Hidden assertions? | Recommended scope |
|----------|-------------|-----------------|-------------------------|-------------------|-------------------|
| `PageObjects.lens` | Editor DnD, formula, chart switch, palette, gauge, datatable | all | **partial** — [`lens_app.ts`](../../../../../../src/platform/packages/shared/kbn-scout/src/playwright/page_objects/lens_app.ts) has configure/switch/dragFieldToWorkspace/palette stops/etc. | FTR helpers assert in places (`expectFormulaText`, `assertFocused*`) | **Extend shared `@kbn/scout` `LensApp`** for missing methods (used by all Lens plugins) |
| `PageObjects.visualize` | Navigate / open Lens wizard | all | yes | no | use existing |
| `PageObjects.header` | Loading waits | several | yes (Playwright auto-wait preferred) | yes (`waitUntilLoadingHasFinished`) | prefer auto-wait + `waitForVisualization` |
| `PageObjects.maps` / `gis_page` | Layer TOC, tooltips | `geo_field.ts` | **partial** — [`maps_page.ts`](../../../../../../src/platform/packages/shared/kbn-scout/src/playwright/page_objects/maps_page.ts) missing `doesLayerExist`, `getLayerTocTooltipMsg`, `waitForLayersToLoad`, `refreshAndClearUnsavedChangesWarning` | some | **Extend shared `MapsPage`** |
| `PageObjects.tagCloud` | `getTextTag`, `selectTagCloudTag` | `tagcloud.ts` | **partial** — `dashboard.getTagCloudTexts()` only | no | plugin-local helper or small LensApp methods for editor tag cloud |
| `PageObjects.common` / `timePicker` | setTime, sleep | geo, formula, heatmap | uiSettings fixture / Playwright | sleeps are smells | replace sleeps with auto-wait |
| `filterBar` | hasFilter | `tagcloud.ts` | yes (`FilterBar.hasFilter`) | no | use existing |
| `elasticChart` | debug flag + debug data | gauge, tagcloud | **yes in module** — `enableElasticChartDebug` / `getChartDebugData` in [`open_in_lens_helpers.ts`](ui/fixtures/open_in_lens_helpers.ts) | no | **reuse** (move to shared helpers if needed outside open-in-lens naming) |
| `lens.getCurrentChartDebugState` | Heatmap-specific debug state | `heatmap.ts` | **missing** on Scout `LensApp` | no | **Add** `getCurrentChartDebugState(chartType)` (heatmap uses this, not generic `getChartDebugData`) |
| `listingTable` | search/open saved viz | formula, deferred DnD | yes (`listingTable`) | no | use existing |
| `fieldEditor` / `dataViews` | runtime field create (`dataViews.clickAddFieldFromSearchBar` + fieldEditor UI) | `formula.ts` | **resolved** — no Scout UI field-editor PO; `apiServices.dataViews` supports `runtimeFieldMap` on create/update | no | **API setup** for runtime field; do not port UI field-editor flow unless UX itself is under test |
| `find` / `testSubjects` / `retry` / `browser` | low-level | formula, heatmap | Playwright locators | retry wrappers are smells | replace with auto-wait |

### Critical LensApp methods to add (from FTR `lens_page.ts`)

Mouse DnD: `dragFieldToDimensionTrigger`, `dragDimensionToDimension`, `reorderDimensions`, `dragDimensionToExtraDropType`, `dragFieldToExtraDropType`  
Keyboard DnD: `dragFieldWithKeyboard`, `dimensionKeyboardDragDrop`, `dimensionKeyboardReorder`, `assertFocusedField`/`assertFocusedDimension` (return state; assert in spec)  
Formula: `switchToFormula`, `typeFormula`, `expectFormulaText`→`getFormulaText`, `switchToQuickFunctions`, `switchToStaticValue`, `toggleFullscreen`, `assertMessageListContains`→`getMessageListText`, `enableFilter`/`setFilterBy`  
Formula layers/table: `createLayer`, `assertLayerCount`→`getLayerCount`, `ensureLayerTabIsActive` (reference-line test); reuse existing `setTableDynamicColoring` / `getDatatableCellStyle` where present  
Geo: `dragFieldToGeoFieldWorkspace`, `switchDataPanelIndexPattern`, `closeSuggestionPanel`; geo also needs `navigateToNewVisualization({ forceRefresh: true })` (Maps does not reset via normal nav)  
Gauge/table: `setGaugeOrientation`, `setGaugeShape`, `getCountOfDatatableColumns`, `getDatatableHeaderText`, `getDatatableCellText`, `getDatatableCellStyle`, `getWorkspaceErrorCount`; port gauge `retrySetValue` as Playwright fill+expect (FTR smell); dynamic-coloring via `lnsDynamicColoringGaugeSwitch`  
Heatmap: `changePaletteTo` (**distinct from** existing `setPalette`); `getCurrentChartDebugState('heatmapChart')`  
Misc: `searchField`, `clickVisualizeListItemTitle`, `isTopLevelAggregation`

### Already on Scout LensApp (alias / publicize — do not rewrite)

- Palette flyout: `openPalettePanelFlyout` / `closePalettePanelFlyout` (plan names `openPalettePanel` / `closePalettePanel`)
- Style settings: private `openStyleSettingsFlyout` — publicize or call via existing style getters/setters
- Chart type: `getChartSwitchType` (alias of plan’s `getChartTypeFromChartSwitcher`)
- Dimension text: private `getDimensionTriggersTexts` / public `getDimensionTriggerText` — export plural if specs need all texts

### EUI components interacted with directly

| Component | Interaction pattern | Files |
|----------|-------------------|-------|
| Monaco editor | Type formula / autocomplete | `formula.ts` |
| EuiComboBox / field picker | Dimension config (via lens PO) | most |
| Elastic Charts debug DOM (`data-ech-debug-state`) | Assert legend/axes/bullet | heatmap, gauge, tagcloud |
| `.echLegendItem` CSS | Legend count | `formula.ts:39` — brittle; prefer debug state or test-subj if available |

### Brittle locator strategies

| File | Line | Current locator | Target component |
|------|------|----------------|-----------------|
| `formula.ts` | 39 | `.echLegendItem` | XY legend items — prefer chart debug / existing helpers |
| `formula.ts` | ~159 | `.monaco-editor` | Formula fullscreen — keep if no test-subj; document |

### Page objects with hidden assertions

| FTR helper | Method | Assertion | File:line |
|-----------|--------|-----------|-----------|
| `lens` | `expectFormulaText` | expects formula string | lens_page (used formula.ts) |
| `lens` | `assertFocusedField` / `assertFocusedDimension` | focus assertions | drag_and_drop keyboard |
| `lens` | `assertMessageListContains` | message list | formula |
| `testSubjects` | `existOrFail` | throws | various |

Scout: port as getters/actions; put `expect(...)` in specs.

---

## 7. Server configuration

### FTR server args (full chain — lens/geo relevant)

| Arg | Source config | Category | Notes |
|-----|-------------|----------|-------|
| `--xpack.maps.showMapsInspectorAdapter=true` | x-pack `config.base.ts` | already in Scout default | [`default/stateful/base.config.ts:176`](../../../../../../src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/default/stateful/base.config.ts) |
| `--xpack.maps.preserveDrawingBuffer=true` | x-pack `config.base.ts` | already in Scout default | line 177 |
| Encryption / security / trial license | x-pack `config.base.ts` | already in Scout default | no action |
| group5 `config.ts` | — | none | no overrides |

### ES server args

| Arg | Source config | Notes |
|-----|-------------|-------|
| `path.repo=/tmp/` | x-pack base | unused by group5 |
| API keys enabled | x-pack base | Scout default |

### Custom server config needed?

- **No.** Prefer Scout `default` server config set (already used by Lens README). Geo maps flags are present.

---

## 8. Deployment targets

| Proposed spec | Where it should run | Reasoning |
|--------------|--------------------|-----------|
| All group5 Scout specs | `tags.stateful.classic` | FTR only listed in `.buildkite/ftr-manifests/ftr_platform_stateful_configs.yml:249`; matches existing Lens editor Scout (`metric_progress_bar_lens_editor`) |

### Coverage gaps

- Feature exists on serverless, but group5 FTR never ran there. Expanding to `tags.deploymentAgnostic` is **out of scope** for this migration (follow-up verification: Maps geo, formula runtime fields, trial assumptions).

### Cloud portability issues

| File | Line | Issue |
|------|------|-------|
| `heatmap.ts` / `gauge.ts` | various | Exact debug legend strings / colors / rounded averages — fragile across locale/formatting; keep parity with FTR but prefer structural asserts where intent allows |
| `index.ts` | 43–53 | CCS try/catch branch — do not port; local fixtures only |
| `formula.ts` | 81, 90, 121, 233, 264 | `common.sleep` — replace with Playwright auto-wait |
| Hardcoded localhost | — | none in group5 tests |

---

## 9. FTR test smells

| Smell | File | Lines | Description | Context |
|-------|------|-------|------------|---------|
| Sequential journey | `drag_and_drop.ts` | 38–308 | Many `it` blocks share one editor session | Collapse to `test.step` or serial describe |
| Sequential journey | `gauge.ts` | 48–140 | Shape switches depend on prior edits (L37 default-gauge is standalone) | Single spec: standalone step + sequential steps |
| Sequential journey | `heatmap.ts` | 72–174 | Palette mutation chain through x-axis label rotation | Single spec + steps |
| Sequential journey | `drag_and_drop.ts` | 311–337 | `workspace drop` pair shares editor session | One serial describe / `test.step` |
| Retry / flaky input | `gauge.ts` | 59–83 | `retrySetValue` + `setEuiSwitch('lnsDynamicColoringGaugeSwitch')` | Playwright fill + expect; explicit switch locator |
| Shared mutable state | `tagcloud.ts` | 23, 63 | `renderedTagToFilter` across its | One test + steps |
| Hardcoded timeout / sleep | `formula.ts` | 81, 90, 121, 233, 264 | `common.sleep(100–1000)` | Replace with auto-wait |
| Hardcoded timeout / sleep | `heatmap.ts` | 75 | `common.sleep(1000)` before retry | Replace with expect/retry auto-wait |
| Retry wrapper | `formula.ts` | 58–60, 314–316 | `retry.try` around datatable/filter asserts | Playwright expect |
| Retry wrapper | `heatmap.ts` | 76–78 | `retry.try` after palette edit | Playwright expect |
| try/catch swallowing | `index.ts` | 43–53 | CCS detection catch-all | Do not port; explicit fixtures |
| Missing cleanup | `index.ts` | — | No suite `after` | Per-space `afterAll`: unset uiSettings + `cleanStandardList` |
| Missing cleanup | `formula.ts` | ~95–120 | Runtime field left on data view | Delete field / recreate data view in `after` |
| UI-based setup | most files | before hooks | Build chart via UI clicks | Acceptable for editor tests; prefer API only for SO seed (`lens_basic`) |
| Global loading wait | several | — | `header.waitUntilLoadingHasFinished` | Prefer `waitForVisualization` / locator visibility |
| Brittle selector | `formula.ts` | 39 | `.echLegendItem` | Prefer debug state |
| Over-privileged | all | — | Runs as superuser | Use privileged user |
| Skipped dead code | `drag_and_drop.ts` | 340+ | Cross-layer DnD unsupported | Defer — do not migrate as skip |
| Skipped known gap | `heatmap.ts` | 188 | EC axis title | Defer |

---

## 10. Migration batches

### Execution gate (mandatory)

Execute **one batch at a time**. After a batch:

1. Implement + run that batch’s specs until green.
2. **Stop.** Do not start the next batch.
3. Wait for explicit user approval that the batch is fine / not flaky (e.g. “Batch 1 looks good, continue with Batch 2”).
4. Only then start the next batch.

Do not interpret “looks good” / PR comments / silence as approval to continue — wait for a clear go-ahead naming the next batch (or “continue”).

### Batch 1: Foundation + simpler chart specs

Extend fixtures/constants; extend `LensApp` / `MapsPage` with methods needed by geo/tagcloud/gauge/heatmap; **also land shared mouse/keyboard DnD primitives early** (even if unused until Batch 3) so Batch 3 is not a giant PO dump + flaky specs in one PR. Prefer splitting “foundation POs” vs “first four specs” across PRs if review size matters.

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 1 | `geo_field.spec.ts` | `geo_field.ts` | medium | Maps PO extensions + geo DnD; `forceRefresh` navigate after Maps |
| 2 | `tagcloud_filter.spec.ts` | `tagcloud.ts` | medium | Tag helpers + `closeSuggestionPanel`; reuse `filterBar`, chart debug |
| 3 | `gauge_shapes.spec.ts` | `gauge.ts` | medium | Reuse `getChartDebugData`; add gauge shape/orientation helpers |
| 4 | `heatmap_palette.spec.ts` | `heatmap.ts` | medium | `changePaletteTo` + `getCurrentChartDebugState`; omit skipped axis-title it |

- **Human involvement**: `guided` (Playwright DnD for geo; Maps TOC locators)
- **Dependencies**: shared PO method ports; `KBN_ARCHIVE` constants (geo/tagcloud/gauge/heatmap do not require `lens_basic` if they build from empty editor — only formula/deferred DnD need it)
- **Blockers**: none known for default Scout servers

### Batch 2: Formula

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 5–7 | `formula/*.spec.ts` | `formula.ts` | complex | Formula + layer PO methods; load `lens_basic` for transition test; runtime field via dataViews API + cleanup |

- **Human involvement**: `guided` (Monaco autocomplete timing)
- **Dependencies**: Batch 1 LensApp formula-related methods; archive constants; `apiServices.dataViews` for runtime field
- **Blockers**: none (field-editor resolved: API, not UI PO)

### Batch 3: Drag and drop

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 8–10 | `drag_and_drop/*.spec.ts` | `drag_and_drop.ts` | complex | Wire specs to Batch 1 DnD POs; omit skipped cross-layer describe; `workspace_drop` is serial |

- **Human involvement**: `hands-on` if Playwright `dragTo` fails vs FTR `html5DragAndDrop` for extra drop targets
- **Dependencies**: DnD LensApp methods from Batch 1 foundation
- **Blockers**: Playwright DnD reliability for Lens extra drop types — **NEEDS VERIFICATION** during execute

---

## 11. Effort summary

| Metric | Value |
|--------|-------|
| Total FTR test files analyzed | 6 test + 1 index + 1 config |
| > UI tests | 6 files → ~10 Scout specs (~52 active FTR `it`s) |
| > API tests | 0 |
| > Unit tests (RTL/Jest) | 0 (deferred optional extraction) |
| > Dropped | 0 active tests |
| > Deferred | 6 skipped FTR tests (5 cross-layer DnD + 1 heatmap axis title) |
| New page objects needed | Extend existing: `LensApp` (~40 methods; alias existing flyout helpers), `MapsPage` (layer TOC); small tag-cloud helpers |
| New API services needed | 0 (reuse `apiServices.dataViews` for runtime fields) |
| `data-test-subj` additions to source code | 0 expected (existing test-subj used); brittle CSS may need product test-subj if debug state insufficient |
| Custom server config sets | 0 new / reuse `default` |
| Migration batches | 3 |

### Risks and open questions

- **NEEDS VERIFICATION**: Playwright reliability for Lens HTML5 DnD (especially extra drop targets / keyboard DnD) vs FTR selenium helpers.
- **Resolved**: Runtime-field setup for formula KQL escaping → `apiServices.dataViews` `runtimeFieldMap` (no UI field-editor PO).
- **Deferred (out of scope)**: Expand tags beyond `stateful.classic` to serverless / `deploymentAgnostic` — FTR never ran there; verify in a follow-up.
- **NEEDS VERIFICATION**: Exact numeric/debug assertions (gauge `5727`, datatable `14,005`, heatmap legend colors) on Cloud — keep FTR parity first; loosen only if proven unstable and intent preserved.
- **Sign-off**: Confirm deferral of skipped cross-layer DnD and heatmap axis-title tests (recommended: do not port as skip/fixme).
- **Sign-off**: Confirm no Jest extraction in this PR despite #267490 / #276949 TODO (recommended: keep UI coverage).
