# Context Engine <> Agent Builder integration

Bridge plugin that wires Context Engine into Agent Builder on **both server and browser**.

It exists so `contextEngine` does not need compile-time dependencies on Agent Builder,
avoiding a dependency cycle.

## Server

Registers:

- the `platform.context_engine.ai_index` attachment type
- the `platform.context_engine.save_automation` tool, scoped to conversations with an
  `ai_index` attachment

Shared constants live in `common/` (`agent_builder_attachments.ts`, `agent_builder_tools.ts`).

## Browser

On start, registers suggest-automation hooks on the Context Engine plugin via
`registerAgentBuilderIntegration`. Analyze & improve stays in `contextEngine` (main's feedback-loop
hand-off); this plugin only owns **Suggest automation**.
