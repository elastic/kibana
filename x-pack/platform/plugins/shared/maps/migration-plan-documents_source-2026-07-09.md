# Migrate maps `search_hits.js` FTR test to Scout

## Context

`x-pack/platform/test/functional/apps/maps/group1/documents_source/search_hits.js` is a Maps
"documents layer" smoke test flagged in-file for migration (`Migration: Migrate to Scout`). It
verifies that the Maps app correctly issues Elasticsearch search requests for a documents layer:
hit counts in the inspector, query-bar and layer-level query filtering, refresh-timer re-fetching,
fit-to-bounds behavior, and antimeridian-crossing geo filtering.

This migration moves that coverage from FTR into the Maps plugin's existing Scout suite
(`x-pack/platform/plugins/shared/maps/test/scout/ui`), reusing Scout's default server config and
built-in fixtures/page objects, and removes the FTR file once parity is verified.

This plan was produced via the `scout-migrate-from-ftr` skill (step 1). It is the **review gate** —
no test code is touched until it's approved. On approval I will also write the skill's formal
repo-side plan doc (`migration-plan-documents_source-2026-07-09.md`) in the maps plugin root, then
execute.

## Source analysis (FTR)

- **Test file**: `.../group1/documents_source/search_hits.js` — one top-level `describe('search hits')`
  with nested describes: root (`refresh timer`), `inspector`, `query bar`, `layer query`,
  `filter by extent`. 8 `it` blocks total.
- **Loader chain**: `documents_source/index.js` (`loadTestFile` of docvalue_fields/search_hits/top_hits)
  → `group1/index.js` (owns data setup) → `group1/config.ts` → `config.base.ts`.
- **Data setup (in `group1/index.js`)**:
  - `esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/logstash_functional')`
  - `esArchiver.load('x-pack/platform/test/fixtures/es_archives/maps/data')` (backs the
    `antimeridian_points` / `antimeridian_shapes` indices + demo data)
  - `kibanaServer.importExport.load('x-pack/platform/test/functional/fixtures/kbn_archives/maps.json')`
    (the saved maps: `document example`, `antimeridian points example`, `antimeridian shapes example`)
  - `kibanaServer.uiSettings.replace({ defaultIndex: 'c698b940-e149-11e8-a35a-370a8516603a' })`
  - Deletes 3 dangling index-pattern SOs (`idThatDoesNotExitFor*`)
- **Server args that matter**: `--xpack.maps.showMapsInspectorAdapter=true` — required for the
  inspector "Requests" view to expose the `Hits` / `Request timestamp` stats this test reads.
  **Verified present in Scout's default stateful config**
  (`kbn-scout/.../config_sets/default/stateful/base.config.ts:176`). Boot-time only (not
  runtime-settable) and **only set in the stateful config** → see tagging decision below.
- **Roles**: FTR uses 4 custom roles (`global_maps_all` + `test_logstash_reader`,
  `antimeridian_points_reader`, `antimeridian_shapes_reader`). The test does **not** validate
  permission-scoped behavior — the roles only grant index read + maps access. → downgrade to a
  built-in role (`browserAuth.loginAsAdmin()`), which reads all indices and uses Maps.

## Target (Scout)

- **Module root**: `x-pack/platform/plugins/shared/maps/test/scout/ui` (suite already exists;
  `full_screen_mode.spec.ts` is the sibling example). Plugin uses **Pattern A** tsconfig
  (`tsconfig.json` already includes `test/scout/**/*`, references `@kbn/scout` +
  `@kbn/inspector-plugin`) — **no new tsconfig needed**.
- **Location**: `ui/tests/` + `test` (sequential). These tests depend on a global `defaultIndex`
  uiSetting and shared pre-ingested cluster data, and read inspector request stats — not
  cleanly space-isolatable, so **not** `parallel_tests/`.
- **Package/imports**: `import { tags, test } from '@kbn/scout'`, `import { expect } from '@kbn/scout/ui'`.
- **Tag**: **`tags.stateful.classic`** — NOT `tags.deploymentAgnostic`. The FTR suite is stateful-only
  today, and the required maps-inspector-adapter flag exists only in the stateful default config, so
  the inspector-reading tests would fail on serverless.

### Test-type decision

All scenarios exercise real Maps rendering + live ES search requests surfaced through the inspector
UI → **Scout UI test** (no API/RTL downgrade). This is a genuine browser+server flow.

### Proposed spec files (split for focus, ~4 + 2 scenarios)

1. **`ui/tests/search_hits.spec.ts`** (`document example` map):
   - `test('re-fetches documents with refresh timer')` — read request timestamp (len 24),
     trigger single refresh, assert timestamp changed.
   - `test('registers elasticsearch request in inspector')` — `getHits() === '5'`.
   - `test('applies query-bar query')` with `test.step`s: set+submit KQL
     (`machine.os.raw : "win 8" OR machine.os.raw : "ios"`) → Hits `2`; refresh query → timestamp
     changes; fit-to-bounds → view lat≈41, lon≈-102, zoom≈5.
   - `test('applies layer query')` with `test.step`s: set layer query
     (`machine.os.raw : "ios"`) → Hits `2`; fit-to-bounds → lat≈43, lon≈-102, zoom≈4.
2. **`ui/tests/search_hits_antimeridian.spec.ts`**:
   - `test('geo_point filtering across the antimeridian')` — load `antimeridian points example`,
     `getHits() === '2'`.
   - `test('geo_shape filtering across the antimeridian')` — load `antimeridian shapes example`,
     `getHits() === '2'`.

Rationale: FTR's nested `describe` + shared `before`-query state collapses into per-test setup
(fresh browser context per Scout `test`). The query-bar and layer-query describes each become one
`test` with `test.step`s since their `it`s form one journey off a shared query precondition. Keep
the FTR comment about fit-to-bounds zoom being dpi/screen-size brittle.

