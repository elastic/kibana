# ADR-0014 — One lazy boundary per heavy surface

**Status:** Accepted
**Date:** 2026-11-19
**Deciders:** @elastic/workflows-eng

## Context

CI's bundle report on the visual-builder PR showed +389 KB of async code (`workflowsManagement`
+343 KB, `agentBuilderWorkflows` +46 KB) with the page-load bundles flat. Production builds of CI's
base and the PR head reproduced those numbers to the byte and traced the growth:

- **+100 KB sat in the `application` chunk, which every workflows page loads.** The graph canvas
  reached it through a single static edge: `TemplateDetail` (library pages) imported the canvas.
- **The canvas and the actions menu were each shipped twice.** The optimizer
  (`@kbn/rspack-optimizer`, `split_chunks.ts`) moves a module into a named shared chunk
  (`shared-packages`, `vendors`, ...) only when **3 or more chunks** import it. Below that, every
  importing chunk keeps its own copy. The canvas was in the `application` chunk and in the agent
  builder's chunk; the actions menu was in both the YAML-editor and the visual-editor chunks.
- **The named shared chunks are preloaded on every Kibana page**, so promoting code into them is
  not a fix for duplication.
- **The agent builder fetched the canvas on every Kibana page.** `agent_builder_workflows`
  `setup()` calls `import('./attachment_types')` with no user action, and that module reached the
  canvas statically.
- The visual builder pre-warmed ~31 EUI icons with one `import()` each, which became 32 tiny
  chunks (one request per icon).

## Decision

**A heavy surface that more than one chunk renders goes through exactly one dynamic `import()`,
owned by the module that exports it. Consumers never import the heavy module statically.**

- **Canvas.** `@kbn/workflows-ui` exports `WorkflowGraphCanvasWithoutProvider` as a lazy,
  Suspense-wrapped component (`lazy_workflow_graph_canvas.tsx`) with the same name and props, a
  delayed skeleton while loading, and the existing `GraphErrorBoundary` for a failed chunk, plus
  `preloadWorkflowGraphCanvas()`. Consumers keep their own `ReactFlowProvider`.
- **Actions menu.** `features/actions_menu_popover` exports `ActionsMenuPopover` as a lazy wrapper
  that renders nothing while closed (`lazy_actions_menu_popover.tsx`), plus `useWarmActionsMenu()`.
- **EUI icons.** `eui_icon_set.ts` imports every glyph; `ensureWorkflowGraphEuiIcons` and
  `loadTypeIconMasks` reach it with one `import()`, so the icons ship as one chunk.
- **Preload in parallel with the first consumer**, so users should not see a new wait: the visual
  editor's lazy factory fetches the canvas alongside its own chunk, the template page fetches it on
  mount, the agent builder fetches it when the inline workflow card renders, and the editors warm
  the actions menu when idle.

## Alternatives considered

- **Move the packages into the shared bundles.** Rejected: those chunks are preloaded on every
  page, so every Kibana user would pay for code only workflows users need.
- **Merge the visual builder's ~70 source files.** Rejected: the bundler concatenates a chunk's
  modules in production; size follows code, not file count.
- **Put `ReactFlowProvider` inside the lazy canvas entry.** Not now: it renames the export and
  touches four consumers; `@xyflow/react` is not inlined in the application chunk, so there is no
  size reason to do it.

## Consequences

Measured in production builds against the same commit (`--dist`, same focus as CI):

| | Before | After |
|---|---:|---:|
| `application` chunk (every workflows page) | 1,551.2 KB | 1,476.6 KB |
| `agentBuilderWorkflows` setup-time chunk (fetched on every Kibana page) | 142.2 KB | 55.7 KB |
| Canvas | 2 chunks | 1 on-demand chunk (85.0 KB) |
| Actions menu | 2 chunks | 1 on-demand chunk (56.3 KB) |
| EUI icon chunks | 32 | 1 (17.6 KB) |
| Every chunk file, total | 70,377.9 KB | 70,243.7 KB |
| Preloaded shared chunks (`shared-packages`, `vendors`, `vendors-heavy`, ...) | baseline | unchanged |

- **Harder:** nothing may value-import `workflow_graph_canvas`, `actions_menu_popover` (the real
  component) or an EUI icon asset outside its lazy module. A static import in a chunk that also
  loads the boundary can put the module in 3+ chunks, and the optimizer then promotes it into the
  preloaded `shared-packages`. Check `shared-packages` before and after a production build when
  touching these boundaries.
- **A failed chunk is not retried until reload.** The canvas shows the graph error callout; this
  matches other Kibana lazy components.
- **`first_paint_ms`** no longer includes the chunk download (nothing passes `onPerfMark` today).
- **Not done here:** `ExecutionGraph` is still imported statically by the workflow editor, the
  settings flyout family (~40 KB) is still in the application chunk, and the agent builder still
  fetches `attachment_types` at setup (smaller now). Each is a separate decision.
