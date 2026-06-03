/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const commonPitfallsContent = `# Common Pitfalls

These issues cause silent failures or "spec validates but chart renders broken" symptoms.
Read this BEFORE authoring any Vega or Vega-Lite spec for Kibana.

## 1. Dark-Theme Config Block (MANDATORY)

Without this block, charts render with bright white borders on Kibana's dark theme.
Include it in every spec, both Vega-Lite and full Vega:

\`\`\`json
"config": {
  "axis": { "domainColor": "#444", "tickColor": "#444" },
  "view": { "stroke": null }
}
\`\`\`

## 2. JSON Only, Never HJSON

Triple-quoted multi-line strings ('''...''') cause "End of input while parsing
an object" errors. Use single-line JSON queries with escaped quotes:

\`\`\`json
"query": "FROM logs-* | WHERE log.level == \\"error\\" | STATS count = COUNT() BY service.name | RENAME service.name AS service | SORT count DESC | LIMIT 10"
\`\`\`

## 3. Rename Dotted Field Names in ES|QL

Vega and Vega-Lite interpret dots in field names as nested object paths. A field
called \`service.name\` becomes \`{ service: { name: ... } }\` and silently
disappears from encodings. Always RENAME in ES|QL before referencing the field:

\`\`\`
FROM logs-* | STATS count = COUNT() BY service.name | RENAME service.name AS service
\`\`\`

Then reference \`service\`, not \`service.name\`, in the spec.

## 4. \`autosize\`, Not \`width\`/\`height\`

Kibana controls panel sizing. Setting explicit dimensions either gets ignored or
fights the panel. Always:

\`\`\`json
"autosize": { "type": "fit", "contains": "padding" }
\`\`\`

## 5. Layered-Spec Sort Conflicts

In a layered spec (e.g. bars + value-label text on the same y-axis), using
\`sort: "-x"\` on the shared encoding triggers:

> Domains that should be unioned has conflicting sort properties. Sort will be set to true.

Solution: pre-sort in ES|QL with \`SORT field DESC\` and use \`sort: null\` on
the categorical encoding to preserve data order:

\`\`\`json
// ES|QL: ... | SORT sales DESC
"encoding": {
  "y": { "field": "region", "type": "nominal", "sort": null },
  "x": { "field": "sales", "type": "quantitative" }
}
\`\`\`

\`sort: "-x"\` is fine in single-mark specs - the conflict is layer-specific.

## 6. Horizontal Bar Chart Label Truncation

Y-axis labels truncate on horizontal bar charts. Set \`labelLimit\`:

\`\`\`json
"y": { "field": "category", "axis": { "labelLimit": 150 } }
\`\`\`

## 7. Time Axis: Never Rotate Labels

Rotated date labels are unreadable. Keep them horizontal and let Vega format them:

\`\`\`json
"x": {
  "field": "bucket",
  "type": "temporal",
  "title": null,
  "axis": { "labelAngle": 0, "tickCount": 8 }
}
\`\`\`

## 8. Descriptive Titles Replace Axis Titles

A good title/subtitle makes axis titles redundant. Use \`title: null\` on axes
when the chart title is self-explanatory. Keep axis titles only when units
aren't obvious - prefer compact units ("ms", "%") over verbose labels.

## 9. Color Discipline

- Single series = single color. Don't add a rainbow gradient where position
  already encodes value. A safe default is \`#6092C0\`.
- Color encoding is for meaningful data dimensions only.
- Sequential schemes (\`blues\`, \`greens\`, \`viridis\`) for quantitative data;
  categorical schemes (\`tableau10\`, \`category10\`) for nominal data with
  <=10 categories.
- Avoid \`reverse: true\` with diverging schemes on dark theme - bars can
  render invisible.

## 10. Pie / Donut Charts

Humans cannot accurately compare arc lengths. Use a sorted horizontal bar chart
instead. If the user explicitly insists on a pie, comply but warn them.

## Failure-Mode Cheatsheet

| Symptom | Likely Cause | Fix |
| --- | --- | --- |
| "End of input while parsing an object" | HJSON triple quotes | Switch to JSON |
| Labels show "undefined" | Dotted field names | RENAME in ES|QL |
| "conflicting sort properties" warning | \`sort: "-x"\` in layered spec | \`sort: null\` + ES|QL SORT |
| Bright white borders on dark theme | Missing dark-theme config | Add config block |
| Y-axis labels truncated | No \`labelLimit\` | \`axis: { "labelLimit": 150 }\` |
| "width/height ignored" | Explicit dimensions | Use \`autosize\` |
| Chart misses dashboard filters | \`%context%\` not set | Add \`"%context%": true\` |
| Time picker doesn't apply | Missing \`%timefield%\` or \`?_tstart\`/\`?_tend\` | Add both |
`;

