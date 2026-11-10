# Isomer

Hosts Kibana's shared Isomer runtime with its primitive packs, and materializes saved objects into Isomer nodes. The plugin is server-only and always enabled.

## Runtime

The start contract's `getRuntime()` resolves a `createKibanaIsomerRuntime` with `@kbn/isomer-components`' `componentsPackWithCharts` and Isomer's charts pack (`loadKibanaChartsPack` from `@kbn/isomer`), which draws charts with headless Elastic Charts on the server. The engine loads on the first chart drawn, not with the runtime. Primitive schemas stay in memory for the life of the process once built, so the runtime and its packs load on the first call rather than at startup, and every later call shares that runtime. Call `getRuntime()` when a request needs it, not during `setup` or `start`.

## Materialization

`materialize` turns a saved object, by ID or by its as-code config, into a known Isomer node that renders on every surface. Anything it can't produce becomes an `unsupported` node with a reason, so it never returns something that doesn't render.

- **Registry.** Each saved object type has at most one `Materializer`, registered with `registerMaterializer(type, materializer)` on the setup contract. A materializer parses the type's as-code config, optionally loads a saved object as that config, optionally resolves the parsed config with the user's services (data views, advanced settings), plans the data it needs as `DataRequest`s, and maps the config and results to a node. It never queries itself.
- **In process.** `asScoped(request).materialize(input, context)` on the start contract runs as the user who made `request`. `context` carries the time range, query, filters and ES|QL control values; hosts keep `filters` as their state and pass them back to materialize again. `filtersForSelection(event, node)` turns a chart selection, the charts pack's `ChartEvent`, into those filters.
- **Over HTTP.** `POST /api/isomer/materialize` (version `2023-10-31`) takes `{ input, context }`, with `context` fields in snake case, and returns an Isomer composition holding the node. It runs with normal Kibana authentication, as the requesting user.

### Pipeline

Every `materialize` call runs one pipeline, as the requesting user:

1. **Context.** Each data request runs in the caller's context merged with the request's own override: its fields replace the caller's, its filters add to the caller's, and `ignoreGlobalFilters` drops the caller's filters and query. Nested `materialize` requests (a dashboard's panels) pass the merged context down.
2. **Execution.** `esql` requests run through the data plugin's scoped `search.esql`, the way Lens's `esql` expression does: the time range, filters, query and ES|QL control values go through its Kibana query context, and `dateFormat:tz` is the default time zone. Each request has a 30 second timeout and a cap of 1,000 rows, ES|QL's default result size; a request may set a lower `maxRows`. A capped table adds a `losses` entry to the node. `aggs` requests run the way Kibana's server `esaggs` function does: agg configs from the user's server aggs service (`data.search.aggs.asScopedToClient`) over a saved data view or an ad hoc spec, the request built and sent by `handleEsaggsRequest` through the user's search source, and the response tabified into `esaggs`' `Datatable`. The time range filters the request's `timeFields`, or the data view's time field; auto date histogram intervals come from the time range and the user's `histogram:barTarget` and `histogram:maxBars`; the context's time zone applies to date histograms and date ranges that set none. They default to the options Lens runs `esaggs` with (no metrics at every level, no partial rows), and take a sampling `probability`. Time shifts, reduced time ranges and filtered metrics are the aggs' own params. They share the timeout and row cap; the cap applies after tabifying. `search` requests have no executor yet and return `unsupported`.
3. **Mapping and provenance.** The context's time range is resolved to absolute times once, before planning, so the queries and the provenance agree. Date math such as `now-7d/d` resolves and rounds in the context's time zone, then the user's `dateFormat:tz` (`Browser` as UTC), as Kibana's browser resolves it. The materializer maps the results. Chart nodes (`metric`, `xyChart`) and `unsupported` nodes get `source` provenance: `host: 'kibana'`, the Kibana version as `hostVersion`, the time range and capture time, and in `meta` the materializer and its version, space, and saved object type and ID. Chart nodes also get the pipeline's losses.
4. **Validation.** Every result is validated the way the runtime validates a composition, against the Isomer input budget and the charts and components packs' primitives, nodes inside a `grid` included. A failing plan, query, mapping or validation returns `unsupported` with a reason, titled from the materializer's `describe` when it has one.

### Lens data-view queries

`server/materialize/lens_aggs` turns a Lens chart that queries a data view into the `aggs` requests Lens runs for it. `compileLensDataViewChart(chart)` takes the chart in Lens's API format, turns it into the Lens attributes Lens itself would save (`LensConfigBuilder.fromAPIFormat`, so columns, IDs and defaults are Lens's), and compiles each form-based layer the way Lens's `toExpression` builds its `esaggs` call:

