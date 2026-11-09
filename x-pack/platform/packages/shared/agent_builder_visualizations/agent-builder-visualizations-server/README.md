# @kbn/agent-builder-visualizations-server

Presentation-owned, server-side visualization generation engine for Agent
Builder. It builds a visualization config for the renderer chosen by the caller
(Lens or Vega — the agent decides and passes `renderer` to the
`create_visualization` tool):

- `lens/` — the Lens engine (`buildLensConfig`): chart-type selection,
  prompts, examples, schema sections, and palettes. `chart_type_registry.ts`
  holds one entry per chart type with its presentation rules, stated in Lens
  JSON terms for the config author. `general_rules.ts` holds the rules shared by
  every chart type. `color_palettes.ts` adds the color mechanics and palette
  previews for charts with dynamic or categorical coloring.
  `chart_type_guidance.ts` compiles them into the config author's prompt.
  Instead of the full JSON schema, the author gets the chart type's house-style
  examples from `config_examples.ts` and an index of the schema sections from
  `schema_sections.ts`. It can load the sections it needs once with the
  `load_schema_sections` tool, and a failed validation shows the schema of the
  failing sections on the retry.
- `vega/` — the Vega-Lite engine (`buildVegaConfig`): authors and normalizes a
  Vega-Lite spec for requests Lens cannot express.
- `shared/` — guidance reused by both engines (e.g. ES|QL authoring instructions).
- `utils/` — small renderer-agnostic helpers.

Consumed by the `agent_builder_visualizations` and `agent_builder_dashboards`
plugins.

Lens edits accept `applyChartRules: true` to apply all chart presentation
defaults and replace custom styling. By default only the requested changes are
applied and unrelated presentation settings are preserved. The flag is
independent of `preserveESQL`.
Set `preserveESQL` to keep the existing queries, or omit it to combine a query
change with enhancement. The dashboard agent owns layout. The Lens author applies
and checks chart defaults on its own.