export const esqlInVegaContent = `# ES|QL in Vega

Kibana's Vega runtime understands ES|QL via the \`%type%: "esql"\` data-source
extension. ES|QL is the only supported data source for this skill.

## Minimal Shape

\`\`\`json
{
  "data": {
    "url": {
      "%type%": "esql",
      "query": "FROM logs-* | STATS count = COUNT() BY status"
    }
  }
}
\`\`\`

## Full Property Reference

| Property | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| \`%type%\` | \`"esql"\` | yes | - | Selects the ES\\|QL parser |
| \`query\` | string | yes | - | The ES\\|QL query, single-line, escaped quotes |
| \`%context%\` | boolean | no | \`false\` | Apply dashboard filters to the query |
| \`%timefield%\` | string | no | - | Field name for time-based filtering (enables \`?_tstart\` / \`?_tend\`) |
| \`dropNullColumns\` | boolean | no | \`true\` | Remove columns whose values are all null |
| \`params\` | object[] | no | \`[]\` | Custom named parameters available as \`?paramName\` |

## Time-Range Integration

Set \`%timefield%\` and reference \`?_tstart\` / \`?_tend\` in the query. Kibana
populates them from the dashboard time picker:

\`\`\`json
{
  "data": {
    "url": {
      "%type%": "esql",
      "%timefield%": "@timestamp",
      "query": "FROM metrics-* | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend | STATS avg_cpu = AVG(system.cpu.total.pct) BY bucket = DATE_TRUNC(5 minutes, @timestamp) | SORT bucket ASC"
    }
  }
}
\`\`\`

Parameters are case-insensitive (\`?_TSTART\` works).

## Dashboard Filters

Enable \`%context%\` so dashboard-level filter pills are merged into the query:

\`\`\`json
{
  "data": {
    "url": {
      "%type%": "esql",
      "%context%": true,
      "%timefield%": "@timestamp",
      "query": "FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend | STATS errors = COUNT() BY service.name | RENAME service.name AS service | SORT errors DESC"
    }
  }
}
\`\`\`

## Custom Parameters

\`params\` exposes additional named ES|QL parameters:

\`\`\`json
{
  "data": {
    "url": {
      "%type%": "esql",
      "query": "FROM logs-* | WHERE level == ?level | STATS count = COUNT()",
      "params": [{ "level": "ERROR" }]
    }
  }
}
\`\`\`

## Multiple Queries (Layered Specs)

In a layered Vega-Lite spec, each layer can have its own \`data\`. Use this when
two related series have different filters:

\`\`\`json
{
  "layer": [
    {
      "data": {
        "url": {
          "%type%": "esql",
          "%timefield%": "@timestamp",
          "query": "FROM logs-* | WHERE @timestamp >= ?_tstart | STATS requests = COUNT() BY bucket = DATE_TRUNC(1h, @timestamp) | SORT bucket ASC"
        }
      },
      "mark": "line",
      "encoding": {
        "x": { "field": "bucket", "type": "temporal" },
        "y": { "field": "requests", "type": "quantitative" }
      }
    },
    {
      "data": {
        "url": {
          "%type%": "esql",
          "%timefield%": "@timestamp",
          "query": "FROM logs-* | WHERE @timestamp >= ?_tstart AND level == \\"error\\" | STATS errors = COUNT() BY bucket = DATE_TRUNC(1h, @timestamp) | SORT bucket ASC"
        }
      },
      "mark": { "type": "line", "color": "#cc2b2b" },
      "encoding": {
        "x": { "field": "bucket", "type": "temporal" },
        "y": { "field": "errors", "type": "quantitative" }
      }
    }
  ]
}
\`\`\`

## Result Transformation

ES|QL returns columnar data; Kibana's Vega runtime transforms it to row-oriented
records before handing it to Vega. A response with columns \`[country, count]\`
and values \`[["US", 100], ["UK", 50]]\` becomes
\`[{ country: "US", count: 100 }, { country: "UK", count: 50 }]\`.

## Hard Rules Specific to ES|QL in Vega

1. **Always rename dotted fields.** \`STATS count = COUNT() BY service.name | RENAME service.name AS service\`
2. **Always SORT for time series.** Line / area marks render in data order.
3. **Always LIMIT or aggregate.** Never let an unbounded \`FROM index-*\`
   reach the Vega view.
4. **Always time-filter time-based charts.** Pair \`%timefield%\` with
   \`WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend\`.
`;

