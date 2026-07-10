# @kbn/agent-builder-visualizations-plugin

Registers Agent Builder's visualization capabilities with the `agentBuilder`
plugin. It wires the server-side pieces that let an agent create, persist, and
render both standard **Lens** charts and custom **Vega-Lite** specifications, and
the browser-side attachment UI that renders them inline in a conversation.

## What it registers

On `setup` the plugin registers four things with `agentBuilder` (and
`agentContextLayer`):

- **`visualization` attachment type** (`server/attachment_types`) — validation of
  the unified attachment payload, by-reference resolution from Lens saved
  objects, and the agent-facing text representation.
- **`create_visualization` tool** (`server/tools/create_visualization`) — creates
  or updates a visualization from a natural-language query. The caller (agent)
  picks the renderer via the `renderer` parameter (`lens` by default, `vega` for
  Vega-Lite); edits to an existing attachment keep its renderer.
- **`visualization-creation` skill** (`server/skills`) — guidance the agent
  follows when calling the tool, including when to prefer Vega over Lens.
- **`visualization` SML type** (`server/sml_types`) — the screen/context layer
  representation used when an existing visualization is passed back into a turn.

On the browser side, `public/attachment_types` builds the attachment UI
definition that bridges the render components from
`@kbn/agent-builder-visualizations` into the Agent Builder attachment registry,
passing Kibana services explicitly via `VisualizationServices`.

## Related modules

- `@kbn/agent-builder-visualizations-common` — attachment schema and shared
  types (the `renderer` discriminator, `VisualizationAttachmentData`, etc.).
- `@kbn/agent-builder-visualizations-server` — the Lens and Vega-Lite generation
  engines (`buildLensConfig`, `buildVegaConfig`).
- `@kbn/agent-builder-visualizations` — the browser render components
  (`InlineVisualization`, Lens and Vega renderers).