- one agg per column, in column order, as each operation's `toEsAggsFn` builds it;
- duplicate aggs merged as Lens's `dedupeAggs` merges them, and single percentiles of one field merged into one `percentiles` agg as the percentile operation's `optimizeEsAggs` merges them;
- the layer's sampling (off when a min or max column is in it) and `ignoreGlobalFilters`;
- the layer's data view: a saved data view's ID, or the ad hoc data view spec Lens keeps for it.

Each layer comes with Lens's `esaggs` ID map, from each table column (`col-1-0.95`) to the Lens columns it fills, as Lens's `lens_map_to_columns` takes it. The metric operations compile: count, unique count, sum, average, minimum, maximum, median, standard deviation, percentile, percentile rank and last value. A layer with any other column, or with a filter, time shift, reduced time range or time scale on a column, comes back with the reason it can't be compiled yet.

### `MaterializeKit`

`map` gets a kit built for the user and the context its plan ran in, so every materializer formats and colors as Kibana does:

- **`toPortableFormat(format, type)`** maps a Kibana field format, as `Datatable` column meta carries it, to Isomer's `PortableFormat`, which is `Intl` options (elastic/isomer#315): Numeral.js patterns become fraction digits, grouping, `signDisplay` (with `alwaysShowSign`) and compact notation for `number`, `percent` (whole-number percentages as `fractional: false`), and `bytes` or `bits` with their base; `duration` with its units, precision and suffix length; `date` with the nearest `Intl.DateTimeFormat` fields for its moment pattern, in the context's time zone (then `dateFormat:tz`, with `Browser` formatting as UTC, as Kibana's server does), recording any part of the pattern `Intl` has no field for as an `approximated` loss; `text` for strings, booleans and IPs. It unwraps the aggs `terms` format (keeping its Other and missing labels) and Lens's `suffix` format. `format:number:defaultLocale` is no longer part of a format: a host resolves the chart in `intlLocaleFor(numberLocale)`. Formats without a portable form (currency, ordinals and other Numeral.js patterns, converted durations without a suffix, string transforms, URL, color, static lookup and others) come with Kibana's own text for each value instead. Kibana's parity tests for these formats run against Isomer's resolver, and note where `Intl` differs, such as `1.5kB` for Numeral.js's `1.5KB`.
- **`toChartData(table, options)`** turns a `Datatable` into a chart's `data`, unreordered with raw values, so selections refer to the source rows. Each column's `source` is its `Datatable` column (`{ kind: 'kibana-datatable-column', column }`) and `data.source` is the table's meta, so a host can rebuild the table a selection refers to. Pre-rendered formats and bucket labels arrive as `display` strings, and anything that didn't carry over is a `losses` entry.
- **`paletteColors(count, paletteId)`** returns a `@kbn/palettes` palette's colors for light and dark, falling back to Kibana's default palette.
- **`colorMappingColors(categories, colorMapping)`** returns the color a Kibana color mapping gives each category, for light and dark, through `@kbn/coloring`'s `getColorFactory`, as Kibana's charts pick them.

### Selections

`filtersForSelection(event, node)` turns a `ChartEvent` on a node into the Kibana filters Kibana's value click and range select actions build, as the requesting user. It rebuilds the `Datatable` from the node's column sources and resolves each selected column:

- **Data view tables** (`esaggs` columns): the column's agg config, created through the server aggs service from its data view, builds the filter with the agg type's own `createFilter`: terms, the Other bucket (excluding the other terms beside it), the missing bucket, histograms, ranges, date histograms and the rest.
- **ES|QL tables**: date histogram and histogram columns filter to their bucket, other aggregated columns to field existence, and raw columns to their value when the index pattern's field can be filtered.
- **Brushes** filter the brushed column's field to the brushed range.

Hosts outside Kibana's server call it over HTTP: `POST /api/isomer/filters_for_selection` (version `2023-10-31`) takes `{ event, node }`, with the node as `POST /api/isomer/materialize` returned it, and returns `{ filters }`. It has the same authentication and feature flag as the materialize route, and returns `400` for a node that doesn't validate or a selection that doesn't fit it.

A `negate` selection negates every filter, and duplicates are dropped. Filters carry no display mapping (`meta.key`, `meta.value`), which Kibana's filter manager adds when a Kibana host adds them; ES|QL filters name the query's index pattern as their `meta.index`.

### Dashboards

The `dashboard` materializer turns a dashboard, by ID or as a `DashboardState`, into a charts pack `grid`:

1. **Load.** By ID, the Dashboard plugin's server client reads the dashboard as `GET /api/dashboards/{id}` does (`transformDashboardOut`). That read drops panels whose type has no as-code schema, such as Maps and legacy visualizations, with `dropped_panel` warnings. When it does, a second read in the Dashboard app's format recovers those panels' IDs, types, positions, titles and saved objects, so they still appear. By-reference panels without a title of their own take their saved object's title, as their panel header does. The Dashboard plugin is resolved at runtime (`runtimePluginDependencies`), since a plugin dependency on it would be a cycle.
2. **Context**, as Dashboard gives it to each panel. The request's context comes first. The dashboard's saved query applies when the request has none, and its saved time range, then `timepicker:timeDefaults`, when the request has no time range. A relative range resolves as the pipeline resolves the request's: in the context's time zone, then the user's `dateFormat:tz`, as Kibana's browser does. Pinned controls and controls in the grid add their selections the way the controls plugin builds them: options lists and range sliders as Kibana filters (through the user's data views), ES|QL controls as ES|QL variables (the request's take the place of any of the same name), and the time slider as a timeslice. Control filters and variables in a section apply only to that section's panels, and never to the control itself. A panel's custom time range comes first, then the timeslice, then the dashboard's. Filters and the query reach every panel; a Lens layer's "ignore global filters" is the Lens materializer's to apply. Options lists whose options come from an ES|QL query aren't applied, and each chart they would filter carries a `losses` entry saying so.
3. **Fan-out.** One `materialize` request per panel, run in parallel, through the panel's saved object type (`vis` panels as `lens`, `discover_session` as `search`, `legacy_vis` as `visualization`, others as their panel type): by reference when the panel has a `ref_id`, by value otherwise.
4. **Grid.** Each panel keeps its 48-column position, and sections keep their panels. Panel titles and descriptions sit on the grid panel, not the node, and are left out where the panel or dashboard hides titles. Chart nodes drop their own title, and their `source.meta` gains the panel's ID (`panelId`). Panels that fail or have no materializer, and control panels in the grid, are `unsupported` placeholders named for the panel, linking to the dashboard ("Open in Kibana") when it was loaded by ID. If the whole grid is over Isomer's input budget, its largest panels become placeholders until it fits.

Legacy Markdown visualizations stored inside a dashboard, which the Dashboard API drops, are recovered with their content and materialize as Markdown panels.

### Markdown, Image and Links panels

Panels whose config is their content map onto the components pack, with no data requests:

- **`markdown`**: a Markdown panel by value, or a Markdown library item by ID, becomes `markdown` with its content.
- **`image`**: an image at an absolute http(s) URL becomes a `markdown` image with its alt text. Its fit and background color have no equivalent. An image uploaded to Kibana is a file only an authenticated Kibana request can read, so it's `unsupported` until the components pack has an `image` that takes a file ID.
- **`links`**: a Links panel by value. One link becomes `link`: a dashboard link by app route (`dashboards`, `#/view/{id}`), which the host resolves in its space, and an external link by URL. Several links become `markdown`, a list or, for a horizontal layout, one line, with dashboard links as URLs in the request's space. Unlabeled dashboard links show the dashboard's title, and an unreadable dashboard shows "Error fetching dashboard", as the links panel does. Links don't carry the dashboard's filters or time range, which Kibana's dashboard links can.

The route marks a composition whose grid holds placeholders as degraded (`meta.partialFailure`), saying how many panels couldn't be shown.

### Lens

The plugin registers the `lens` materializer. It takes a Lens chart in Lens's API format (`@kbn/lens-embeddable-utils`), by value, or by reference: it loads the `lens` saved object and turns it into that format with Lens's registered embeddable `transformOut` (from the optional `embeddable` plugin).

- **Charts:** ES|QL `metric` and `xy` charts map to the charts pack's `metric` and `xyChart`. Other chart types, and charts that query a data view, return `unsupported` with a reason.
- **Data:** one `esql` request per query, in layer order, with the panel's filters and each layer's `ignore_global_filters`. The time range filters on the field the query uses with `?_tstart`/`?_tend`, or else on `@timestamp` when every index the query reads maps it, as Kibana's ES|QL time field resolution does. Columns are formatted as Lens's `lens_format_column` formats them, then mapped with the kit.
- **Rendering defaults:** series colors by Lens's palette per series type and its color mappings, axis titles from the first series on each axis, Lens's default colors for a metric bar, compared secondary values and annotations, and Lens's `lens_collapse` for a collapsed breakdown.
- **Interactions:** dimension columns are selectable (`tile` for a metric breakdown; `datum`, and `series` and `legend` with a split, for xy), a date x axis is brushable, and a saved chart links back to the Lens editor on the time range it was queried for.
- **Gate A:** `lens/gate_a_visual.test.ts` runs every Gate A fixture (`@kbn/isomer-gate-a`) from Kibana's captured table through this mapping and `resolveChart`, and compares the Scene, and what headless Elastic Charts (`@elastic/isomer-charts-elastic/headless`) draws from it, with what Kibana drew (see `@kbn/isomer-gate-a`). A Scene has no ticks, so axis labels are compared only where the engine draws them. The on-demand suite `x-pack/platform/test/isomer_gate_a` checks the tables our pipeline queries against Kibana's.
- Whatever doesn't carry over (a metric's trend line, distributed palettes, the compare badge's background, an inclusive last color band) is a `losses` entry.

### Instrumentation

Sizes are measured as Isomer's input budget counts them (`measureInput` matches the SDK's `checkInputBudget`), and reported as event-based telemetry and debug logs (`plugins.isomer.instrumentation`):