export const vegaLiteReferenceContent = `# Vega-Lite Reference

Concise reference for Vega-Lite as used inside Kibana with ES|QL data sources.
For deeper grammar topics see [the official docs](https://vega.github.io/vega-lite/docs/).

## Specification Skeleton

\`\`\`json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v6.json",
  "title": { "text": "Chart Title", "subtitle": "Optional subtitle", "anchor": "start" },
  "autosize": { "type": "fit", "contains": "padding" },
  "data": { "url": { "%type%": "esql", "query": "..." } },
  "mark": "bar",
  "encoding": { "x": { ... }, "y": { ... } },
  "config": {
    "axis": { "domainColor": "#444", "tickColor": "#444" },
    "view": { "stroke": null }
  }
}
\`\`\`

## Data Types

| Type | Symbol | Use For |
| --- | --- | --- |
| Nominal | N | Categories without order (country, service name) |
| Ordinal | O | Ordered categories (low/med/high, month) |
| Quantitative | Q | Continuous numbers (latency, revenue) |
| Temporal | T | Date/time values (timestamps) |

## Encoding Channels

| Channel | Description |
| --- | --- |
| \`x\`, \`y\` | Primary position |
| \`x2\`, \`y2\` | Secondary position (range bars, error bars) |
| \`xOffset\`, \`yOffset\` | Sub-position within band (grouped bars) |
| \`color\` | Hue (nominal) or gradient (quantitative) |
| \`size\` | Mark size / area |
| \`shape\` | Point symbol (nominal, <=6 distinct values) |
| \`opacity\` | Transparency |
| \`strokeWidth\` | Line thickness |
| \`strokeDash\` | Dash pattern |
| \`text\` | Label content (with \`mark: "text"\`) |
| \`tooltip\` | Tooltip rows |
| \`row\`, \`column\` | Faceting (small multiples) |

## Mark Types

| Mark | Use Case |
| --- | --- |
| \`bar\` | Bar charts |
| \`line\` | Time series, trends |
| \`area\` | Volume over time |
| \`point\` / \`circle\` | Scatter plots |
| \`rect\` | Heatmaps |
| \`text\` | Labels |
| \`rule\` | Reference lines |
| \`tick\` | Strip plots |
| \`boxplot\` | Distribution summary (composite) |
| \`errorbar\` / \`errorband\` | Uncertainty (composite) |

Avoid \`arc\` (pie/donut) - use sorted bar charts.

## Mark Properties

\`\`\`json
"mark": {
  "type": "bar",
  "color": "#6092C0",
  "opacity": 0.85,
  "cornerRadius": 2,
  "strokeWidth": 0
}
\`\`\`

## Scales

| Type | Use For |
| --- | --- |
| \`linear\` | Quantitative |
| \`log\` | Wide-range or ratio data |
| \`sqrt\` | Area-based size encoding |
| \`time\` | Temporal |
| \`band\` | Bars (discrete with width) |
| \`ordinal\` | Discrete categories |

\`\`\`json
"y": {
  "field": "value",
  "type": "quantitative",
  "scale": { "domain": [0, 100], "zero": true, "nice": true }
}
\`\`\`

### Color Schemes

- **Sequential**: \`blues\`, \`greens\`, \`oranges\`, \`viridis\`
- **Diverging**: \`redblue\`, \`spectral\`
- **Categorical**: \`tableau10\`, \`category10\`, \`set1\`

## Transforms

### Filter

\`\`\`json
"transform": [
  { "filter": "datum.year == 2025" },
  { "filter": { "field": "service", "oneOf": ["api", "web"] } }
]
\`\`\`

### Calculate

\`\`\`json
"transform": [
  { "calculate": "datum.errors / datum.total * 100", "as": "error_rate" }
]
\`\`\`

### Aggregate

\`\`\`json
"transform": [
  {
    "aggregate": [
      { "op": "mean", "field": "latency", "as": "avg_latency" },
      { "op": "count", "as": "n" }
    ],
    "groupby": ["service"]
  }
]
\`\`\`

Operations: \`count\`, \`sum\`, \`mean\`, \`median\`, \`min\`, \`max\`, \`stdev\`,
\`variance\`, \`q1\`, \`q3\`, \`distinct\`.

### Window

\`\`\`json
"transform": [
  {
    "window": [
      { "op": "row_number", "as": "rank" },
      { "op": "sum", "field": "value", "as": "cumulative" }
    ],
    "sort": [{ "field": "value", "order": "descending" }]
  }
]
\`\`\`

### Regression

\`\`\`json
"transform": [
  { "regression": "y", "on": "x", "method": "linear" }
]
\`\`\`

Use for scatter + trend-line layered specs.

## Multi-View Composition

### Layer (overlay marks on shared axes)

\`\`\`json
{
  "layer": [
    { "mark": { "type": "area", "opacity": 0.25 } },
    { "mark": { "type": "line", "strokeWidth": 2 } }
  ],
  "encoding": {
    "x": { "field": "bucket", "type": "temporal" },
    "y": { "field": "value", "type": "quantitative" }
  }
}
\`\`\`

### Faceting (small multiples)

\`\`\`json
{
  "mark": "line",
  "encoding": {
    "column": { "field": "region", "type": "nominal" },
    "x": { "field": "bucket", "type": "temporal" },
    "y": { "field": "value", "type": "quantitative" }
  }
}
\`\`\`

### \`resolve\` (independent scales / axes / legends)

\`\`\`json
{
  "layer": [ ... ],
  "resolve": { "scale": { "y": "independent" } }
}
\`\`\`

## Common Chart Patterns

### Horizontal Bar with Value Labels (Layered)

Pre-sort in ES|QL, use \`sort: null\` on the categorical axis:

\`\`\`json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v6.json",
  "title": { "text": "Top Services by Errors", "anchor": "start" },
  "autosize": { "type": "fit", "contains": "padding" },
  "data": {
    "url": {
      "%type%": "esql",
      "%context%": true,
      "%timefield%": "@timestamp",
      "query": "FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend AND log.level == \\"error\\" | STATS errors = COUNT() BY service.name | RENAME service.name AS service | SORT errors DESC | LIMIT 10"
    }
  },
  "layer": [
    { "mark": { "type": "bar", "color": "#6092C0", "cornerRadiusEnd": 3 } },
    {
      "mark": { "type": "text", "align": "left", "dx": 5, "fontSize": 11 },
      "encoding": { "text": { "field": "errors", "format": "," } }
    }
  ],
  "encoding": {
    "y": { "field": "service", "type": "nominal", "sort": null, "title": null, "axis": { "labelLimit": 150 } },
    "x": { "field": "errors", "type": "quantitative", "title": "Errors" }
  },
  "config": {
    "axis": { "domainColor": "#444", "tickColor": "#444" },
    "view": { "stroke": null }
  }
}
\`\`\`

### Time Series (Area + Line Overlay)

\`\`\`json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v6.json",
  "title": { "text": "Requests / minute", "anchor": "start" },
  "autosize": { "type": "fit", "contains": "padding" },
  "data": {
    "url": {
      "%type%": "esql",
      "%context%": true,
      "%timefield%": "@timestamp",
      "query": "FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend | STATS requests = COUNT() BY bucket = DATE_TRUNC(1 minute, @timestamp) | SORT bucket ASC"
    }
  },
  "layer": [
    { "mark": { "type": "area", "opacity": 0.2, "color": "#6092C0" } },
    { "mark": { "type": "line", "color": "#6092C0", "strokeWidth": 2 } }
  ],
  "encoding": {
    "x": { "field": "bucket", "type": "temporal", "title": null, "axis": { "labelAngle": 0, "tickCount": 8 } },
    "y": { "field": "requests", "type": "quantitative", "title": "Requests" }
  },
  "config": {
    "axis": { "domainColor": "#444", "tickColor": "#444" },
    "view": { "stroke": null }
  }
}
\`\`\`

### Multi-Line with Direct Labels (No Legend)

\`\`\`json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v6.json",
  "title": { "text": "Latency by service", "anchor": "start" },
  "autosize": { "type": "fit", "contains": "padding" },
  "data": {
    "url": {
      "%type%": "esql",
      "%context%": true,
      "%timefield%": "@timestamp",
      "query": "FROM metrics-* | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend | STATS avg_latency = AVG(latency) BY bucket = DATE_TRUNC(5 minutes, @timestamp), service.name | RENAME service.name AS service | SORT bucket ASC"
    }
  },
  "layer": [
    { "mark": { "type": "line", "strokeWidth": 2 } },
    {
      "transform": [
        { "window": [{ "op": "row_number", "as": "rank" }], "sort": [{ "field": "bucket", "order": "descending" }], "groupby": ["service"] },
        { "filter": "datum.rank === 1" }
      ],
      "mark": { "type": "text", "align": "left", "dx": 8, "fontSize": 12, "fontWeight": "bold" },
      "encoding": { "text": { "field": "service" } }
    }
  ],
  "encoding": {
    "x": { "field": "bucket", "type": "temporal", "title": null, "axis": { "labelAngle": 0, "tickCount": 8 } },
    "y": { "field": "avg_latency", "type": "quantitative", "title": "ms" },
    "color": { "field": "service", "type": "nominal", "legend": null }
  },
  "config": {
    "axis": { "domainColor": "#444", "tickColor": "#444" },
    "view": { "stroke": null }
  }
}
\`\`\`

### Heatmap (Hour x Day-of-Week)

\`\`\`json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v6.json",
  "title": { "text": "Activity by Hour and Day", "anchor": "start" },
  "autosize": { "type": "fit", "contains": "padding" },
  "data": {
    "url": {
      "%type%": "esql",
      "%context%": true,
      "%timefield%": "@timestamp",
      "query": "FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend | EVAL hour = DATE_EXTRACT(\\"HOUR_OF_DAY\\", @timestamp) | EVAL day = DATE_FORMAT(\\"EEE\\", @timestamp) | STATS activity = COUNT() BY hour, day"
    }
  },
  "mark": { "type": "rect", "cornerRadius": 2 },
  "encoding": {
    "x": { "field": "hour", "type": "ordinal", "title": "Hour", "axis": { "labelAngle": 0 } },
    "y": { "field": "day", "type": "nominal", "sort": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], "title": null },
    "color": { "field": "activity", "type": "quantitative", "scale": { "scheme": "blues" }, "title": "Events" }
  },
  "config": {
    "axis": { "domainColor": "#444", "tickColor": "#444" },
    "view": { "stroke": null }
  }
}
\`\`\`

### Faceted Small Multiples

\`\`\`json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v6.json",
  "autosize": { "type": "fit", "contains": "padding" },
  "data": { "url": { "%type%": "esql", "query": "FROM metrics-* | STATS avg_cpu = AVG(cpu_pct) BY bucket = DATE_TRUNC(1 hour, @timestamp), host.name | RENAME host.name AS host | SORT bucket ASC" } },
  "mark": "line",
  "encoding": {
    "column": { "field": "host", "type": "nominal" },
    "x": { "field": "bucket", "type": "temporal", "title": null, "axis": { "labelAngle": 0, "tickCount": 4 } },
    "y": { "field": "avg_cpu", "type": "quantitative", "title": "CPU %" }
  },
  "config": {
    "axis": { "domainColor": "#444", "tickColor": "#444" },
    "view": { "stroke": null }
  }
}
\`\`\`

### Scatter + Trend Line

\`\`\`json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v6.json",
  "autosize": { "type": "fit", "contains": "padding" },
  "data": { "url": { "%type%": "esql", "query": "FROM metrics-* | STATS cpu = AVG(cpu_pct), memory = AVG(memory_pct) BY host.name | RENAME host.name AS host" } },
  "layer": [
    { "mark": { "type": "point", "filled": true, "size": 60, "opacity": 0.7, "color": "#6092C0" } },
    { "mark": { "type": "line", "color": "#cc2b2b", "strokeWidth": 2 }, "transform": [{ "regression": "memory", "on": "cpu" }] }
  ],
  "encoding": {
    "x": { "field": "cpu", "type": "quantitative", "title": "CPU %" },
    "y": { "field": "memory", "type": "quantitative", "title": "Memory %" }
  },
  "config": {
    "axis": { "domainColor": "#444", "tickColor": "#444" },
    "view": { "stroke": null }
  }
}
\`\`\`

## Pre-Flight Checklist

Before persisting the spec:

- [ ] Valid JSON (no HJSON triple quotes)
- [ ] \`$schema\` set to \`https://vega.github.io/schema/vega-lite/vN.json\`
- [ ] \`autosize: { "type": "fit", "contains": "padding" }\` set
- [ ] No \`width\` / \`height\` properties
- [ ] All dotted ES|QL fields renamed with \`RENAME a.b AS ab\`
- [ ] Time charts: \`%timefield%\` set and query references \`?_tstart\`/\`?_tend\`
- [ ] Dashboard-aware charts: \`%context%: true\`
- [ ] Layered specs: \`sort: null\` on categorical axis, ES|QL pre-sorted
- [ ] Bars sorted by value, not alphabetically
- [ ] Time axis: \`labelAngle: 0\`, \`tickCount: 6-10\`
- [ ] Horizontal bars: \`axis: { "labelLimit": 150 }\`
- [ ] Dark-theme \`config\` block present
- [ ] Color used to encode data, not decorate
`;

