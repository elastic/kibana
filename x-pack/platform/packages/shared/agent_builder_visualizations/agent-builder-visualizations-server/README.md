# @kbn/agent-builder-visualizations-server

Presentation-owned, server-side visualization generation engine for Agent
Builder. It builds a visualization config for the renderer chosen by the caller
(Lens or Vega — the agent decides and passes `renderer` to the
`create_visualization` tool):

- `lens/` — the Lens engine (`buildLensConfig`): chart-type selection,
  schemas, prompts, and palettes. `chart_type_registry.ts` holds one entry per
  chart type with a shared `design` part (what a good chart looks like, given to
  the visualization agent and config author) and an
  author-only `config` part (how to express it in Lens JSON);
  `color_palettes.ts` does the same for color and exposes the Kibana palette
  catalog. `chart_type_guidance.ts` compiles each role's prompt from them.
- `vega/` — the Vega-Lite engine (`buildVegaConfig`): authors and normalizes a
  Vega-Lite spec for requests Lens cannot express.
- `shared/` — guidance reused by both engines (e.g. ES|QL authoring instructions).
- `utils/` — small renderer-agnostic helpers.

Consumed by the `agent_builder_visualizations` and `agent_builder_dashboards`
plugins.

Lens edits accept `presentationMode: 'enhance'` to apply all chart presentation
defaults and replace custom styling. The default mode, `'focused'`, preserves
unrelated presentation settings. This is independent of `appearanceOnly`: use
`true` to retain the existing queries, or omit it to combine a query change with
enhancement. The dashboard agent owns layout; the Lens author applies and checks
chart defaults in its own context.
