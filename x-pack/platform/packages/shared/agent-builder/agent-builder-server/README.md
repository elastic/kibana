# @kbn/agent-builder-server

Server-side types and utilities for the agentBuilder framework.

## ToolHandlerContext

`ToolHandlerContext` is the context object passed to every tool handler. Tools
read fields from it as needed; nothing is forwarded to the tool's input schema,
the LLM prompt, telemetry, or APM unless the tool itself does so.

### `defaultConnectorId` (opt-in)

Tools can read `context.defaultConnectorId` to obtain the LLM connector ID
resolved for the current agent execution.

The value mirrors `AgentHandlerContext.defaultConnectorId`. It is resolved by
the platform's existing logic
(`x-pack/platform/plugins/shared/agent_builder/server/utils/resolve_selected_connector_id.ts`)
and follows the standard order:

1. Explicit per-request override (e.g. `connector_id` in the converse API).
2. The `GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR` UI setting.
3. Feature-registered inference endpoints
   (`searchInferenceEndpoints.endpoints.getForFeature(AGENT_BUILDER_INFERENCE_FEATURE_ID)`).
4. Fallback against `inference.getConnectorList(request)`, preferring
   `KIBANA_DEFAULT_CHAT_COMPLETION` → Inference → OpenAI → first.

If none of the above produces a connector, the field is `undefined`.

#### When to use it

Use `defaultConnectorId` in a tool handler when the tool needs to invoke a
downstream service that itself calls an LLM (for example, kicking off a
server-side workflow that must run a generation pipeline). Reading the
context-supplied connector keeps the tool aligned with the connector the user
selected for the conversation, avoids an extra round of "ask the agent to
provide a connector ID" through the prompt, and prevents the connector ID from
appearing in the LLM-visible message stream.

Tools that do not perform downstream LLM calls (utility tools, retrieval
helpers, status lookups) should ignore the field.

#### Why it is not in tool params

Surfacing the connector ID through `defaultConnectorId` is preferred over
adding a `connector_id` parameter to a tool's input schema because:

- **Prompt hygiene** — connector IDs do not need to be visible to the LLM.
  Putting them in tool params puts them in tool calls, transcripts, and
  retraining artifacts.
- **Determinism** — the agent cannot fabricate a UUID-shaped value or fall
  back to one a user mentioned earlier in the conversation. The platform owns
  resolution.
- **Consistency** — tools that need a connector all use the same source of
  truth, which is the same source the agent's own model selection uses.

#### Side-effect surface (audit)

The field is intentionally narrow. Adding it to `ToolHandlerContext` does not
cause it to leak into adjacent systems:

- **Tool input validation** — `runInternalTool` validates `toolParams` against
  the tool's schema before invoking the handler
  (`run_tool.ts` → `withExecuteToolSpan` → `tool.getSchema().safeParse`).
  `defaultConnectorId` is on the *context*, not on `toolParams`, so it never
  enters validation, the schema, or the params payload.
- **Telemetry** — `reportToolCallTelemetry` (`run_tool.ts`) uses an explicit
  field allowlist (`agentId`, `conversationId`, `executionId`, `toolId`,
  `toolCallId`, `source`, `resultTypes`, `duration`). It does not spread the
  handler context, so the connector ID is not reported.
- **APM / inference tracing** — `withExecuteToolSpan` serializes only
  `tool.input` (= `toolParams`) and the tool return value via
  `safeJsonStringify`. The handler context is not passed in.
- **LLM message serialization** — the LangChain bridge under
  `services/execution/run_agent/utils/` (`to_langchain_messages.ts`,
  `round_to_actions.ts`, `convert_graph_events.ts`) serializes tool *returns*,
  not contexts. The connector ID is not added to any tool result by default.
- **`afterToolCall` hooks** — hook authors receive the handler context, but
  the only in-tree hook today
  (`hooks/skills/load_skill_tools_after_read.ts`) destructures specific
  fields. New hooks must follow the same pattern; spreading the entire
  context into a payload would expose this field along with everything else
  on the context.

In short: the field is opt-in. A tool that does not read it sees no behavior
change, and surrounding systems do not see it because they explicitly project
out the fields they care about.

#### Guidance for tool authors

- Treat `defaultConnectorId` as best-effort. Always handle the `undefined`
  case (e.g. surface a clear error result rather than crashing or guessing).
- Do not pass the value back into the agent's response payload unless the
  user explicitly needs it. Most tools should keep the connector ID inside
  the server-side call chain.
- Do not add a redundant `connector_id` parameter to the tool's input schema.
  Allow callers to override only when there is a concrete user-facing need
  (e.g. an "advanced settings" UI), and document the precedence in the
  tool's description.

#### Guidance for hook authors

Hooks that observe `BeforeToolCallHookContext` / `AfterToolCallHookContext`
receive the full handler context. Treat it as sensitive: destructure the
specific fields you need rather than spreading or logging the entire object.