export const vegaReferenceContent = `# Full Vega Reference

Reach for full Vega only when Vega-Lite cannot express the chart - force-directed
graphs, custom signals reacting to user gestures, custom scale composition. For
anything Vega-Lite covers (statistical charts, time series, heatmaps, layered
overlays, faceting), prefer Vega-Lite.

## Specification Skeleton

\`\`\`json
{
  "$schema": "https://vega.github.io/schema/vega/v6.json",
  "autosize": { "type": "fit", "contains": "padding" },
  "padding": 5,
  "signals": [ ... ],
  "data": [ ... ],
  "scales": [ ... ],
  "axes": [ ... ],
  "marks": [ ... ],
  "config": {
    "axis": { "domainColor": "#444", "tickColor": "#444" },
    "view": { "stroke": null }
  }
}
\`\`\`

## Top-Level Sections

| Section | Purpose |
| --- | --- |
| \`signals\` | Reactive variables (user input, derived state) |
| \`data\` | Named datasets; can chain transforms via \`transform\` |
| \`scales\` | Map data values to visual values |
| \`projections\` | Geographic projections (maps) |
| \`axes\` / \`legends\` | Visual axes and legends |
| \`marks\` | Visual primitives (rect, line, symbol, text, path, ...) |

## Data Sources

ES|QL inside full Vega uses the same \`%type%: "esql"\` extension. The \`data\`
array holds one or more named datasets:

\`\`\`json
"data": [
  {
    "name": "edges",
    "url": {
      "%type%": "esql",
      "query": "FROM graph-edges | KEEP source, target, weight | LIMIT 1000"
    }
  },
  {
    "name": "nodes",
    "source": "edges",
    "transform": [
      { "type": "fold", "fields": ["source", "target"], "as": ["role", "id"] },
      { "type": "aggregate", "groupby": ["id"] }
    ]
  }
]
\`\`\`

## Common Transforms

- \`filter\`: \`{ "type": "filter", "expr": "datum.value > 0" }\`
- \`formula\`: \`{ "type": "formula", "expr": "datum.x * 2", "as": "x2" }\`
- \`aggregate\`: groupby + ops
- \`window\`: rolling computations
- \`force\`: physics-based node positioning
- \`stratify\` / \`tree\`: hierarchical layouts
- \`geopath\`: geographic paths

## Scales

\`\`\`json
"scales": [
  {
    "name": "color",
    "type": "linear",
    "domain": { "data": "values", "field": "amount" },
    "range": { "scheme": "blues" }
  },
  {
    "name": "x",
    "type": "band",
    "domain": { "data": "values", "field": "category" },
    "range": "width",
    "padding": 0.2
  }
]
\`\`\`

## Marks

Each mark has \`type\`, \`from\` (data source), \`encode\` (visual encodings):

\`\`\`json
{
  "type": "rect",
  "from": { "data": "values" },
  "encode": {
    "enter": {
      "x": { "scale": "x", "field": "category" },
      "width": { "scale": "x", "band": 1 },
      "y": { "scale": "y", "field": "value" },
      "y2": { "scale": "y", "value": 0 },
      "fill": { "value": "#6092C0" }
    },
    "update": { "fillOpacity": { "value": 1 } },
    "hover": { "fillOpacity": { "value": 0.7 } }
  }
}
\`\`\`

## Signals

Signals are reactive variables. They drive interactivity and parameterize the
spec without a re-render.

\`\`\`json
"signals": [
  { "name": "hover", "value": null, "on": [{ "events": "rect:mouseover", "update": "datum" }] }
]
\`\`\`

## Force-Directed Graph (Canonical Vega-only Case)

Full example - this is the case Vega-Lite cannot express. See
\`examples/vega-force-graph.md\` for a complete spec.

Key pieces:
- \`force\` transform with charge / collide / link / center forces
- \`symbol\` mark for nodes, \`path\` mark for links
- \`signals\` to drive iterations or fix selection state

## Stretch / Trim

Full Vega specs get long. Strip out anything you don't need:
- No \`legend\` unless the encoding actually warrants one.
- Use a single scale for shared dimensions across marks.
- Use \`from\` references rather than copying data into separate \`data\` entries.

## Cross-Reference

Most chart shapes do NOT need full Vega. If you find yourself reaching for it,
double-check the [Vega-Lite reference](vega-lite-reference.md) - layering,
faceting, transforms, and even regression / window operations are all
available there with less verbosity.
`;

