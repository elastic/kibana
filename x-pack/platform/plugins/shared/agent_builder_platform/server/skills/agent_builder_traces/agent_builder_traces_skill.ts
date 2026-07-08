/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { AGENT_BUILDER_TRACING_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { AGENT_BUILDER_TRACES_ESQL_INLINE_TOOL_ID, createTracesEsqlTool } from './inline_tools';

export const agentBuilderTracesSkill = defineSkillType({
  id: 'agent-builder-traces',
  name: 'agent-builder-traces',
  basePath: 'skills/platform/agent-builder',
  uiSettingRequired: AGENT_BUILDER_TRACING_ENABLED_SETTING_ID,
  description:
    'Answer questions about Agent Builder OTel (OpenTelemetry) traces and activity: token usage, ' +
    'model and provider breakdowns, conversation and agent latency, tool-call volume, error rates, ' +
    'and captured message content (user prompts, LLM responses, system prompts, tool results). ' +
    'Use this when the user asks about Agent Builder traces, tracing, telemetry, conversations, ' +
    'or what users prompted or said to the agent — including recent prompts or messages in trace data.',
  content: `## When to Use This Skill

Use this skill when a user asks about Agent Builder's own OTel (OpenTelemetry) traces or
runtime activity — including **what users said in conversations** and **captured prompts or
messages** — for example:
- Token usage (input, output, total) overall or broken down by model/provider.
- LLM request counts and which models or providers are most used.
- Conversation, agent-execution, or tool-call latency (average, p95, max).
- Tool-call volume, the most-used tools, and tool error/success rates.
- Trends of any of the above over time.
- User prompts, LLM responses, system prompts, tool results, or other message content captured
  in trace span events (when privacy settings allow).
- "What did users ask?" / "Show me recent prompts or conversations" about Agent Builder usage.

## Questions This Skill Can Answer

- "How many tokens has Agent Builder used in the last 24 hours / 7 days?"
- "What's the input vs. output token breakdown by model?"
- "Which model (or provider) is used the most?"
- "How many LLM requests / conversations / agent executions happened today?"
- "What's the average and p95 conversation (or agent execution) latency?"
- "What's the slowest agent execution recently?"
- "How many tool calls were made, and which tools are used the most?"
- "What's the tool error rate / success rate?"
- "Show me token usage (or tool calls) over time."
- "Are there any errors in the Agent Builder OTel traces?"
- "What did users ask the agent recently?" / "Show me recent user prompts in traces."

Do **not** use this skill when:
- The user wants to query their *own* data indices (use the general data-exploration tools).
- The user wants to build or modify a dashboard (use the dashboard-management skill).

## Data Source

Agent Builder ships OTel data to two per-space ES|QL sources. The inline tool selects the right
one via \`dataSource\` — always pass it explicitly:

| \`dataSource\` | Index pattern | Use for |
|---|---|---|
| \`"traces"\` | \`traces-agent_builder.otel-<space-id>\` | Spans: tokens, latency, tool calls, errors, model/provider breakdowns |
| \`"logs"\` | \`logs-agent_builder.otel-<space-id>\` | Span events: user prompts, LLM responses, system prompts, tool results |

Always use \`${AGENT_BUILDER_TRACES_ESQL_INLINE_TOOL_ID}\` for trace questions. It resolves the
current space's indices automatically. Do not use \`traces-agent_builder.otel-*\` or
\`logs-agent_builder.otel-*\` wildcards, which would mix in other spaces' data.

**Choosing \`dataSource\`:** pick based on what the user is asking for, not the word "traces" in
their question. Message-content questions still use \`dataSource: "logs"\` even when the user says
"prompts in traces".

| Question type | \`dataSource\` | Examples |
|---|---|---|
| Span telemetry | \`"traces"\` | token usage, latency, tool-call volume, error rates, model/provider stats |
| Message content | \`"logs"\` | user prompts, LLM responses, system prompts, tool result text |

If you need to run ES|QL manually, use the exact indices returned by the inline tool.

Always constrain the time range with \`@timestamp\` to the window the user asked about (default to
the last 24 hours when they do not specify one).

### Message content (span events in the logs index)

User prompts, LLM responses, system prompts, and tool results are **not** stored as span attributes
on the traces index. They are captured as OTel **span events** and routed by Elasticsearch to the
logs index for the same space.

Each event is a log document linked to its parent span via \`trace_id\` and \`span_id\`.

| Event name | Content | Privacy setting (Gen AI Settings) |
|---|---|---|
| \`gen_ai.user.message\` | User prompt text in \`attributes.content\` | \`agentBuilder:tracing:includeUserPrompts\` (off by default) |
| \`gen_ai.assistant.message\` / \`gen_ai.choice\` | LLM response | \`agentBuilder:tracing:includeLlmResponses\` (off by default) |
| \`gen_ai.system.message\` | System prompt | \`agentBuilder:tracing:includeSystemPrompt\` (off by default) |
| \`gen_ai.tool.message\` | Tool result | \`agentBuilder:tracing:includeToolDetails\` (off by default) |

If a message-content query returns no rows, explain that the relevant privacy setting may be disabled
or the time window may be empty. Do not fabricate message text.

### Span names (\`span.name\` field, traces index)

Span names follow the OTel \`{operation} {identifier}\` convention:

- \`chat <model>\` — one span per LLM call (token usage lives here). Match with \`span.name LIKE "chat *"\`.
- \`execute_tool <toolId>\` — one span per tool call. Match with \`span.name LIKE "execute_tool *"\`.
- \`invoke_agent <name>\` — agent or conversation spans. Distinguish with \`attributes.elastic.inference.span.kind\`:
  - \`"CHAIN"\` — one span per conversation turn.
  - \`"AGENT"\` — one span per agent execution.

### Useful fields

- \`attributes.gen_ai.usage.input_tokens\` / \`attributes.gen_ai.usage.output_tokens\` — wrap in \`TO_LONG(...)\` before aggregating.
- \`attributes.gen_ai.request.model\` — model name.
- \`attributes.gen_ai.provider.name\` — provider name.
- \`attributes.gen_ai.agent.id\` — agent id (hashed for custom agents in exported traces).
- \`attributes.gen_ai.conversation.id\` — conversation id (hashed unless \`agentBuilder:tracing:includeRealIds\` is on).
- \`duration\` — span duration in **nanoseconds**; divide by \`1000000000.0\` for seconds.
- \`status.code\` — equals \`"Error"\` for failed spans.

### Useful fields (logs index — span events)

- \`event_name\` — event type (e.g. \`gen_ai.user.message\`).
- \`attributes.content\` — message text for user, assistant, and system events.
- \`trace_id\` / \`span_id\` — link back to the parent span in the traces index.

## How to Answer

1. Decide \`dataSource\` from the question (see table above).
2. Call \`${AGENT_BUILDER_TRACES_ESQL_INLINE_TOOL_ID}\` with \`prompt\` and \`dataSource\`:
   - \`dataSource: "traces"\` — tokens, latency, tool calls, errors, and other span telemetry.
   - \`dataSource: "logs"\` — user prompts, LLM responses, system prompts, and tool message content.
3. Use ${platformCoreTools.executeEsql} only when you already have a validated ES|QL query from the inline tool.
4. Prefer compact \`STATS\` aggregations over returning raw spans, and report the numbers in plain language.

If a question needs both telemetry and message text, make separate tool calls with the appropriate
\`dataSource\` for each part rather than defaulting to \`"traces"\`.

### Example query patterns

These patterns assume the current space indices. Replace \`<traces-index>\` and \`<logs-index>\`
with the indices returned by the inline tool. Use \`dataSource: "traces"\` for the traces examples
and \`dataSource: "logs"\` for the logs example.

Total tokens by model (last 24h):

\`\`\`esql
FROM <traces-index>
| WHERE @timestamp >= NOW() - 24 hours
| WHERE span.name LIKE "chat *"
| STATS \`Total Tokens\` = SUM(TO_LONG(attributes.gen_ai.usage.input_tokens))
      + SUM(TO_LONG(attributes.gen_ai.usage.output_tokens))
    BY \`Model\` = attributes.gen_ai.request.model
| SORT \`Total Tokens\` DESC
\`\`\`

LLM requests by provider:

\`\`\`esql
FROM <traces-index>
| WHERE @timestamp >= NOW() - 24 hours
| WHERE span.name LIKE "chat *"
| STATS \`Requests\` = COUNT(*) BY \`Provider\` = attributes.gen_ai.provider.name
| SORT \`Requests\` DESC
\`\`\`

Conversation latency (avg and p95, seconds):

\`\`\`esql
FROM <traces-index>
| WHERE @timestamp >= NOW() - 24 hours
| WHERE span.name LIKE "invoke_agent *" AND attributes.elastic.inference.span.kind == "CHAIN"
| EVAL duration_sec = duration / 1000000000.0
| STATS \`Avg (s)\` = ROUND(AVG(duration_sec), 2), \`P95 (s)\` = ROUND(PERCENTILE(duration_sec, 95), 2)
\`\`\`

Tool success rate:

\`\`\`esql
FROM <traces-index>
| WHERE @timestamp >= NOW() - 24 hours
| WHERE span.name LIKE "execute_tool *"
| STATS total = COUNT(*), errors = COUNT(*) WHERE status.code == "Error"
| EVAL \`Success Rate (%)\` = ROUND((total - errors) * 100.0 / total, 2)
| KEEP \`Success Rate (%)\`
\`\`\`

Most-used tools:

\`\`\`esql
FROM <traces-index>
| WHERE @timestamp >= NOW() - 24 hours
| WHERE span.name LIKE "execute_tool *"
| STATS \`Tool Calls\` = COUNT(*) BY \`Tool\` = span.name
| SORT \`Tool Calls\` DESC
| LIMIT 15
\`\`\`

Recent user prompts (logs index; requires \`agentBuilder:tracing:includeUserPrompts\`):

\`\`\`esql
FROM <logs-index>
| WHERE @timestamp >= NOW() - 24 hours
| WHERE event_name == "gen_ai.user.message"
| SORT @timestamp DESC
| LIMIT 20
| KEEP @timestamp, attributes.content, trace_id, span_id
\`\`\`

## Edge Cases

- If a query returns no rows, explain that the time window may be empty or that
  the \`${AGENT_BUILDER_TRACING_ENABLED_SETTING_ID}\` UI setting is not enabled. Do not fabricate values.
- Using the wrong \`dataSource\` (e.g. \`"traces"\` for a user-prompt question) will query the wrong
  index and return no message fields — always use \`"logs"\` for message content.
- Message-content queries against the logs index return no rows when the corresponding privacy
  setting is disabled (user prompts, LLM responses, system prompt, and tool details are all off by default).
- Token fields can be missing on non-LLM spans; always filter to \`span.name LIKE "chat *"\`
  before aggregating token usage.
- \`duration\` is in nanoseconds — never report it raw; convert to seconds (or ms) for the user.
`,
  getInlineTools: () => [createTracesEsqlTool()],
  getRegistryTools: () => [platformCoreTools.executeEsql],
});
