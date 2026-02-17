# Agent Builder Telemetry

This document describes the telemetry payload reported by the Agent Builder collector and the
usage counters used to build parts of that payload.

## Snapshot telemetry

The collector registers a single snapshot payload named `agent_builder`. The payload shape is
defined in `telemetry_collector.ts` as `AgentBuilderTelemetry` and is assembled in the `fetch`
function. The telemetry document is written under the `agent-builder` root in the
`agent-builder-telemetry` index (time field: `timestamp`). Below is a field-by-field description
of what is reported and how it is calculated.

### Platform metadata fields

In addition to the `agent-builder.*` payload, Kibana attaches standard metadata fields to the
telemetry document. These are not computed by the Agent Builder collector, but by the telemetry
pipeline. They include:
- Cluster and version metadata: `cluster_uuid`, `cluster-name`, `version`, `version-major-minor`.
- Cloud metadata: `cloud.*` (account ID, trial status, deployment flags, kbn UUID).
- ECE metadata: `ece.*` (account ID, kbn UUID).
- License metadata: `license.*` (UID, type, status, issue/start/expiry dates, max nodes/RUs).
- Serverless metadata: `serverless.*` (project ID, type, tier).

### custom_tools
- `custom_tools.total`
  - What it is: Total number of user-created tools (excluding built-in tools).
  - How we count: ES aggregation on the tools system index, filtering out `type: builtin`, then
    summing bucket doc counts. 
- `custom_tools.by_type[]`
  - What it is: Breakdown of custom tools by `type` (e.g., `esql`, `index_search`, `workflow`).
  - How we count: ES terms aggregation on `type`, excluding `builtin`.

### custom_agents
- `custom_agents.total`
  - What it is: Total number of custom agents created.
  - How we count: ES `count` on the agents system index.

### conversations
- `conversations.total`
  - What it is: Total number of conversations.
  - How we count: ES `hits.total` on the conversations index.
- `conversations.rounds_distribution[]`
  - What it is: Distribution of conversations by number of rounds.
  - How we count: ES scripted terms aggregation using `conversation_rounds` (or `rounds` fallback)
    and bucket labels `1-5`, `6-10`, `11-20`, `21-50`, `51+`.
- `conversations.total_rounds`
  - What it is: Approximate total number of rounds across all conversations.
  - How we count: Derived from `rounds_distribution` buckets by multiplying each bucket count by
    a midpoint (3, 8, 15, 35, 75) and summing.
- `conversations.avg_rounds_per_conversation`
  - What it is: Average rounds per conversation.
  - How we count: `total_rounds / total`, rounded to two decimals.
- `conversations.tokens_used`
  - What it is: Total tokens used across all conversation rounds.
  - How we count: ES scripted sum aggregation over `conversation_rounds[*].model_usage`
    (`input_tokens + output_tokens`).
- `conversations.average_tokens_per_conversation`
  - What it is: Average tokens per conversation.
  - How we count: `tokens_used / total`, rounded to two decimals.

### tokens_by_model[]
- `tokens_by_model[].model`
  - What it is: LLM model identifier.
- `tokens_by_model[].total_tokens`
  - What it is: Total input + output tokens consumed by that model.
  - How we count: ES nested terms aggregation on model with sum of input and output tokens.
- `tokens_by_model[].avg_tokens_per_round`
  - What it is: Average tokens per round for that model.
  - How we count: `total_tokens / sample_count`, rounded to two decimals.
- `tokens_by_model[].sample_count`
  - What it is: Number of rounds that contributed to the model bucket.

### query_to_result_time
- `query_to_result_time.p50|p75|p90|p95|p99|mean`
  - What it is: Percentiles and mean of query-to-result latency.
  - How we count: Computed from the conversations index using nested percentiles/avg on
    `conversation_rounds.time_to_last_token`. This represents the end-to-end time to last token
    for completed rounds.

### query_to_result_time_by_model[]
- `query_to_result_time_by_model[].model`
  - What it is: LLM model identifier.
- `query_to_result_time_by_model[].p50|p75|p90|p95|p99|mean|total_samples|sample_count`
  - What it is: TTLT percentiles/mean and sample counts per model.
  - How we count: ES nested terms aggregation on model with percentiles/avg/count of
    `conversation_rounds.time_to_last_token`.

### query_to_result_time_by_agent_type[]
- `query_to_result_time_by_agent_type[].agent_id`
  - What it is: Agent identifier stored on the conversation.