export const exampleVegaLiteBarTopN = `# Example: Top-N Horizontal Bar (Vega-Lite)

Horizontal bar chart showing the top N items by a metric. Pre-sorted in ES|QL,
uses \`sort: null\` on the categorical encoding to avoid layered-sort conflicts.

\`\`\`json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v6.json",
  "title": { "text": "Top 10 Services by Error Count", "anchor": "start" },
  "autosize": { "type": "fit", "contains": "padding" },
  "data": {
    "url": {
      "%type%": "esql",
      "%context%": true,
      "%timefield%": "@timestamp",
      "query": "FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend AND log.level == \\"error\\" | STATS error_count = COUNT() BY service.name | RENAME service.name AS service | SORT error_count DESC | LIMIT 10"
    }
  },
  "mark": { "type": "bar", "color": "#6092C0", "cornerRadiusEnd": 3 },
  "encoding": {
    "y": { "field": "service", "type": "nominal", "sort": null, "title": null, "axis": { "labelLimit": 150 } },
    "x": { "field": "error_count", "type": "quantitative", "title": "Errors" },
    "tooltip": [
      { "field": "service", "type": "nominal", "title": "Service" },
      { "field": "error_count", "type": "quantitative", "title": "Errors" }
    ]
  },
  "config": {
    "axis": { "domainColor": "#444", "tickColor": "#444" },
    "view": { "stroke": null }
  }
}
\`\`\`
`;

