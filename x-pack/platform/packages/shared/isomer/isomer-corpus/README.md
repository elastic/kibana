# @kbn/isomer-corpus

The fidelity corpus for saved object materialization: what Kibana itself draws for a set of dashboards, captured so materializers and renderers can be compared against it without a browser: Gate A in Kibana, and visual review in Isomer.

This package holds the corpus definition and the pure helpers the capture uses. Captured output is not committed: `captures/` and `review/` are gitignored and regenerated on demand (see [Capturing](#capturing)). The capture itself is an FTR suite, `x-pack/platform/test/isomer_corpus`, because it needs Kibana's FTR services (`elasticChart`, `inspector`, `dashboardPanelActions`).

## Corpus

| Dashboard | Source | Covers |
| --- | --- | --- |
| `sample-flights`, `sample-logs`, `sample-ecommerce` | The sample data sets' overview dashboards (`GET /api/sample_data`) | What users see first: Lens panels, Discover sessions, Maps and legacy visualizations |
| `isomer-corpus-values` | `src/edge_case_dashboards.ts` | Null, negative, huge and tiny values in metric, xy and table panels |
| `isomer-corpus-buckets` | `src/edge_case_dashboards.ts` | Other and missing buckets, multivalue fields, in xy, pie and table panels |
| `isomer-corpus-long-titles` | `src/edge_case_dashboards.ts` | Long panel titles, long and non-ASCII labels and legends |
| `isomer-corpus-charts` | `src/edge_case_dashboards.ts` | ES\|QL data table, pie, donut, treemap, mosaic, waffle, heat map, gauges and tag cloud, and a data view legacy metric, with their styling options |

The edge-case dashboards are written in the as-code format (Lens API configs, `type: 'vis'`) and created with `PUT /api/dashboards/{id}`. Their data is `buildEdgeCaseDocuments()`: one document an hour for a week in the `isomer-corpus-edge-cases` index, a pure function of the document index. A unit test validates every panel against Lens's `lensApiConfigSchema` and every dashboard against the dashboard schema, and checks that the data holds each edge case.

## What is captured

For each panel of each dashboard, in light and dark, under `captures/<dashboard>/`:

| File | Contents | How |
| --- | --- | --- |
| `panels/<panel>/config.json` | The as-code panel; for by-reference Lens panels, also the visualization | `GET /api/dashboards/{id}` (`transformDashboardOut`), `GET /api/visualizations/{id}` (Lens `transformOut`) |
| `panels/<panel>/<theme>/capture.json` → `inspector.tables` | Kibana's `Datatable`s, keyed as the `tables` adapter keys them | The panel's inspector `tables` adapter |
| `panels/<panel>/<theme>/capture.json` → `panel.charts[].debugState` | Elastic Charts' `DebugState` for every chart in the panel | `data-ech-debug-state`, with `window._echDebugStateFlag` on |
| `panels/<panel>/<theme>/capture.json` → `panel.metrics`, `panel.dataGrids`, `panel.legacyMetrics` | Text, inline and computed colors, in page order; a legacy metric tile's value, label and the background it sits on | The rendered Elastic Charts metric, EUI data grid and legacy metric |
| `panels/<panel>/<theme>/capture.json` → `panel.charts[].svgTexts` | Each SVG text a chart drew, with its fill and size: a tag cloud's words, which `DebugState` doesn't report | The chart's SVG |
| `panels/<panel>/<theme>/capture.json` → `context` | `now`, the relative and absolute time range, `dateFormat:tz`, the page's theme, time zone, locale and pixel ratio, the panel's grid position and size | The page and the run's settings |
| `panels/<panel>/<theme>/screenshot.png` | One screenshot, for people to look at; never compared automatically | The page, cropped to the panel |

Each dashboard also has `dashboard.json` (the as-code response, `warnings` included) and `summary.<theme>.json` (one line per panel: captured, how many charts reported `DebugState`, whether the inspector had tables). `run.json` records `now`, Kibana's version, the window size and the pinned settings.

Panels the as-code API can't express still render, so they're captured too, with `in_as_code: false` and no config. On Kibana 9.7.0, `transformDashboardOut` drops these as `dropped_panel` warnings (`Panel schema not available for panel type`): Flights 1 `map` and 2 `legacy_vis`, Logs 1 `map` and 3 `legacy_vis`, eCommerce 1 `map` and 1 `legacy_vis`. Every Lens panel on the three sample dashboards comes through as a Lens API config.

Saved object bookkeeping (`meta.created_at`, `meta.updated_at`, `meta.version`) and FTR's URL cache buster are left out, and JSON keys are sorted, so recapturing unchanged content changes no file. One known exception: two ES|QL panels on the Logs dashboard (`[Logs] Errors by host`, `[Logs] Bytes distribution`) sort with ties, so Elasticsearch returns tied rows in any order, and their inspector rows and drawn order can change between runs. That comes from the sample dashboard's own queries.

## Exporting for Isomer's visual review

`scripts/export_review.js` turns a capture run into what Isomer's review tool reads: the screenshot and the expected strings for every panel in both themes. It is not Gate A, which compares `DebugState` itself.

```sh
node x-pack/platform/packages/shared/isomer/isomer-corpus/scripts/export_review.js \
  [--captures <capture dir>] [--out <export dir>]
```

By default it reads this package's `captures` and writes this package's `review/`, which is gitignored and replaced on every export. Screenshots aren't committed, so run the capture first on the same machine; any missing screenshot is listed in `index.json`, and its case has `screenshot: null`.

```
review/
  index.json                       format, the run record, every case, missing screenshots
  <dashboard>/<panel>/<theme>.png  the captured screenshot
  <dashboard>/<panel>/<theme>.expected.json
```

Each `<theme>.expected.json` (format `isomer-corpus-review/1`) holds what a renderer must reproduce, taken from Kibana's own output and never from Isomer:

- `title`, and the `context` it was drawn in: `now`, the absolute time range, `dateFormat:tz`, locale and panel size.
- `charts`, one per Elastic Charts chart, from `DebugState`: axis titles and tick labels by position, legend names and colors, series names and colors, partition names and colors, heatmap cell text and colors, and the number of annotations.
- `metrics`, from the page: each text with the metric part that drew it (`echMetricText__value`) and its color, plus the metric's background.
- `tables`, from the page: headers, and rows of cells with their text, text color and background.

Colors are lowercase hex (`#rrggbb`, `#rrggbbaa` when translucent), whether they came from `DebugState` or from the page. EUI's hidden clipboard markers in data grid text are removed.

## Round trip (P0 verify)

The `round trip` tests write `captures/round_trip/report.md` (every differing field, grouped) and one JSON file per sample dashboard. For every Lens panel they compare the migrated stored state the dashboard app reads (`GET /internal/dashboards/app/{id}`) with the stored state after a trip through the API format (`GET /api/dashboards/{id}`, then `PUT` of a copy, then the same read). Generated layer and column IDs are aliased before comparing, so only real differences remain. The report also checks that the API config itself is stable across the trip.

Findings on Kibana 9.7.0: all 31 Lens panels on the three sample dashboards convert, the API config is stable on every one, and the stored state differs on every one. The differences that change what a panel can draw, checked against each panel's API config:

- **Custom axis bounds become `full`.** `[Flights] Delays & Cancellations` stores a custom y extent (upper bound `1`); its API config has `axis.y.domain.type: "full"`.
- **Custom palette stops are dropped.** Metric and datatable panels with custom color stops (`Sold Products per Day`, `Daily comparison`, `[Flights] Most delayed cities`, `[Logs] Errors by host`) lose `palette.params.stops`, and some flip `reverse`.
- **XY color mapping is dropped.** `[Logs] Bytes distribution` loses its `colorMapping` (`eui_amsterdam_color_blind`).
- **Datatable row height** changes from `single` to `custom`.
- **The attributes' `title`** becomes empty. The panel keeps its title at panel level, so this only matters for by-reference reuse.

Most other rows are representation, not loss: formula helper columns (`math`, and the `count` columns a formula references, including their `timeShift` and `filter`) aren't stored, because Lens rebuilds them from the formula text. Filters are stored in a different form with renamed references, and defaults are filled in. Gate A should confirm the palette and axis differences against the captured `DebugState`.

## Agent Builder's Lens config (P0 verify)

Read from `x-pack/platform/plugins/shared/agent_builder_visualizations` and `x-pack/platform/packages/shared/agent_builder_visualizations`; nothing there was changed.

- **Format:** the Lens API format, **ES|QL variant only**. Each authored config is validated with that chart's `*ConfigSchemaESQL` from `@kbn/lens-embeddable-utils` (`agent-builder-visualizations-server/lens/chart_type_registry.ts:91`, `graph_lens.ts:115`).
- **Chart types:** `metric`, `gauge`, `tag_cloud`, `xy`, `region_map`, `heatmap`, `data_table`, `pie`, `treemap`, `waffle`, `mosaic` (`SupportedChartType`, `agent-builder-common/tools/tool_result.ts:115`). No `legacy_metric`.
- **Data source:** the model writes the config without `data_source`. The tool generates or validates one ES|QL query and injects `{ type: 'esql', query }` on the config, or on every layer for `xy` (`graph_lens.ts:127`, `graph_lens.ts:399`). Dimensions bind to result columns with `column`.
- **Time:** queries bucket with `BUCKET(field, n, ?_tstart, ?_tend)` or `TBUCKET(n, ?_tstart, ?_tend)`, which Kibana binds when the chart renders (`shared/esql_instructions.ts:52`). The attachment's `time_range` comes from probing the data's min and max: relative (`now-Nh`, `now-Nd/d`) when the data is current, absolute otherwise (`time_range/select_time_range.ts:94`).
- **Presentation defaults from the prompt rules:** for example `xy` hides axis titles and puts the legend at the bottom with `visibility: "auto"`; `metric` uses `background_chart: { type: "trend" }` and colors only bounded measures, with `@kbn/palettes` status steps (`chart_type_registry.ts`, `lens/config_examples.ts`).
- **Attachment payload:** `{ renderer: 'lens', query, visualization: <Lens API config>, chart_type, esql, time_range? }` (`agent-builder-visualizations-common/visualization_types.ts:26`).
- **By reference:** an attachment that points at a Lens saved object is converted with `LensConfigBuilder.toAPIFormat` (`server/attachment_types/visualization.ts:87`), so that path can carry data-view configs, not only ES|QL.
- **Datasets:** whatever index the agent grounds and passes as `index` (`server/tools/create_visualization/create_visualization.ts:177`); there is no fixed dataset. The evals use `kibana_sample_data_logs`, `kibana_sample_data_ecommerce` and `kibana_sample_data_flights`.

The ES|QL panels in the edge-case dashboards cover this shape. They don't use the prompt's presentation defaults, which a future Agent Builder-style corpus dashboard could add.

## Capturing

Run on demand: when the corpus changes, when Kibana's rendering changes, or before a release. It never runs in CI (its config is listed under `disabled`, with the other out-of-band suites, in `.buildkite/ftr-manifests/ftr_platform_stateful_configs.yml`).

```sh
# Elasticsearch and Kibana, the way FTR runs them
node scripts/functional_tests_server --config x-pack/platform/test/isomer_corpus/config.ts

# In another shell: capture every dashboard and run the round trip, into this package's captures/
node scripts/functional_test_runner --config x-pack/platform/test/isomer_corpus/config.ts

# Then export screenshots and expected strings for Isomer's review, into this package's review/
node x-pack/platform/packages/shared/isomer/isomer-corpus/scripts/export_review.js

# Only the round trip (no browser screenshots, a few seconds)
node scripts/functional_test_runner --config x-pack/platform/test/isomer_corpus/config.ts --grep "round trip"
```

| Variable | Default | Effect |
| --- | --- | --- |
| `ISOMER_CORPUS_NOW` | `2025-01-15T12:00:00.000Z` | The instant sample data is installed against and relative time ranges resolve to |
| `ISOMER_CORPUS_OUTPUT_DIR` | this package's `captures` | Where captures are written |
| `ISOMER_CORPUS_DASHBOARDS` | every dashboard | Comma-separated dashboard names to capture, for example `isomer-corpus-values,sample-logs` |
| `TEST_BROWSER_BINARY_PATH` | Chrome on the machine | A Chrome that matches the installed ChromeDriver, when the local Chrome doesn't |

The run reinstalls the sample data with `?now=`, so its timestamps don't depend on when it runs, and opens every dashboard at an absolute time range (`_g` in the URL, which wins over a stored range). It pins `dateFormat:tz` to `UTC` and the window to 1600×1200. The browser's own time zone is recorded but not pinned.

A panel that fails to capture is recorded in the summary with its error, and the run continues.
