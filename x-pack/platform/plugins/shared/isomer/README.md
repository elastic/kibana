# Isomer

Hosts Kibana's shared Isomer runtime with its primitive packs, and materializes saved objects into Isomer nodes. The plugin is server-only and always enabled.

## Runtime

The start contract's `getRuntime()` resolves a `createKibanaIsomerRuntime` with `@kbn/isomer-components`' `componentsPack`. Primitive schemas stay in memory for the life of the process once built, so the runtime and its packs load on the first call rather than at startup, and every later call shares that runtime. Call `getRuntime()` when a request needs it, not during `setup` or `start`.

## Materialization

`materialize` turns a saved object, by ID or by its as-code config, into a known Isomer node that renders on every surface. Anything it can't produce becomes an `unsupported` node with a reason, so it never returns something that doesn't render.

- **Registry.** Each saved object type has at most one `Materializer`, registered with `registerMaterializer(type, materializer)` on the setup contract. A materializer parses the type's as-code config, optionally loads a saved object as that config, plans the data it needs as `DataRequest`s, and maps the config and results to a node. It never queries itself.
- **In process.** `asScoped(request).materialize(input, context)` on the start contract runs as the user who made `request`. `context` carries the time range, query, filters and ES|QL control values; hosts keep `filters` as their state and pass them back to materialize again. `filtersForSelection(event, node)` turns a chart selection, the charts pack's `ChartEvent`, into those filters.
- **Over HTTP.** `POST /api/isomer/materialize` (version `2023-10-31`) takes `{ input, context }`, with `context` fields in snake case, and returns an Isomer composition holding the node. It runs with normal Kibana authentication, as the requesting user.

### Pipeline

Every `materialize` call runs one pipeline, as the requesting user:

1. **Context.** Each data request runs in the caller's context merged with the request's own override: its fields replace the caller's, its filters add to the caller's, and `ignoreGlobalFilters` drops the caller's filters and query. Nested `materialize` requests (a dashboard's panels) pass the merged context down.
2. **Execution.** `esql` requests run through the data plugin's scoped `search.esql`, the way Lens's `esql` expression does: the time range, filters, query and ES|QL control values go through its Kibana query context, and `dateFormat:tz` is the default time zone. Each request has a 30 second timeout and a cap of 1,000 rows, ES|QL's default result size; a request may set a lower `maxRows`. A capped table adds a `losses` entry to the node. `aggs` and `search` requests have no executor yet and return `unsupported`.
3. **Mapping and provenance.** The context's time range is resolved to absolute times once, before planning, so the queries and the provenance agree. Date math such as `now-7d/d` resolves and rounds in the context's time zone, then the user's `dateFormat:tz` (`Browser` as UTC), as Kibana's browser resolves it. The materializer maps the results. Chart nodes (`metric`, `xyChart`) and `unsupported` nodes get `source` provenance: `host: 'kibana'`, the Kibana version as `hostVersion`, the time range and capture time, and in `meta` the materializer and its version, space, and saved object type and ID. Chart nodes also get the pipeline's losses.
4. **Validation.** Every result is validated the way the runtime validates a composition, against the Isomer input budget and the charts and components packs' primitives, nodes inside a `grid` included. A failing plan, query, mapping or validation returns `unsupported` with a reason, titled from the materializer's `describe` when it has one.

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

A `negate` selection negates every filter, and duplicates are dropped. Filters carry no display mapping (`meta.key`, `meta.value`), which Kibana's filter manager adds when a Kibana host adds them; ES|QL filters name the query's index pattern as their `meta.index`.

### Lens

The plugin registers the `lens` materializer. It takes a Lens chart in Lens's API format (`@kbn/lens-embeddable-utils`), by value, or by reference: it loads the `lens` saved object and turns it into that format with Lens's registered embeddable `transformOut` (from the optional `embeddable` plugin).

- **Charts:** ES|QL `metric` and `xy` charts map to the charts pack's `metric` and `xyChart`. Other chart types, and charts that query a data view, return `unsupported` with a reason.
- **Data:** one `esql` request per query, in layer order, with the panel's filters and each layer's `ignore_global_filters`. The time range filters on the field the query uses with `?_tstart`/`?_tend`, or else on `@timestamp` when every index the query reads maps it, as Kibana's ES|QL time field resolution does. Columns are formatted as Lens's `lens_format_column` formats them, then mapped with the kit.
- **Rendering defaults:** series colors by Lens's palette per series type and its color mappings, axis titles from the first series on each axis, Lens's default colors for a metric bar, compared secondary values and annotations, and Lens's `lens_collapse` for a collapsed breakdown.
- **Interactions:** dimension columns are selectable (`tile` for a metric breakdown; `datum`, and `series` and `legend` with a split, for xy), a date x axis is brushable, and a saved chart links back to the Lens editor on the time range it was queried for.
- **Gate A:** `lens/gate_a_visual.test.ts` runs every Gate A fixture (`@kbn/isomer-gate-a`) from Kibana's captured table through this mapping and `resolveChart`, and compares the Scene, and what headless Elastic Charts (`@elastic/isomer-charts-elastic/headless`) draws from it, with what Kibana drew (see `@kbn/isomer-gate-a`). A Scene has no ticks, so axis labels are compared only where the engine draws them. The on-demand suite `x-pack/platform/test/isomer_gate_a` checks the tables our pipeline queries against Kibana's.
- Whatever doesn't carry over (a metric's trend line, distributed palettes, the compare badge's background, an inclusive last color band) is a `losses` entry.

Materialization is off unless the `isomer.materializeEnabled` feature flag is on. While it's off, the route returns `404` and `materialize` returns `unsupported`. To turn it on locally, add this to `kibana.dev.yml`:

```yaml
feature_flags.overrides:
  isomer.materializeEnabled: true
```

`server/materialize/nodes.ts` is the only module that names the node types materialization produces: the charts pack's `metric`, `xyChart`, `grid` and `unsupported`, and the components pack's `markdown` and `link`.
