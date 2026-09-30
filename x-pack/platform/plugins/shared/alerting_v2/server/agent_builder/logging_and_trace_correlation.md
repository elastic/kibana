# Agent Builder tools: Kibana logs vs traces

Notes from PR [#283738](https://github.com/elastic/kibana/pull/283738) review discussion
(Ana: should create-success logs include in-memory / pre-assigned `rule_id` / `policy_id`?).

## Two different telemetry surfaces

| Surface | Where it lands | What carries entity ids today |
| --- | --- | --- |
| **Kibana server logs** (`LoggerService`) | Kibana log documents (`labels.*`) | Explicit `labels.rule_id` / `labels.policy_id` / `labels.space_id` |
| **Agent Builder traces** | `traces-agent_builder.otel-*` OTel spans | `gen_ai.*` attributes on inference spans |

`LoggerService` labels are **not** copied onto Agent Builder spans. Logging a draft id
does not by itself make that id a first-class AB-trace attribute.

## What already appears in Agent Builder traces

Tool execution is wrapped in `withExecuteToolSpan` (`run_tool.ts`). Successful tool returns
are stringified onto the TOOL span as `gen_ai.tool.call.result` (when tool-details tracing
is enabled).

`manage_rule` / `manage_action_policy` already return the pre-assigned entity id in that
payload (`ruleAttachment.ruleId` / `actionPolicyAttachment.policyId`). So for AB traces,
draft creates are already correlatable via the tool result — without any log label work.

Other useful AB-trace join keys (already on spans):

- `gen_ai.conversation.id`
- `gen_ai.tool.call.id`
- `gen_ai.tool.name`
- OTel `trace_id` / `span_id` (system-allocated)

## Logging draft / in-memory ids

Even though log labels do not flow into AB traces, logging `rule_id` / `policy_id` for
in-memory assets is still worthwhile for **Kibana log ↔ Kibana log** correlation, and it
matches the id already present in the tool result (and thus in AB traces when tool details
are on).

Convention in the manage tools:

```ts
// after pre-assigning updatedData.id on create
ruleId = currentAttachment?.origin ?? updatedData.id;
```

Prefer `origin` when the attachment is linked to a persisted entity; fall back to the
attachment data / pre-assigned id for drafts.

## Future: annotating the active TOOL span

Do **not** invent or overwrite OTel span ids. Spans are created by
`withExecuteToolSpan` / the inference tracer.

If we later want a **top-level** AB-trace attribute (ES|QL-friendly, not buried in
`gen_ai.tool.call.result`), follow the workflows precedent and set attributes on the
active span from inside the tool handler:

```ts
import { trace } from '@opentelemetry/api';

trace.getActiveSpan()?.setAttribute('elastic.alerting.rule_id', ruleId);
```

Workflows already do this with `elastic.workflow.id` /
`elastic.workflow.execution_id` (see `execute_workflow.ts`). The Agent Builder span
processor hashes those workflow attributes for privacy; any new `elastic.alerting.*`
attributes would need the same privacy treatment if plain ids should not be exported.

Optional log ↔ trace join (separate from entity ids): `getCurrentTraceId()` in
`@kbn/agent-builder-plugin` server tracing reads
`trace.getActiveSpan()?.spanContext().traceId` while a tool span is active.

## Decision for this PR

- **Do** log `rule_id` / `policy_id` for in-memory (draft) assets on success / warn paths,
  using `origin ?? updatedData.id`.
- **Do not** add custom OTel span attributes in this logging migration; revisit when we
  have a concrete AB-trace query that needs a top-level attribute.
