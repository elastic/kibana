# Agent Builder — execution service

This directory is the server-side execution core for Agent Builder. It contains the `runner/` and
`run_agent/` sub-trees that grew substantially during the HITL (Human-in-the-Loop) integration
(commit `f07f6e76`). The table below maps each new HITL helper to its purpose and the relevant
deep-dive section, so you can find the right file without reading every module.

## HITL helper map

| Helper | Location (relative to this README) | One-line purpose | Deep-dive anchor |
|---|---|---|---|
| `handle_form_prompt.ts` | `runner/utils/handle_form_prompt.ts` | **Heart of the HITL state machine.** Try/catch CAS — calls `resumeWorkflowExecution` then catches `WorkflowExecutionStaleResumeError` and derives the stale reason from `pollForWorkflowAdvance` output. | [Try/catch CAS](/x-pack/platform/packages/shared/workflows/hitl-common/README.md#trycatch-cas--classification-is-the-resume-itself) |
| `poll_for_workflow_advance/` | `runner/utils/poll_for_workflow_advance/` | Polls `getExecutionState` at 500ms intervals (up to 10s) until `step_execution_id` changes or the workflow reaches a terminal status. Closes the TaskManager async race (R1). | [R1: TaskManager Async Race](/x-pack/platform/packages/shared/workflows/hitl-common/README.md#r1-taskmanager-async-race) |
| `resume_form_prompts/` | `runner/utils/resume_form_prompts/` | Orchestrator — iterates submitted `form_prompts` from the `POST /converse` body and delegates each to `handleFormPromptResponse`. Returns one `ResumedFormPromptState` per execution. | [Agent Builder Changes](/x-pack/platform/packages/shared/workflows/hitl-common/README.md#agent-builder-changes) |
| `build_form_prompts_request_schema/` | `runner/utils/build_form_prompts_request_schema/` | Zod schema builder for the `form_prompts` array in the `POST /converse` body. | [Agent Builder Changes](/x-pack/platform/packages/shared/workflows/hitl-common/README.md#agent-builder-changes) |
| `add_round_complete_event.ts` | `run_agent/utils/add_round_complete_event.ts` | Merges `nextFormPrompt` into the new round's `pending_prompts` (R2) and evicts stale prompt entries whose `step_execution_id` matches a `hitl_form_response_stale` audit step (R6). | [R2: Missing Next-Step Form Emission](/x-pack/platform/packages/shared/workflows/hitl-common/README.md#r2-missing-next-step-form-emission) |
| `refresh_stale_workflow_execution/` | `run_agent/utils/refresh_stale_workflow_execution/` | Rewrites the embedded `WorkflowExecutionState` in each `ToolCallStep` so the LLM never sees a stale `WAITING_FOR_INPUT`. Implements cases I1 (terminal), I2 (advanced), I3 (invariant violation), and I-processing (poll timeout). | [Post-Resume Rewrite](/x-pack/platform/packages/shared/workflows/hitl-common/README.md#post-resume-rewrite-i1i3-i-processing) |
| `hitl_workflow_executions/` | `run_agent/hitl_workflow_executions/` | Tracks which workflow executions are in a HITL-paused state within a given agent run. | [Agent Builder Changes](/x-pack/platform/packages/shared/workflows/hitl-common/README.md#agent-builder-changes) |

**Nested HITL helpers** (outer workflow → `ai.agent` step → inner workflow `waitForInput`) live
under [`../../step_types/helpers/`](/x-pack/platform/plugins/shared/agent_builder/server/step_types/helpers/):
`build_waiting_for_input_result`, `resume_inner_agent`, `resume_inner_workflow`, `run_inner_agent`.
See [Nested HITL Path](/x-pack/platform/packages/shared/workflows/hitl-common/README.md#nested-hitl-path-scenario-4) in the deep-dive.

## Further reading

For the full HITL architecture — the CAS concurrency model, all seven race conditions and their
fixes, the complete server/client change walkthrough, sequence diagrams, and golden debug traces —
see the [HITL deep-dive](/x-pack/platform/packages/shared/workflows/hitl-common/README.md).
