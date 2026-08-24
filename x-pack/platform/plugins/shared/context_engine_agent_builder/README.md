# Context Engine <> Agent Builder integration

Bridge plugin that wires Context Engine into Agent Builder on **both server and browser**.

It exists so `contextEngine` does not need compile-time dependencies on Agent Builder,
avoiding a dependency cycle.

## Server

Registers:

- the `platform.context_engine.ai_index` attachment type
- the `platform.context_engine.save_automation` tool, scoped to conversations with an
  `ai_index` attachment
- the `platform.context_engine.feedback_loop` built-in agent — the default analysis agent for
  an AI index that names none. It mirrors the Elastic agent's capabilities and its standing
  instructions (`server/agent_builder/agents/feedback_loop/instructions.md.text`) tell it to
  work autonomously, since scheduled runs have nobody to answer a question. It is available
  only where `contextEngine:enabled` is on.
- a `WorkflowProvider` on the Context Engine setup contract. Context Engine needs to create,
  update, disable, install, and run workflows to apply suggestions and schedule the
  improvement loop, but cannot depend on the workflows plugins directly; this plugin adapts
  their APIs to that port.

Shared constants live in `common/` (`agent_builder_attachments.ts`, `agent_builder_tools.ts`).

## Browser

On start, registers suggest-automation hooks on the Context Engine plugin via
`registerAgentBuilderIntegration`. Analyze & improve stays in `contextEngine` (main's feedback-loop
hand-off); this plugin only owns **Suggest automation**.