- `query_to_result_time_by_agent_type[].p50|p75|p90|p95|p99|mean|total_samples|sample_count`
  - What it is: Per-agent TTLT percentiles/mean with sample counts.
  - How we count: ES terms aggregation on `agent_id`, then nested percentiles/avg/count over
    `conversation_rounds.time_to_last_token`.

### time_to_first_token
- `time_to_first_token.p50|p75|p90|p95|p99|mean|total_samples`
  - What it is: TTFT percentiles/mean and sample count.
  - How we count: ES nested aggregation on `conversation_rounds.time_to_first_token`.

### tool_calls
- `tool_calls.total`
  - What it is: Total tool calls across all sources.
  - How we count: Sum of per-source usage counters (see usage counters section).
- `tool_calls.by_source.default_agent|custom_agent|mcp|api|a2a`
  - What it is: Tool calls grouped by origin.
  - How we count: Individual usage counters per source.

### tool_calls_by_model[]
- `tool_calls_by_model[].model`
  - What it is: LLM model identifier from each round.
- `tool_calls_by_model[].count`
  - What it is: Total number of tool-call steps for that model across all rounds.
  - How we count: ES scripted metric that iterates each round and counts steps where
    `step.type == 'tool_call'`, then aggregates per model.

### llm_usage
- `llm_usage.by_provider[]`
  - What it is: Count of LLM invocations per provider.
  - How we count: Usage counters named `agent_builder_llm_provider_{provider}`.
    Provider names are sanitized for counter safety.
- `llm_usage.by_model[]`
  - What it is: Count of LLM invocations per model.
  - How we count: Usage counters named `agent_builder_llm_model_{model}`.
    Model names are sanitized for counter safety.

### errors
- `errors.total`
  - What it is: Total errors surfaced to users.
  - How we count: Usage counter `agent_builder_error_total`.
- `errors.total_conversations_with_errors`
  - What it is: Count of unique conversations that experienced an error.
  - How we count: Usage counter `agent_builder_error_conversations_with_errors`.
- `errors.avg_errors_per_conversation`
  - What it is: Average number of errors per conversation that had at least one error.
  - How we count: `errors.total / errors.total_conversations_with_errors` (0 if none).
- `errors.by_type[]`
  - What it is: Error counts grouped by normalized error type/code.
  - How we count: Usage counters prefixed with `agent_builder_error_by_type_`.

## Usage counters

All usage counters are stored under the domain `agent_builder` using the Usage Counters
service. Counters are persisted as daily saved objects (`usage-counter`) with a retention
period configured by Kibana (defaults to several days).

### Tool call counters
- `agent_builder_tool_call_default_agent`
  - Count of tool calls triggered by default agents.
- `agent_builder_tool_call_custom_agent`
  - Count of tool calls triggered by custom agents.
- `agent_builder_tool_call_mcp`
  - Count of tool calls triggered by MCP clients.
- `agent_builder_tool_call_api`
  - Count of tool calls triggered via direct API calls.
- `agent_builder_tool_call_a2a`
  - Count of tool calls triggered by agent-to-agent communication.

### LLM usage counters
- `agent_builder_llm_provider_{provider}`
  - Count of LLM invocations for a provider (sanitized string).
- `agent_builder_llm_model_{model}`
  - Count of LLM invocations for a model (sanitized string).

### Error counters
- `agent_builder_error_total`
  - Count of all errors surfaced to users.
- `agent_builder_error_conversations_with_errors`
  - Count of unique conversations that had at least one error.
- `agent_builder_error_by_type_{error_type}`
  - Count of errors by normalized error type/code.
  - For agent execution errors, the type is prefixed with
    `agentExecutionError_{code}` after normalization.

### Conversation round counters
- `agent_builder_rounds_1-5`
- `agent_builder_rounds_6-10`
- `agent_builder_rounds_11-20`
- `agent_builder_rounds_21-50`
- `agent_builder_rounds_51+`
  - Count of conversation rounds bucketed by current round number.

### Query-to-result time counters
- `agent_builder_query_to_result_time_<1s`
- `agent_builder_query_to_result_time_1-5s`
- `agent_builder_query_to_result_time_5-10s`
- `agent_builder_query_to_result_time_10-30s`
- `agent_builder_query_to_result_time_30s+`
  - Count of query-to-result durations bucketed by latency. These buckets are
    currently tracked for usage counters but are not used in the snapshot payload.

