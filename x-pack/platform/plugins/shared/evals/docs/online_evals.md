# Online evaluations

This guide covers how to manually verify scheduled online evaluations that are backed by Kibana Workflows.

## Prerequisites

- Enterprise license enabled (required for the Workflows plugin).
- Workflows plugin available in Kibana.
- Agent Builder tracing configured for groundedness-capable evaluation:
  - Tracing enabled
  - Experimental features enabled
  - Advanced tracing settings enabled for:
    - `includeUserPrompts`
    - `includeLlmResponses`
    - `includeToolDetails`

Without those tracing settings, groundedness-style evaluators can return `potentially_incomplete`.

## End-to-end manual verification

1. Open Evals in Kibana and go to `Online Evaluations`.
2. Create an online evaluation monitor with:
   - A trace source index pattern (for example `traces-agent_builder.otel-default`)
   - Sampling configuration (window, lag, max traces per run)
   - At least one evaluator
   - A connector when any selected evaluator is `llm`
3. Save the monitor. This creates a workflow tagged with `evals-online`.
4. Open the Workflows UI and manually trigger the created workflow once.
5. Verify scores were persisted by calling:
   - `GET kbn:/internal/evals/online_scores?monitor_id=<workflowId>`
6. Confirm the response contains one document per score entry for each successful evaluator result.
7. Return to Evals `Online Evaluations`, open the monitor detail page, and verify:
   - Trend panels render data for that monitor
   - Recent scores table shows newly ingested rows
   - Clicking a trace id opens the trace waterfall flyout

## Known limitations

- Online evaluations currently support single-turn trace evaluation only.
- Conversation identifiers are hashed/opaque in trace-derived data.
- Output quality depends on Agent Builder privacy/tracing settings; missing prompt/response/tool fields can reduce evaluator fidelity.
