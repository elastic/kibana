/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { createVegaVisualizationTool } from '../tools';
import { dashboardTools } from '../../common';
import {
  vegaLiteReferenceContent,
  vegaReferenceContent,
  esqlInVegaContent,
  commonPitfallsContent,
  exampleVegaLiteBarTopN,
  exampleVegaLiteTimeSeriesLine,
  exampleVegaLiteHeatmap,
  exampleVegaLiteLayered,
  exampleVegaForceGraph,
} from './vega_visualization_references';

export const vegaVisualizationSkill = defineSkillType({
  id: 'vega-visualization',
  name: 'vega-visualization',
  basePath: 'skills/platform/dashboard',
  experimental: true,
  description:
    'Create custom Vega and Vega-Lite visualizations with ES|QL data sources. Use when the user asks for a chart Lens cannot express - layered charts (e.g. bars with value labels overlaid), faceted small multiples, heatmaps with annotations, custom color scales or marks, network / force-directed graphs, or any visualization described with words like "custom", "more flexible", "with X overlaid", "as a grid of small charts", "as a network". Do NOT use for standard bar / line / metric / pie / area charts - those belong to `visualization-creation` (Lens). Do NOT use for dashboard composition - use `dashboard-management`.',
  content: `## When to Use This Skill

Use this skill when:
- A user asks for a chart shape Lens cannot express: layered (e.g. bars + value
  labels), faceted small multiples, heatmaps with annotations, custom color scales,
  network / force-directed graphs (full Vega only), or other highly customized
  marks / transforms / axes.
- A user describes a visualization in terms that imply a custom grammar
  ("with annotations on top", "with a trend line overlaid", "with text labels
  inside each bar", "as a small-multiple grid", "as a network of ...").

Do NOT use this skill when:
- The user wants a standard bar / line / metric / pie / area chart. Use the
  \`visualization-creation\` skill (Lens) instead - it's faster and the result
  works seamlessly in Lens-aware UIs.
- The primary goal is dashboard composition. Use \`dashboard-management\`.

## Hard Rules

1. **ES|QL only.** No Lucene, no KQL, no URL data, no inline arrays.
2. **Never write ES|QL by hand.** Always call \`${platformCoreTools.generateEsql}\`
   and embed its output as the \`query\` in the spec's data source.
3. **Spec must be valid JSON.** Never use HJSON triple-quoted strings - they
   break Kibana's Vega parser. Use single-line ES|QL with escaped quotes.
4. **Dark-theme config block is mandatory.** See \`common-pitfalls.md\` for the
   exact block. Without it, charts render with bright borders on the dark theme.
5. **Rename dotted field names** in ES|QL with \`RENAME a.b AS ab\`. Vega
   interprets dots as nested paths and the encoding silently breaks.
6. **\`autosize\` only, never \`width\` / \`height\`.** Set
   \`autosize: { "type": "fit", "contains": "padding" }\`. Kibana controls
   panel sizing.

## Available Tools

- **${dashboardTools.createVegaVisualization}**: Persist a Vega / Vega-Lite spec
  as a visualization attachment and return its \`attachment_id\`.
- **${platformCoreTools.generateEsql}**: Generate the ES|QL query that backs
  the chart.
- **${platformCoreTools.executeEsql}**: Optionally inspect a sample of the
  query result to confirm column names and shape.

## Workflow

1. **Discover index and fields** if not already known from earlier turns. Use
   real field names from mappings, never invented ones.
2. **Call ${platformCoreTools.generateEsql}** to produce the query for the
   chart. Include time filtering (\`@timestamp >= ?_tstart AND @timestamp <= ?_tend\`)
   for any time-based chart.
3. **If uncertain about result shape, call ${platformCoreTools.executeEsql}**
   on a sample to inspect columns. Confirm dotted fields are renamed and
   sorting / limits are correct.
4. **Author the Vega or Vega-Lite spec.** Consult references on demand
   (see "References" below). Default to Vega-Lite; reach for full Vega only
   when Vega-Lite cannot express the chart (force layouts, custom signals,
   custom scales beyond what Vega-Lite exposes).
5. **Call ${dashboardTools.createVegaVisualization}** with \`{ title, spec }\`
   where \`spec\` is a JSON string. The tool parses, JSON-Schema validates,
   and persists. It does NOT validate the embedded ES|QL.
6. **Render the returned attachment inline** as the last part of your reply,
   after any explanatory text - UNLESS the chart is an intermediate artifact
   for a dashboard composition flow, in which case wait until
   \`dashboard-management\` renders the final dashboard.

## Placing a Vega Chart on a Dashboard

The returned \`attachment_id\` can be passed to \`${dashboardTools.manageDashboard}\`
via \`add_panels\` with \`kind: "attachment"\`. The dashboard panel inherits the
standard time picker and filter pills; the spec's \`%context%\` and \`%timefield%\`
properties wire those up automatically. Conversation-side rendering does NOT
inject time / filter context.

## References (read on demand)

- \`vega-lite-reference.md\` - grammar essentials, encoding channels, common
  chart patterns.
- \`vega-reference.md\` - full Vega grammar. Reach for this only when
  Vega-Lite cannot express the chart (force layouts, custom signals, etc.).
- \`esql-in-vega.md\` - \`%type%: "esql"\`, \`%context%\`, \`%timefield%\`,
  \`?_tstart\` / \`?_tend\` parameters, params.
- \`common-pitfalls.md\` - required dark-theme config block, HJSON warning,
  dotted-field renames, autosize, sort handling in layered specs,
  axis labelLimit, color discipline, axis title removal.
- \`examples/*\` - five working specs to crib from.

## Edge Cases

- **Tool returns a schema validation error:** read the JSON path in the
  error, consult \`common-pitfalls.md\` and the relevant reference, fix
  the spec, and retry. Do not silently change shape to make validation
  pass - surface the underlying problem.
- **Spec validates but the chart renders broken:** almost always one of:
  missing dark-theme config; dotted field names not renamed in ES|QL;
  explicit \`width\` / \`height\` set instead of \`autosize\`; layered-spec
  sort conflict (use \`sort: null\` on the categorical axis and pre-sort
  in ES|QL).
- **User asks to "tweak" a previously created Vega chart:** there is no
  in-place update. Create a new attachment with the revised spec and
  render it.
`,
  referencedContent: [
    { relativePath: '.', name: 'vega-lite-reference', content: vegaLiteReferenceContent },
    { relativePath: '.', name: 'vega-reference', content: vegaReferenceContent },
    { relativePath: '.', name: 'esql-in-vega', content: esqlInVegaContent },
    { relativePath: '.', name: 'common-pitfalls', content: commonPitfallsContent },
    {
      relativePath: './examples',
      name: 'vega-lite-bar-top-n',
      content: exampleVegaLiteBarTopN,
    },
    {
      relativePath: './examples',
      name: 'vega-lite-time-series-line',
      content: exampleVegaLiteTimeSeriesLine,
    },
    { relativePath: './examples', name: 'vega-lite-heatmap', content: exampleVegaLiteHeatmap },
    { relativePath: './examples', name: 'vega-lite-layered', content: exampleVegaLiteLayered },
    { relativePath: './examples', name: 'vega-force-graph', content: exampleVegaForceGraph },
  ],
  getRegistryTools: () => [platformCoreTools.generateEsql, platformCoreTools.executeEsql],
  getInlineTools: () => [createVegaVisualizationTool()],
});
