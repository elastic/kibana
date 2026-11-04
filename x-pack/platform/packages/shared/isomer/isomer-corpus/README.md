# @kbn/isomer-corpus

The fidelity corpus for saved object materialization: what Kibana itself draws for a set of dashboards, captured so materializers and renderers can be compared against it without a browser: Gate A in Kibana, and visual review in Isomer.

This package holds the corpus definition, the pure helpers the capture uses, and the captures. The capture itself is an FTR suite, `x-pack/platform/test/isomer_corpus`, because it needs Kibana's FTR services (`elasticChart`, `inspector`, `dashboardPanelActions`).

## Corpus

| Dashboard | Source | Covers |
| --- | --- | --- |
| `sample-flights`, `sample-logs`, `sample-ecommerce` | The sample data sets' overview dashboards (`GET /api/sample_data`) | What users see first: Lens panels, Discover sessions, Maps and legacy visualizations |
| `isomer-corpus-values` | `src/edge_case_dashboards.ts` | Null, negative, huge and tiny values in metric, xy and table panels |
| `isomer-corpus-buckets` | `src/edge_case_dashboards.ts` | Other and missing buckets, multivalue fields, in xy, pie and table panels |
| `isomer-corpus-long-titles` | `src/edge_case_dashboards.ts` | Long panel titles, long and non-ASCII labels and legends |

The edge-case dashboards are written in the as-code format (Lens API configs, `type: 'vis'`) and created with `PUT /api/dashboards/{id}`. Their data is `buildEdgeCaseDocuments()`: one document an hour for a week in the `isomer-corpus-edge-cases` index, a pure function of the document index. A unit test validates every panel against Lens's `lensApiConfigSchema` and every dashboard against the dashboard schema, and checks that the data holds each edge case.

## What is captured

For each panel of each dashboard, in light and dark:

| File | Contents | How |
| --- | --- | --- |
| `panels/<panel>/config.json` | The as-code panel; for by-reference Lens panels, also the visualization | `GET /api/dashboards/{id}` (`transformDashboardOut`), `GET /api/visualizations/{id}` (Lens `transformOut`) |
| `panels/<panel>/<theme>/capture.json` → `inspector.tables` | Kibana's `Datatable`s, keyed as the `tables` adapter keys them | The panel's inspector `tables` adapter |
| `panels/<panel>/<theme>/capture.json` → `panel.charts[].debugState` | Elastic Charts' `DebugState` for every chart in the panel | `data-ech-debug-state`, with `window._echDebugStateFlag` on |
| `panels/<panel>/<theme>/capture.json` → `panel.metrics`, `panel.dataGrids` | Text, inline and computed colors, in page order | The rendered Elastic Charts metric and EUI data grid |
| `panels/<panel>/<theme>/capture.json` → `context` | `now`, the relative and absolute time range, `dateFormat:tz`, the page's theme, time zone, locale and pixel ratio, the panel's grid position and size | The page and the run's settings |
| `panels/<panel>/<theme>/screenshot.png` | One screenshot, for people to look at; never compared automatically | The page, cropped to the panel |

Each dashboard also has `dashboard.json` (the as-code response, `warnings` included) and `summary.<theme>.json` (one line per panel: captured, how many charts reported `DebugState`, whether the inspector had tables). `run.json` records `now`, Kibana's version, the window size and the pinned settings.

Panels the as-code API can't express (Maps and legacy visualizations, reported as `dropped_panel` warnings) still render, so they're captured too, with `in_as_code: false` and no config.

Saved object bookkeeping (`meta.created_at`, `meta.updated_at`, `meta.version`) and FTR's URL cache buster are left out, so recapturing unchanged content changes no file. The screenshots are not committed: they're binary and only for review. Each run writes them next to the JSON.

## Capturing

Run on demand: when the corpus changes, when Kibana's rendering changes, or before a release. It never runs in CI (its config is listed under `disabled`, with the other out-of-band suites, in `.buildkite/ftr-manifests/ftr_platform_stateful_configs.yml`).

```sh
# Elasticsearch and Kibana, the way FTR runs them
node scripts/functional_tests_server --config x-pack/platform/test/isomer_corpus/config.ts

# In another shell: capture every dashboard into ./captures
node scripts/functional_test_runner --config x-pack/platform/test/isomer_corpus/config.ts
```

| Variable | Default | Effect |
| --- | --- | --- |
| `ISOMER_CORPUS_NOW` | `2025-01-15T12:00:00.000Z` | The instant sample data is installed against and relative time ranges resolve to |
| `ISOMER_CORPUS_OUTPUT_DIR` | this package's `captures` | Where captures are written |
| `ISOMER_CORPUS_DASHBOARDS` | every dashboard | Comma-separated dashboard names to capture, for example `isomer-corpus-values,sample-logs` |
| `TEST_BROWSER_BINARY_PATH` | Chrome on the machine | A Chrome that matches the installed ChromeDriver, when the local Chrome doesn't |

The run reinstalls the sample data with `?now=`, so its timestamps don't depend on when it runs, and opens every dashboard at an absolute time range (`_g` in the URL, which wins over a stored range). It pins `dateFormat:tz` to `UTC` and the window to 1600×1200. The browser's own time zone is recorded but not pinned.

A panel that fails to capture is recorded in the summary with its error, and the run continues.