export const exampleVegaLiteTimeSeriesLine = `# Example: Time-Series Line (Vega-Lite)

Single-line time series with automatic time-picker integration. Uses
\`%timefield%\` plus \`?_tstart\` / \`?_tend\` so the chart respects the dashboard
time range. Horizontal date labels, descriptive title, no axis titles.

\`\`\`json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v6.json",
  "title": { "text": "Request Rate", "subtitle": "Requests per minute", "anchor": "start" },
  "autosize": { "type": "fit", "contains": "padding" },
  "data": {
    "url": {
      "%type%": "esql",
      "%context%": true,
      "%timefield%": "@timestamp",
      "query": "FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend | STATS requests = COUNT() BY bucket = DATE_TRUNC(1 minute, @timestamp) | SORT bucket ASC"
    }
  },
  "mark": { "type": "line", "color": "#6092C0", "strokeWidth": 2, "tooltip": true },
  "encoding": {
    "x": { "field": "bucket", "type": "temporal", "title": null, "axis": { "labelAngle": 0, "tickCount": 8 } },
    "y": { "field": "requests", "type": "quantitative", "title": "Requests" }
  },
  "config": {
    "axis": { "domainColor": "#444", "tickColor": "#444" },
    "view": { "stroke": null }
  }
}
\`\`\`
`;