### Hooks (per file)

- `beforeAll`: `esArchiver.loadIfNeeded(logstash_functional)`, `esArchiver.load(maps/data)`,
  `kbnClient.importExport.load(maps.json)`, `kbnClient.uiSettings.update({ defaultIndex })`.
- `beforeEach`: `browserAuth.loginAsAdmin()`, navigate + `pageObjects.maps.loadSavedMap(<name>)`
  (file 2 loads its map inside each test since they differ).
- `afterAll`: unload `maps/data` archive, `kbnClient.savedObjects.cleanStandardList()`
  (cleanup the FTR suite did via archive unload / SO unload).

## Page object work (the bulk of the effort)

Reuse core Scout page objects where they exist; extend the **core** `MapsPage`
(`src/platform/packages/shared/kbn-scout/src/playwright/page_objects/maps_page.ts`) for maps-specific
DOM — maps is a platform feature and `pageObjects.maps` is already the core fixture the existing spec
uses.

- **Already covered by core page objects (reuse, don't rebuild)**:
  - `queryBar.setQuery()` / `.clearQuery()` (submit by clicking `querySubmitButton` — QueryBar has
    no submit method).
  - `datePicker.startAutoRefresh(interval, unit)` / `.pauseAutoRefresh()` for the refresh-timer flow.
  - `listingTable.searchForItemTitle()` for the saved-map listing search.
- **Add to core `MapsPage`** (FTR `gis_page.ts` is the source of truth for selectors — port exactly,
  do not infer):
  - `loadSavedMap(name)` — go to maps listing, search (listing table), click item, wait for layers.
  - `setView(lat, lon, zoom)` / `getView()` — set-view popover (`toggleSetViewVisibilityButton`,
    `latitudeInput`/`longitudeInput`/`zoomInput`, `submitViewButton`).
  - `clickFitToBounds(layerName)` — layer TOC actions (`layerTocActionsPanelToggleButton<name>`,
    `fitToBoundsButton`).
  - `setLayerQuery(layerName, query)` — layer panel filter editor (`mapLayerPanelOpenFilterEditorButton`,
    `mapFilterEditor`/`queryInput`, `mapFilterEditorSubmitButton`).
  - Inspector-request readers: `getHits()` and `getRequestTimestamp()` — open inspector
    (`openInspectorButton`), switch to Requests view (`inspectorViewChooser` →
    `inspectorViewChooserRequests`), read the stats table (`inspectorPanel` tbody), close
    (`euiFlyoutCloseButton`). Mirrors FTR `getInspectorStatRowHit` + inspector service.
  - `triggerSingleRefresh(intervalMs)` — resume auto-refresh, wait ~1.5×interval, pause, wait for
    render. (Can compose `datePicker` from the spec instead; final placement decided in execution.)
  - `getInspectorStatRowHit(stats, rowName)` — pure array helper (co-locate with the readers).
  - Replace FTR `waitForLayersToLoad` with the existing `waitForRenderComplete()` /
    `page.testSubj.waitForSelector(..., { state })` synchronization.

No new plugin-local `ui/fixtures/index.ts` is required — the spec uses core fixtures
(`pageObjects.maps`, `queryBar`, `datePicker`, `browserAuth`, `esArchiver`, `kbnClient`) directly,
matching the existing `full_screen_mode.spec.ts`.

## Cleanup of FTR wiring (after Scout parity verified)

- Remove `loadTestFile('./search_hits')` from
  `x-pack/platform/test/functional/apps/maps/group1/documents_source/index.js`.
- Delete `x-pack/platform/test/functional/apps/maps/group1/documents_source/search_hits.js`.
- Leave the shared `group1/index.js` data setup intact (docvalue_fields/top_hits still use it).

## Verification

1. **Typecheck** (Pattern A): `node scripts/type_check --project x-pack/platform/plugins/shared/maps/tsconfig.json`
   (plus `node scripts/type_check --project src/platform/packages/shared/kbn-scout/tsconfig.json`
   for the MapsPage changes).
2. **Run the new specs** (stateful, default config auto-detected from the playwright config path):
   - Start once: `node scripts/scout.js start-server --stateful --serverConfigSet default`
   - Iterate: `node scripts/playwright test --config x-pack/platform/plugins/shared/maps/test/scout/ui/playwright.config.ts test/scout/ui/tests/search_hits.spec.ts`
   - (or one-shot: `node scripts/scout.js run-tests --arch stateful --domain classic --testFiles <path>`)
3. Iterate on failures (locator drift, fit-to-bounds zoom brittleness, refresh timing) until green.
4. **Step 5 — parity & best practices**: run `scout-best-practices-reviewer` on the new specs +
   changed `MapsPage`, passing the deleted `search_hits.js` as parity context. Address
   blocker/major findings before done.

## Required sub-skills during execution

`scout-create-scaffold`, `scout-ui-testing`, `ftr-testing` (per the skill's execute step).

## Notes / risks to confirm

- **Tagging**: `tags.stateful.classic` (not deployment-agnostic) — the maps inspector adapter flag is
  stateful-only in Scout's default config, and the FTR suite is stateful-only today.
- **Auth downgrade**: 4 FTR custom roles → `browserAuth.loginAsAdmin()`. Coverage lost = none (the
  roles were incidental index/feature grants, not the behavior under test).
- **Dangling index-pattern SO deletions** from FTR (`idThatDoesNotExitFor*`): likely unnecessary in a
  fresh Scout space; will confirm during run and add back only if a test errors without them.
- **Zoom assertions** in fit-to-bounds are noted brittle across dpi/viewport in the FTR source; may
  need adjustment for Scout's headless viewport during the iterate loop.