- **`isomer_materialize`**, once per node, nested ones included: saved object type, outcome, node type, depth, values, characters, time, planned data requests, how many hit the row cap, and whether the node was over the input budget.
- **`isomer_render_png`**, once per PNG the PNG host draws: node type, time drawing and time queued, PNG bytes, size and scale, the process's RSS after less before, and whether the render loaded the engine.
- **`isomer_render`**, once per HTML, text, Markdown or Slack render of a composition holding charts pack nodes, through the runtime `getRuntime()` returns: surface, node count, values and characters, render time, output characters, and whether the render refused the composition as over the budget.

## Chart images in Kibana's process

The PNG host (`server/render/png_host.ts`) draws a node, or a composition, to a PNG without a browser or a render service: the `snapshot` surface under the charts frame, headless Elastic Charts' SVG for each chart (`@elastic/isomer-charts-elastic/headless`), and takumi's rasterizer (`@elastic/isomer-image-takumi`). It follows Isomer's guidance for a small server (elastic/isomer#378):

- **Nothing loads at start.** The image runtime, takumi's native binary and its fonts load on the first PNG, and headless Elastic Charts on the first chart, so a Kibana that never draws an image never pays for them (measured by Isomer at about 50 MB of RSS loaded).
- **Two renders at once, eight queued.** Past the queue, a render throws `RenderBusyError` and the route answers `429` with `retry-after`.
- **At most 2× scale**, and **25,000 values** (1,000,000 characters) per image, a tenth of the charts pack's budget. Content over it is refused before drawing (`RenderInputError`, `400`).
- **One takumi backend per process**, with Inter, Latin only, at 400, 500, 600 and 700, registered once (`server/render/fonts`, subset from Kibana's own Inter, OFL).
- **Kibana's render context.** Charts resolve in the user's color scheme (`theme:darkMode`), `Intl` locale (from `format:number:defaultLocale`) and time zone (`dateFormat:tz`, `Browser` as UTC). `snapshot` takes no host context, so the host passes it to the charts pack's resolver through an `AsyncLocalStorage`.

The start contract's `renderPng(node, options)` draws a materialized node, behind `isomer.materializeEnabled`. `POST /internal/isomer/render/png` (version `1`) materializes the same input as `POST /api/isomer/materialize` and returns the PNG, with `image: { scheme?, scale?, width? }`. One chart draws 512 CSS pixels wide by default: the 480 pixels a chart lays out for on Node, in the charts frame's padding. To try it on the sample web logs:

```sh
node x-pack/platform/plugins/shared/isomer/scripts/render_png.js --example metric --out metric.png
node x-pack/platform/plugins/shared/isomer/scripts/render_png.js --example xy --scheme dark --out xy.png
```

The headless engine needs elastic/elastic-charts#2939, which isn't released: this branch replaces `@elastic/charts` with a build of it. See `x-pack/platform/packages/shared/isomer/vendor/README.md`.

Materialization is off unless the `isomer.materializeEnabled` feature flag is on. While it's off, the route returns `404` and `materialize` returns `unsupported`. To turn it on locally, add this to `kibana.dev.yml`:

```yaml
feature_flags.overrides:
  isomer.materializeEnabled: true
```

`server/materialize/nodes.ts` is the only module that names the node types materialization produces: the charts pack's `metric`, `xyChart`, `grid` and `unsupported`, and the components pack's `markdown` and `link`.