export const exampleVegaLiteHeatmap = `# Example: Heatmap (Vega-Lite)

Activity heatmap with hour-of-day vs day-of-week, custom ordinal sort to keep
Mon-Sun order. Uses a sequential blues scheme so the chart stays legible on
both light and dark themes.

\`\`\`json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v6.json",
  "title": { "text": "Activity Heatmap (Hour x Day)", "anchor": "start" },
  "autosize": { "type": "fit", "contains": "padding" },
  "data": {
    "url": {
      "%type%": "esql",
      "%context%": true,
      "%timefield%": "@timestamp",
      "query": "FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend | EVAL hour = DATE_EXTRACT(\\"HOUR_OF_DAY\\", @timestamp) | EVAL day = DATE_FORMAT(\\"EEE\\", @timestamp) | STATS count = COUNT() BY hour, day"
    }
  },
  "mark": { "type": "rect", "cornerRadius": 2 },
  "encoding": {
    "x": { "field": "hour", "type": "ordinal", "title": "Hour of Day", "axis": { "labelAngle": 0 } },
    "y": { "field": "day", "type": "ordinal", "sort": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], "title": null },
    "color": { "field": "count", "type": "quantitative", "scale": { "scheme": "blues" }, "legend": { "title": "Events" } },
    "tooltip": [
      { "field": "day", "type": "nominal", "title": "Day" },
      { "field": "hour", "type": "quantitative", "title": "Hour" },
      { "field": "count", "type": "quantitative", "title": "Events" }
    ]
  },
  "config": {
    "axis": { "domainColor": "#444", "tickColor": "#444", "grid": true, "tickBand": "extent" },
    "view": { "stroke": null }
  }
}
\`\`\`
`;

