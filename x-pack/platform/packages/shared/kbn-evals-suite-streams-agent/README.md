# @kbn/evals-suite-streams-agent

Evaluation suite for the **streams management** skill in Agent Builder, built on [`@kbn/evals`](../kbn-evals/README.md).

## Goals

This suite validates that the Agent Builder, when using the streams management skill, correctly selects tools, stays within efficiency budgets, respects boundaries, and handles multi-step workflows. It guards against regressions in:

- **Tool routing** — single-intent prompts activate the correct consolidated tool (`inspect_streams`, `diagnose_stream`, `query_documents`, `design_pipeline`, `list_ilm_policies`, `update_stream`, `create_partition`, `delete_stream`).
- **Efficiency** — no redundant tool calls (e.g. post-write verification loops, failing to batch reads via `inspect_streams`).
- **Restraint** — the agent declines out-of-scope requests and avoids unsolicited remediation.
- **Multi-step workflows** — diagnosis-and-fix, fork-and-configure sequences follow the expected tool trajectory using the two-phase pipeline workflow (`design_pipeline` then `update_stream`).

## Approach

### Data tier

Global setup (`evals/global.setup.ts`) creates a shared, read-only data tier using synthtrace:

1. Enables streams and forks `logs.otel.apache` and `logs.otel.linux` from `logs.otel`.
2. Indexes OTel log data via synthtrace with Apache and Linux loghub systems.
3. Adds a broken grok processor to `logs.otel.apache` so failure/quality scenarios have realistic data.

Write scenarios stop at the HITL confirmation prompt — no mutations execute against the shared data.

### Evaluators

Each spec wires these evaluators via `selectEvaluators`. They fall into two categories: **deterministic** evaluators that programmatically compare tool calls, and **LLM judge** evaluators that use a second model to assess the agent's natural-language response.

#### Deterministic evaluators (all specs)

| Evaluator              | What it measures                                                                                                                                                                                                                                 | Scoring                                                                                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SkillLoaded**        | Did the agent load the streams skill? Checks that `filestore.read` was called for the `streams` resource. A 0 here means the agent never loaded its skill — a catastrophic failure.                                                              | Binary: 1 (loaded) or 0 (missing)                                                                                                                                                                                       |
| **Trajectory**         | Did the agent call the right tools in the right order? Compares actual tool calls against the golden `expectedToolSequence` defined for each example.                                                                                            | Weighted: 60% coverage (did all expected tools appear?) + 40% order (were they called in the right sequence, measured via longest common subsequence). Score of 0.5 typically means partial coverage or wrong ordering. |
| **ToolCallBudget**     | Did the agent use a reasonable number of tool calls? Compares total skill tool calls against the `maxExpectedToolCalls` ceiling defined per example.                                                                                             | Binary: 1 (within budget) or 0 (exceeded)                                                                                                                                                                               |
| **ParameterAssertion** | Were the right parameters passed to tools? Only active on efficiency examples that define explicit parameter checks (e.g., verifying `inspect_streams` was called with both stream names in a single batch call rather than two separate calls). | Binary: 1 (all assertions pass) or 0 (any assertion fails)                                                                                                                                                              |

Platform tool calls (`filestore.read`) are automatically filtered from Trajectory and ToolCallBudget scoring — they are infrastructure, not skill decisions. The SkillLoaded evaluator separately validates this prerequisite step.

#### LLM judge evaluators (restraint spec, predictable scenarios only)

These use `correctnessAnalysis` from `@kbn/evals`. A judge model breaks the agent's response into individual claims and assesses each against the `expected` ground-truth answer.

| Evaluator             | What it measures                                                                                                                                                         | Scoring                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Factuality**        | Is the agent's response factually consistent with the expected answer? Each claim is classified as supported, partially supported, contradicted, or not in ground truth. | Geometric mean of per-claim scores. A single contradicted claim (score 0) collapses the entire score, making this evaluator strict. |
| **Relevance**         | Does the response address the user's question? Claims that are off-topic or tangential score lower.                                                                      | Geometric mean of per-claim relevance scores.                                                                                       |
| **Sequence Accuracy** | Does the response present information in a logical order consistent with the expected answer?                                                                            | Geometric mean of per-claim sequence scores.                                                                                        |

These evaluators are only active on restraint examples that have a concrete `expected` string — currently "temporal behavior" and "out-of-scope: cluster settings". Scenarios with dynamic data (stream overviews, workflow outcomes, non-existent stream responses) rely solely on the deterministic evaluators because the Factuality geometric-mean scoring produces unreliable scores when the agent's concrete response data cannot be predicted in the ground truth.

A `-` in the results table means that evaluator does not apply to that example.

### Spec files

| File                   | Scenarios | Focus                                                                                       |
| ---------------------- | --------- | ------------------------------------------------------------------------------------------- |
| `tool_routing.spec.ts` | 10        | One tool per intent (inspect, diagnose, query, design, ILM, update, partition, delete)      |
| `efficiency.spec.ts`   | 5         | Batch reads via inspect_streams, no post-write verification, consolidated tool usage        |
| `restraint.spec.ts`    | 4         | No unsolicited remediation, temporal knowledge, non-existent streams, out-of-scope requests |
| `workflows.spec.ts`    | 3         | Diagnose+fix failures (two-phase pipeline), fix unmapped fields, partition+configure        |

## Running

### 1. Initialise

Run the interactive setup to configure connectors and local vault config:

```bash
node scripts/evals init
```

### 2. Export connectors

Copy the `export` command printed by `init` and run it:

```bash
export KIBANA_TESTING_AI_CONNECTORS=<output from init>
```

### 3. Start the eval

```bash
node scripts/evals start --suite streams-agent \
  --model eis-anthropic-claude-4-6-sonnet \
  --judge eis-openai-gpt-4-1
```

The restraint spec uses an LLM judge for correctness analysis on predictable scenarios, so `--judge` is required. `--grep` restricts the run to a single spec (e.g. `--grep "Tool Routing"`).

```bash
# Multiple models
node scripts/evals start --suite streams-agent \
  --model "eis-anthropic-claude-4-6-sonnet,eis-openai-gpt-4-1" \
  --judge eis-anthropic-claude-4-6-sonnet

# Single spec
node scripts/evals start --suite streams-agent \
  --model eis-anthropic-claude-4-6-sonnet \
  --judge eis-openai-gpt-4-1 \
  --grep "Tool Routing"
```

> **Tip:** See the [`@kbn/evals` README](../kbn-evals/README.md) for the full CLI reference, manual EIS setup, comparison runs, and Phoenix integration.
