# Kibana Notebooks POC – Implementation Spec

cursor session - d6503ad5-433e-4afb-b68c-980ed36fb0a0

On-week hackathon project: a standalone, Hex-style reactive notebook app inside Kibana. ES|QL cells fetch data once and feed many chart cells; a DAG scheduler re-runs only what changed.

Built by one person with Claude Code. Work milestone by milestone (see [Milestones](#milestones)); each milestone ends with `node scripts/check.js --scope=branch` green and a commit after review.

kibana running on http://localhost:5601/nick
elasticsearch runnning on: http://localhost:9200

## Demo

Recreate the **[Logs] Web Traffic** sample dashboard (`kibana_sample_data_logs`) as a notebook, loaded via a "Load demo" button. The demo is a notebook built in the UI and exported, stored as `public/demo/web_traffic_demo.ts`; to change it, edit the notebook in Kibana, export it, and regenerate that file from the export's `attributes`, dropping the Lens runtime-only `indexPatternRefs` and `allColumns`.

- **One shared ES|QL cell** computing Visits, Unique Visitors, 4xx %, 5xx % in a single `STATS`, fanning out to **4 metric chart cells** (the "one query feeds many" pitch).
- ES|QL cells + charts for the remaining panels, including response codes over time, bytes distribution and errors by host.
- Both Vega panels (unique destination heatmap, OS and destination Sankey) as Vega cells fed by ES|QL cells.
- Markdown cells for the instructions and the total requests and bytes panel.
- Inputs: pinned time range, source country and OS dropdowns, bytes range; wired into queries via named params (`?x IS NULL OR …`) so an empty input matches everything and changing one input re-runs only its branch.
- An app laying the cells out like the dashboard.
- Out of demo: Map.

Source dashboard for reference: `src/platform/plugins/shared/home/server/services/sample_data/data_sets/logs/saved_objects.ts` (dashboard id `edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b`). Time field `timestamp` is an alias of `@timestamp`; the ES|QL panels use `@timestamp`.

## Scope

**Must ship** (milestones 1–10 + static markdown are non-negotiable; 11–13 are cut bottom-up if time runs short):

- ES|QL, chart, static markdown, and input (time, dropdown, range) cells.
- Full scheduler: derived edges, topo-sorted propagation of affected descendants only, abort, blocked-on-error, cycle/unknown-reference detection, memoization, auto/manual run modes.
- Charts are Lens embeddables fed the upstream datatable (no re-fetch), configured by suggestions + type picker + Lens edit flyout.
- Saved object persistence, listing page, Save with dirty indicator.

**Stretch** (priority order): Markdown `{{…}}` interpolation → JS transform cell → chart output hashing → per-cell result LRU → pin any input → dependency graph view → hover inspector → Vega/maps → app builder tab → URL state → undo → rename refactor → Scout API test for CRUD.

## Plugin identity

| | |
|---|---|
| Location | `x-pack/platform/plugins/shared/notebooks` (`visibility: shared`) |
| Plugin id / module id | `notebook` / `@kbn/notebook-plugin` |
| App | `notebook`, route `/app/notebooks` (`/` listing, `/new`, `/:id` notebook, `/:id/apps/:appId` standalone app), classic nav under Analytics (`DEFAULT_APP_CATEGORIES.kibana`); no solution navs |
| Saved object type / feature id | `notebook` / `notebook` |
| Owner | `@elastic/kibana-dashboards` |
| Gate | `xpack.notebook.enabled`, default `false`; enable in `kibana.dev.yml` |
| Deps (confirm at scaffold) | required: `lens`, `data`, `esql`, `embeddable`, `expressions`, `features`, `contentManagement`, `unifiedSearch`; optional: `share` |

`server/index.ts` must lazy-load `./plugin` (see repo CLAUDE.md, `@kbn/eslint/no_sync_import_from_plugin`).

## Data model (saved object, v1)

Attributes are versioned by the saved objects `modelVersions` (starts at 1); no version field inside attributes. Mappings index only `title` and `description`; everything else is stored unindexed.

```ts
interface NotebookAttributes {
  title: string;
  description?: string;
  cellOrder: string[];                    // linear notebook order
  cells: Record<string, CellDefinition>;  // keyed by id (uuid)
}

type RunMode = 'auto' | 'manual';

type CellDefinition =
  | { id: string; name: string; type: 'esql'; runMode: RunMode; query: string }
  | { id: string; name: string; type: 'chart'; runMode: RunMode; sourceCell: string /* cell id */; lensAttributes: LensAttributes; height?: number }
  | { id: string; name: string; type: 'markdown'; content: string }
  | { id: string; name: string; type: 'vega'; runMode: RunMode; sourceCell: string | null; spec: string /* JSON, max 100,000 chars */; height?: number }
  | { id: string; name: string; type: 'code'; runMode: RunMode; code: string /* JavaScript, max 100,000 chars */ }
  | { id: string; name: string; type: 'input'; input: InputDefinition };

type InputDefinition =
  | { kind: 'time'; defaultValue: { from: string; to: string }; pinned?: boolean }
  | { kind: 'dropdown'; optionsSource?: 'query' | 'static' | 'cell' /* default 'query' */; optionsQuery: string; staticOptions?: string[]; optionsCell?: string | null /* ES|QL cell id */; optionsColumn?: string | null; defaultValue: string | null }
  | { kind: 'range'; min: number; max: number; step?: number; defaultValue: [number, number] | null };
```

Rules:

- **Edges are never stored**; they are derived (see [References](#references-and-edges)).
- `lensAttributes` are stored whole, with the injected `table` stripped before save.
- Display cells (chart, custom, Vega) store `height` only when the user drags them taller than their default (300px, or 160px for metric charts); the default is the minimum, and the height is capped at 5000px.
- Current input values are runtime-only; only `defaultValue` persists.
- No `layout` field; the app builder (stretch) adds it in a later model version.
- New notebooks are created with one pinned time input (`now-7d/d` → `now`).

## Runtime store

Plain RxJS, outside React:

- `NotebookStore` holds `cells$: BehaviorSubject<Record<string, CellDefinition>>` (persisted definitions) and one `BehaviorSubject<CellRuntime>` per cell.
- `CellRuntime = { status: CellStatus; output?: Datatable | InputValue; error?: string; lastRunAt?: number; durationMs?: number; memoKey?: string }`.
- `CellStatus = 'idle' | 'stale' | 'running' | 'done' | 'error' | 'blocked'`.
- React reads per-cell subjects via `useStateFromPublishingSubject` (`@kbn/presentation-publishing`) so only the affected cell re-renders.
- Outputs are in-memory only, never persisted.
- Dirty tracking: compare `cells$`/`cellOrder` against the last saved version.

## References and edges

Cells reference each other by name in text, Hex-style. Edges are derived from:

- **ES|QL cell** → every named `?param` in `query` (extract via the ES|QL AST from `@kbn/esql-language`; regex fallback acceptable).
- **Dropdown input** → named `?param`s in its `optionsQuery` (typically `?_tstart`/`?_tend`).
- **Chart cell** → `sourceCell` (by **id**, chosen from a Source dropdown listing ES|QL cells by name).
- **Vega cell** → `sourceCell`, like a chart cell.
- **Markdown** → none (static). Stretch: `{{name}}` / `{{name.column}}` references parsed from `content`.
- **Code cell** → every free identifier in `code` that matches an exposed name (input params, ES|QL cell names, other code cells' exports). A lightweight tokenizer skips comments, strings, template text, property access (`a.b`) and object keys; it is not a full parser.

Param names exposed by inputs:

| Input | Params |
|---|---|
| Pinned time | `?_tstart`, `?_tend` (at most one pinned time input; deletable) |
| Unpinned time (stretch) | `?<name>_start`, `?<name>_end` |
| Dropdown | `?<name>` |
| Range | `?<name>_min`, `?<name>_max` |
| Code cell | one name per `export` (fixed: renamed only by editing the code) |

Name rules: unique per notebook, match `[a-z][a-z0-9_]*` (leading `_` reserved), and the set of exposed param names must be collision-free (e.g. range `bytes` conflicts with a dropdown named `bytes_min`). `?` appears only inside ES|QL; everywhere else (markdown, future JS) references are bare names.

Renaming:

- A cell `name` change is **metadata-only**: it does not mark anything stale, re-run, or publish a new output object. Charts reference by id, so renaming an ES|QL cell never re-renders its charts.
- Renaming an input breaks `?oldName` references (they become unknown params → error/blocked). Rename refactor is stretch.

## Scheduler

A plain class over the store, injected with `runQuery` so it is unit-testable without ES.

**Execution-relevant changes** (trigger propagation): ES|QL `query` on Run/Cmd+Enter, `runMode`, `sourceCell`, input definition changes, input value changes. Name, markdown content and Lens attribute edits do not propagate (Lens edits re-render only that chart).

**Propagation** when cell X changes:

1. Collect X plus its descendants; topologically sort that subgraph.
2. For each cell in order:
   - Any upstream `error` or `blocked` → `blocked`; do not run on stale data.
   - `runMode: 'manual'` (and not explicitly run) → `stale`, keeps last output; its descendants also become `stale` and keep their output.
   - Otherwise resolve params, compute `memoKey = objectHash({ query, params })` (`object-hash` is a root dep). If equal to the current `memoKey` and not forced → keep status `done`, publish nothing new. Else run.
3. Each run gets an `AbortController`; starting a new run of a cell, or re-triggering any of its upstreams, aborts in-flight runs of that cell.
4. While a cell runs, its Run button becomes **Stop**: the run is aborted, the cell keeps its last output and goes `stale` (reason `stopped`), and its descendants go `stale` rather than running on that output.

POC testing aid: an ES|QL cell whose label contains `LONG` waits 10 s (abortable) before querying, to exercise long runs.

Performance check (dev only): the developer toolbar's **Performance** badge, shown on the notebook app, turns on run counts in the dependency graph. Each cell node shows how many times the scheduler recomputed it instead of serving its memo, and **Reset run counts** clears them. Counts are kept while the check is off.

**Run triggers:**

- ES|QL query edits run only on Cmd+Enter / Run button (never while typing); the run then propagates to auto descendants.
- On notebook open, all auto cells run in topo order; manual cells show `stale` with no output.
- Input value changes propagate immediately; range input debounced ~300 ms.
- Header **Run all** forces every cell (bypasses memo); **Refresh** re-resolves relative time and re-runs time-bound cells.
- New cells default to `runMode: 'auto'`.

**Validation:** cycle detection (DFS) over the derived graph on every definition change; cells in a cycle and cells with unknown `?params` get `error` with a clear message.

**Chart cells** never fetch: their "run" re-injects the source output. After each source run, compare the columns referenced by `lensAttributes` with the new output columns:

- All present → keep user config (including flyout edits) and inject the new table. Every source re-run re-renders all of its charts (input hashing only; see the output-hashing stretch goal).
- Any missing → re-run suggestions with the same chart type and show a "Chart regenerated: columns changed" notice. Added columns never trigger a re-suggest.

## JavaScript code cells

Observable-style cells that run plain JavaScript in the page (POC: no sandbox, no TypeScript).

- **Inputs** are injected as top-level `const`s, only for the names the code references: input params by value, ES|QL cells as arrays of row objects keyed by column name, and other code cells' exports by value. Reassigning one throws; declaring the same name in the cell shadows it.
- **Exports** (`export const|let|var|function|class`, `export { a, b as c }`) become the cell's outputs under exactly those names. `export default` is an error. String, number and `null` exports also bind as ES|QL `?params`, and every export is available to markdown interpolation.
- The body runs as an async function, so top-level `await` works. `console.log|info|warn|error|debug` calls are captured (and still forwarded to the browser console) and shown in a collapsible DevTools-style console under the editor; an error keeps the logs written before it. Export values are not displayed; the footer lists their names.
- Code cells are notebook-only: they have no "Add to app" action, the default app skips them, and an app panel pointing at one renders nothing.
- Edits run on Run/Cmd+Enter, like ES|QL. `memoKey = objectHash({ code, parents })`, where an input parent contributes its value and other parents their own `memoKey`.

## Vega cells

A Vega or Vega-Lite spec over an ES|QL cell's results.

- **Language** is chosen by the spec's `$schema`: one mentioning `vega-lite` is compiled with `vega-lite`, anything else is Vega. Specs are HJSON (comments, unquoted keys) or JSON, as in Kibana's Vega visualization.
- **Data**: the source cell's rows, as records keyed by column name, are the dataset `table`. A Vega-Lite spec without `data` reads it by default (`datasets.table`); a Vega spec gets a `table` entry added, or values filled into a `table` entry that has no `values`, `url` or `source`. A spec can still declare its own data.
- **Editing**: the cell shows only its chart; **Edit** opens a flyout, like the chart cell's, with the source picker and Kibana's Vega spec editor (`VegaSpecEditor` from `@kbn/vis-type-vega-plugin`, with its format and help menus). A blank spec is seeded with the starter spec for the picked source. **Run preview** shows the draft source and spec in the cell without applying them, **Apply and close** saves both (a new source re-runs the cell), and Cancel discards them. Clicking outside the flyout doesn't close it.
- Like charts, the cell never fetches: its run takes the source output. Applying a spec re-renders without propagating.
- Rendering uses the dashboard's by-value Vega panel (the `vega` embeddable from `@kbn/vis-type-vega-plugin`, without panel chrome), given the spec with the `table` data inlined as JSON. Charts get the same Elastic palette, theme colours, sizing, tooltips and Kibana extensions as on dashboards. A new spec or new results update the mounted panel rather than rebuilding it. Filter clicks (`kibanaAddFilter`) are disabled, because a notebook has no filter bar.
- While the spec is empty, **Start from the results** writes a Vega-Lite bar chart of the first category column against the first numeric column (or a row count).
- Vega cells can be added to apps.

## Running ES|QL

`runQuery({ query, params, signal }): Promise<{ table: Datatable; durationMs: number; truncated: boolean }>`

- Execute through the data plugin `search` with the `esql_async` strategy (as `getESQLResults` in `src/platform/packages/shared/esql/kbn-esql-utils/src/utils/run_query.ts:220` does), building the named `params` array ourselves. `getESQLResults`'s `variables` (`ESQLControlVariable`) cannot hold `null`, so do not route values through it.
- `_tstart`/`_tend` resolution: match `getStartEndParams` (`run_query.ts:25`): `dateMath.parse(from)` and `dateMath.parse(to, { roundUp: true })` as ISO strings.
- Empty dropdown/range binds `null` (never `undefined`, which JSON drops; ES rejects any referenced param that is missing). Queries handle it visibly: `WHERE ?country IS NULL OR geo.src == ?country`. No hidden query rewriting.
- `truncated` only when ES capped the rows itself: no `LIMIT` and `rows.length >= 1000` (the implicit default), or a `LIMIT` above 10,000 and `rows.length >= 10000` (the hard maximum). Hitting a `LIMIT` the user wrote is not truncation. Surfaced as a warning in the cell.

## Charts via Lens

Chart cells are real Lens embeddables with a precomputed table — no `esql` fetch:

- Lens `textBased` layers accept `table?: Datatable` (`src/platform/packages/shared/kbn-lens-common/datasources/types.ts:143`). When set, Lens builds `var name=<layerId> | lens_map_to_columns | …` instead of `esql` (`x-pack/platform/plugins/shared/lens/public/datasources/text_based/to_expression.ts:89`) and passes the table as an expression variable (`.../react_embeddable/expressions/variables.ts:13`).
- Creating a chart: ad-hoc ES|QL data view for the source query → `lens.stateHelperApi().suggestions({ dataViewSpec, fieldName: '', textBasedColumns, query: { esql } }, dataView, [], preferredChartType)` → `getLensAttributesFromSuggestion` (`@kbn/visualization-utils`). Reference flow: `src/platform/plugins/shared/dashboard/public/dashboard_app/no_data/dashboard_app_no_data.tsx:72`.
- Type picker: XY (bar/line/area), metric, datatable, pie → re-suggest with `preferredChartType`.
- Edit: opens Lens `EditLensConfigPanelApi` (`wrapInFlyout`, `hideTextBasedEditor`) with the table-injected attributes; no `lensAdapters` needed. `updatePanelState` fires per edit (the host re-renders the chart for live preview); `onApply` returns the final attributes, still carrying `table` (strip before save).
- Render: Lens `EmbeddableComponent` with `layers[id].table = sourceOutput` injected at render time. The layer `query` that `getLensAttributesFromSuggestion` produces is ignored for fetching once `table` is set (the spike passed with and without it), so keep it rather than add stripping code; it may go stale after the source query changes, and `sourceCell` stays the source of truth.

**Spike (milestone 1): passed, Lens path chosen.** Verified 2026-10-28 on Kibana/ES 9.7.0-SNAPSHOT with a temporary harness rendering `EmbeddableComponent` and `EditLensConfigPanelApi` from attributes built by the suggestion flow above (`STATS c = COUNT() BY machine.os.keyword` → `lnsXY`), counting `/internal/search/esql*` requests:

| Check | ES\|QL requests |
|---|---|
| Render, injected table, layer `query` removed | 0 |
| Render, injected table, layer `query` kept | 0 |
| Swap to a new table (new attributes object; chart values updated) | 0 |
| Open edit flyout, switch to datatable, Apply (with and without `query`) | 0 |

Discover is **not** a reference for the no-fetch path: it passes `table` to the histogram only outside a fetch cycle (`use_discover_histogram.ts`, `!latestFetchDetails`), so its chart normally runs its own `esql` request. Only XY (bar) and datatable were exercised; confirm metric and pie in milestone 7. Risk: Lens marks `EditLensConfigPanelApi` "TODO: remove this in favour of the custom action thing" (`lens/public/plugin.ts`); Discover still uses it.
**Fallback (unused):** `notebook_cell` expression function + `ReactExpressionRenderer` with `variables`; no Lens flyout.

## Inputs

- **Time** (`pinned: true`): rendered in the page header next to Refresh / Run all / Save; uses the `unifiedSearch` time picker.
- **Dropdown**: single-select; options come from its own embedded `optionsQuery` (first column, e.g. `FROM kibana_sample_data_logs | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend | STATS BY geo.src | LIMIT 500`). Not a separate DAG node; depends on the params in its options query. Alternatively `optionsSource: 'static'` offers a hand-entered `staticOptions` list, runs no query and has no dependencies; or `optionsSource: 'cell'` takes the distinct values of `optionsColumn` from the results of the ES|QL cell `optionsCell`, which becomes its parent (a cycle if that cell reads the dropdown). The options query is kept so switching back restores it. Empty = `null`.
- **Range**: numeric `[min, max]`, exposes `?<name>_min`/`?<name>_max`; empty = `null`.
- Unpinned inputs render inline as cells with a config popover (options query, defaults, bounds).

**Spike (milestone 1): passed, `null` binding kept; no sentinel fallback.** Verified 2026-10-28 on ES 9.7.0-SNAPSHOT via `_query`, `_query/async`, and Kibana's `/internal/search/esql_async` (the strategy forwards `params` unchanged to `esClient.esql.asyncQuery`):

- `params: [{ "x": null }]` is accepted; `?x IS NULL` is `true`.
- `WHERE ?os IS NULL OR machine.os.keyword == ?os` → all 14,074 rows for `null`, 2,814 for `"win 7"`.
- Range form `(?bytes_min IS NULL OR bytes >= ?bytes_min) AND (?bytes_max IS NULL OR bytes <= ?bytes_max)` works with `null`s and with numbers.
- Every `?param` referenced by the query must be sent: an omitted one fails with `Unknown query parameter [bytes_min]`. Always bind all params an input exposes (`null` when empty).
- `""` is not a substitute for `null`: `?os IS NULL OR … == ?os` with `""` matches 0 rows.

## Persistence

- Saved object type `notebook`, `namespaceType: 'multiple-isolated'`, `modelVersions: { 1, 2 }`. Version 2 adds the unindexed `panels` (apps).
- Internal routes under `/internal/notebook`: `GET/POST/PUT/DELETE /{id}`, `GET /_find`. Bounded `@kbn/config-schema` validation (`maxLength`/`maxSize` on all strings/arrays), `requiredPrivileges` from the `notebook` feature.
- Kibana feature `notebook` with `all`/`read` privileges.
- Explicit Save with a dirty indicator (no autosave).
- Listing page via `TableListView` (create / open / delete), same as Dashboards.
- "Load demo" creates the Logs notebook via the API.

## UI

Hex-inspired, EUI, single linear notebook view.

- **Page header:** editable title, dirty indicator + Save, pinned time picker, Refresh, Run all.
- **Cell header:** type icon, editable name, status badge (error text in tooltip/callout), auto/manual toggle, Run button, ⋯ menu (move up/down, duplicate, delete). No drag-and-drop.
- **ES|QL cell:** `ESQLLangEditor` (`@kbn/esql` plugin) inline; collapsible result preview, **collapsed by default** to a summary line ("1,000 rows · 4 cols · 120 ms"), expanding to an `EuiDataGrid` of the first 100 rows; truncation warning.
- **Chart cell:** Source dropdown, chart-type picker, Edit button (Lens flyout), chart at a fixed, vertically resizable height.
- **Input cell:** the control plus a config popover.
- **Markdown cell:** rendered; click to edit.
- **Adding cells:** "+ Add cell" hover bar between cells and at the end, with a type menu. A new cell that has an edit flyout (chart, custom, Vega, dropdown and range inputs) opens it straight away; a new chart's flyout suggests a chart for its source. Duplicated cells and cells added from a flyout don't.
- **Standalone app:** `/app/notebooks/:id/apps/:appId` shows one app of a saved notebook on its own page, read-only: its header and panels, with the layout locked and no panel actions. Only the app's cells and everything upstream of them run (the scheduler's `scope`), and run modes are ignored (the scheduler's `ignoreManualRunMode`): the page has no Run buttons, so every cell, manual ones included, runs on open and whenever an input or upstream cell it reads changes. Inputs in the app work, but their changes are never saved. Breadcrumbs are Notebooks › notebook › app; the app menu has **Full screen** (hides Kibana's chrome, as Dashboard's does; `?fullScreen=true` opens in it) and **Open notebook**, which, like the notebook breadcrumb, opens `/:id?app=:appId`: the notebook with its app panel open on that app. The notebook keeps `?app=` in step with its app panel both ways (replacing the history entry): opening, switching or closing apps updates it, so a refresh or copied URL reopens the same app, and a changed URL (back/forward, an edited link) opens, switches or closes the panel. `?app=` with no value is the panel open with no apps. An app tab's menu in the notebook has **Open in new tab** and **Copy link** once the notebook is saved; the link shows the saved version, and an app missing from it shows "App not found".

## Testing

Jest only. Scheduler is written test-first.

- Scheduler: topo order, only affected descendants re-run, memo hit skips run, abort on new run, blocked on error, manual-mode stale propagation, rename is a no-op.
- Reference parsing: `?params`, `_tstart`/`_tend`, input param naming, name/param collisions.
- Cycle and unknown-reference detection.
- Param binding including `null`.
- ES|QL is stubbed via the injected `runQuery`.

## Milestones

Each leaves the app demoable. Cut 11–13 bottom-up if short on time.

1. **Spikes:** Lens injected table (+ flyout re-query check); `null` named param in ES. **Done: both passed** (see § Charts via Lens, § Inputs).
2. **Scaffold:** plugin, config flag, app route, empty notebook page.
3. **Core model:** schema types, RxJS store, `runQuery`.
4. **ES|QL cell:** editor, Run, collapsed preview, truncation warning.
5. **Scheduler (TDD):** reference parsing, topo sort, propagation, abort, blocked, cycle/unknown-ref detection.
6. **Pinned time input:** `_tstart`/`_tend` binding, Refresh, Run all.
7. **Chart cell:** Source, suggestions, type picker. **Static markdown cell.**
8. **Dropdown + range inputs.**
9. **Persistence:** saved object, routes, feature, Save/dirty.
10. **Demo seed:** "Load demo" with the Logs queries.
11. Lens edit flyout.
12. Memoization (input memo key) + manual run mode.
13. Listing page (fallback: open by URL + seed).
14. Stretch, in the priority order listed under [Scope](#scope).

## Resolved facts

- ES|QL editor: `ESQLLangEditor` from the `esql` plugin (`src/platform/plugins/shared/esql/public/index.ts:13`). It does not expose Monaco; a future hover inspector must register globally via `monaco.languages.registerHoverProvider('esql', …)` (`@kbn/monaco`).
- `ReactExpressionRenderer`: `src/platform/plugins/shared/expressions/public/react_expression_renderer_wrapper.tsx:20`; `variables` forwarded via `IExpressionLoaderParams`.
- `ESQLControlVariable.value` is `string | number | (string | number)[]` (`src/platform/packages/shared/esql/kbn-esql-types/src/variables_types.ts:74`); named `ESQLSearchParams.params` do not type `null` (`src/platform/packages/shared/kbn-es-types/src/search.ts:696`) — widen locally.
- Graph deps available: `@xyflow/react`, `@dagrejs/dagre` (no `elkjs`).
- `kbn-grid-layout` always compacts vertically; no free-positioning option (`grid/utils/resolve_grid_section.ts:123`).
- CSP: `csp.script_src: ['unsafe-eval']` (`csp.disableUnsafeEval` is deprecated) — `src/core/packages/http/server-internal/src/csp/config.ts`.
- `KQL(?param)`: unverified; no usage in the repo.

## Future (post-hackathon)

- **JS transform cell:** datatable(s) in → datatable out, references upstream cells by bare name. Its variable references (parsed from the code, Hex-style) become derived graph edges alongside `?params` and `sourceCell`; this also enables ES|QL → JS → chart chaining. Demo: unsandboxed behind a flag with `csp.script_src: ['unsafe-eval']` in dev. Production needs isolation (sandboxed `allow-scripts` iframe + postMessage on a route with its own CSP, or QuickJS/WASM) and security sign-off.
- **Chart output hashing:** after a source run, each chart hashes only the columns its `lensAttributes` reference (ids, types, values). If unchanged since the last injection, keep the current table and skip the re-render; otherwise inject the new full table (the edit flyout needs all columns). Lets a fan-out source update only the charts whose columns changed. Neither Hex nor Observable does this; both re-run all dependents.
- **Per-cell result LRU:** keep the last ~5 outputs per ES|QL cell keyed by memo key, so toggling an input back to a previous value (A → B → A) is instant instead of re-querying. The must-ship memo only keeps the current result.
- **Markdown interpolation:** `{{input}}`, `{{cell.column}}` (first row), number formatting via `toLocaleString`; later format hints (`| bytes`, `| percent`).
- **Pinning:** any input pinned to a header bar, dashboard-controls style. Unpinned time inputs for week-over-week.
- **Dependency graph view:** `@xyflow/react` + `@dagrejs/dagre`, left-to-right; data-source nodes from the FROM clause via the ES|QL AST; live status colouring; click to jump, hover to inspect.
- **Inline inspector:** Monaco hover on `?params` showing value, provenance (producing cell, last run); datatables show columns, row count, first N rows.
- **App builder tab:** layout-only view over the same cells (visibility, placement, hide code) using `kbn-grid-layout`; freeform canvas would need a non-compacting layout.
- **KQL migration:** optional KQL input cell bridging via ES|QL `KQL()`; legacy panels fed via search context; phase out in favour of named params.
- **Global filter convenience:** scheduler-appended WHERE shown as a visible "effective query" — never invisible.
- **Other:** Vega/maps cells, URL state for inputs/time, undo, rename refactor, Content Management registration, Scout tests.