export const exampleVegaLiteLayered = `# Example: Layered Bars + Value Labels (Vega-Lite)

Demonstrates the layered-spec sort gotcha: data is pre-sorted in ES|QL with
\`SORT ... DESC\`, and the categorical axis uses \`sort: null\` so the
shared-scale union does not complain about conflicting sort properties.

\`\`\`json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v6.json",
  "title": { "text": "Sales by Region", "anchor": "start" },
  "autosize": { "type": "fit", "contains": "padding" },
  "data": {
    "url": {
      "%type%": "esql",
      "%context%": true,
      "query": "FROM sales-* | STATS sales = SUM(amount) BY region | SORT sales DESC | LIMIT 10"
    }
  },
  "layer": [
    { "mark": { "type": "bar", "color": "#6092C0", "cornerRadiusEnd": 3 } },
    {
      "mark": { "type": "text", "align": "left", "dx": 5, "fontSize": 11, "color": "#a3a3a3" },
      "encoding": { "text": { "field": "sales", "format": "," } }
    }
  ],
  "encoding": {
    "y": { "field": "region", "type": "nominal", "sort": null, "title": null, "axis": { "labelLimit": 150 } },
    "x": { "field": "sales", "type": "quantitative", "title": "Sales ($)" }
  },
  "config": {
    "axis": { "domainColor": "#444", "tickColor": "#444" },
    "view": { "stroke": null }
  }
}
\`\`\`
`;

export const exampleVegaForceGraph = `# Example: Force-Directed Graph (full Vega)

The canonical "Vega-Lite cannot express this" case. Builds a node-link diagram
from an ES|QL query that returns edges, derives the node set in a Vega
transform, and applies the \`force\` transform for layout. Use full Vega
(\`$schema: vega/v6.json\`) for this chart shape.

\`\`\`json
{
  "$schema": "https://vega.github.io/schema/vega/v6.json",
  "autosize": { "type": "fit", "contains": "padding" },
  "padding": 5,
  "data": [
    {
      "name": "edges",
      "url": {
        "%type%": "esql",
        "%context%": true,
        "query": "FROM service-calls-* | STATS calls = COUNT() BY source.service, target.service | RENAME source.service AS source | RENAME target.service AS target | SORT calls DESC | LIMIT 200"
      }
    },
    {
      "name": "nodes",
      "source": "edges",
      "transform": [
        { "type": "fold", "fields": ["source", "target"], "as": ["role", "name"] },
        { "type": "aggregate", "groupby": ["name"], "ops": ["sum"], "fields": ["calls"], "as": ["degree"] }
      ]
    }
  ],
  "scales": [
    {
      "name": "size",
      "type": "linear",
      "domain": { "data": "nodes", "field": "degree" },
      "range": [50, 500]
    },
    {
      "name": "color",
      "type": "linear",
      "domain": { "data": "nodes", "field": "degree" },
      "range": { "scheme": "blues" }
    }
  ],
  "marks": [
    {
      "name": "links",
      "type": "path",
      "from": { "data": "edges" },
      "encode": {
        "update": {
          "stroke": { "value": "#666" },
          "strokeOpacity": { "value": 0.3 },
          "strokeWidth": { "value": 1 }
        }
      },
      "transform": [
        {
          "type": "linkpath",
          "require": { "signal": "force" },
          "shape": "line",
          "sourceX": "datum.source.x",
          "sourceY": "datum.source.y",
          "targetX": "datum.target.x",
          "targetY": "datum.target.y"
        }
      ]
    },
    {
      "name": "nodes",
      "type": "symbol",
      "from": { "data": "nodes" },
      "encode": {
        "enter": {
          "fill": { "scale": "color", "field": "degree" },
          "stroke": { "value": "#fff" },
          "strokeWidth": { "value": 1 }
        },
        "update": {
          "size": { "scale": "size", "field": "degree" }
        }
      },
      "transform": [
        {
          "type": "force",
          "iterations": 300,
          "static": false,
          "signal": "force",
          "forces": [
            { "force": "center", "x": { "signal": "width / 2" }, "y": { "signal": "height / 2" } },
            { "force": "collide", "radius": 8 },
            { "force": "nbody", "strength": -30 },
            { "force": "link", "links": "edges", "distance": 30, "id": "datum.name" }
          ]
        }
      ]
    }
  ],
  "config": {
    "axis": { "domainColor": "#444", "tickColor": "#444" },
    "view": { "stroke": null }
  }
}
\`\`\`

Notes:
- Edges feed both the link layout and the node fold; this avoids two round trips
  to Elasticsearch.
- Replace the index name and field names with real ones from your environment.
  If the ES|QL query exceeds ~1000 rows, the layout will get crowded - tighten
  the query before tightening the spec.
- \`strength\` and \`distance\` are the two knobs to tweak first if the layout
  looks too sparse or too tangled.
`;
