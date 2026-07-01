# Streams UX prototype — reference notes

> **Status: reference / consultation only.** This branch (`streams-ux-prototype`) is a
> design + interaction prototype for the Streams app. It is **not** intended for
> implementation or merge. Much of it is backed by mock data. Use it to explore the
> proposed UX and as a reference for how the pieces fit together.

## What this prototype demonstrates

- An interactive **streams canvas** (React Flow based) where sources, pipelines,
  destinations, and routing conditions are represented as nodes and edges.
  - Inline node placement on edges (drop a pipeline/routing node onto a connection).
  - Drag-to-connect "dangling" routing edges from a routing node to a destination.
- A set of **flyouts** for inspecting/configuring entities (source, destination,
  pipeline) and for creating routing conditions / pipelines.
- **List-view tooling**: sources / pipelines / destinations tables plus shared table
  controls, and a view-mode switch (consolidated vs. secondary-nav layout).

## Key files (where to look first)

| Area | File | Notes |
| --- | --- | --- |
| Canvas | `streams_canvas.tsx` | Core of the prototype: node/edge types, placement, drag-to-connect, flyout wiring. Largest file. |
| Destination flyout | `destination_flyout.tsx` | Destination detail flyout (About, Attached assets, Chart, Dependency map, Dataset quality). |
| Source flyout | `source_flyout.tsx` | Source detail flyout. |
| Pipeline flyout | `pipeline_flyout.tsx` | Pipeline detail flyout. |
| Create pipeline | `create_pipeline_flyout.tsx` | Flow for creating/editing a pipeline. |
| Create routing | `create_routing_flyout.tsx` | "Create routing conditions" flow (triggered from an edge connector). |
| Tables | `sources_table.tsx`, `pipelines_table.tsx` | Entity tables used by the list view. |
| List tooling | `streams_list_table_tools.tsx`, `streams_tabs.ts` | Shared list controls + tab definitions. |
| View mode | `../streams_view_mode_select/index.tsx`, `../../hooks/use_streams_view_mode.tsx` | localStorage-backed consolidated vs. secondary-nav toggle. |
| Mock data | `destination_mock_metadata.ts`, `source_mock_metadata.ts` | Mock metadata powering the flyouts/tables. |
| Mock logs | `../../../../../../../scripts/mock_streams_logs.js` | Helper script to generate mock stream logs (repo-root `scripts/`). |

## Caveats

- Several components render **mock/hardcoded data** rather than live data.
- Not wired for production routing, persistence, or API integration.
- Styling follows EUI + Emotion and references Figma designs from the Stream Flows
  design file.
