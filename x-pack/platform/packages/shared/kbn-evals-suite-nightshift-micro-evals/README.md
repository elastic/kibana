# Nightshift Micro Evals

Runs MonitorIdExtraction, PlanExtraction, and PlanMerge as three separate experiments on
Kibana's inference path. Each Eval Target is a Reference Target: the code-defined Deductive
prompt at `a60f80265f5ebe5c4ce9be02b0a158be00e2d58c`, copied verbatim and executed in one
`inferenceClient.output` call. These scores measure prompts on this inference path; the
three tasks have no native Kibana product counterpart yet.

[Implementation spec](https://github.com/deductive-ai/deductive/issues/10557) ·
[Deductive reference experiments](https://github.com/deductive-ai/deductive/pull/10548)

## Run locally

Use the repository's pinned Node version and run `yarn kbn bootstrap` after checkout.
Install a results-cluster profile at
`x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.golden.json`, following
`config.example.json`. The profile needs an `evaluationsKbn` block and model credentials.
Keep it gitignored and readable only by its owner. Share only its path, never credentials.
Set `NIGHTSHIFT_PLAN_EXTRACTION_SPLIT` to the approved extraction split in your private
environment before running the suite; do not commit or publish that value.

In a Bash session using the pinned Node version, load the existing profile/connector helper:

```bash
source x-pack/platform/packages/shared/kbn-evals/scripts/ci/local_ci_env.sh \
  x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.golden.json
KIBANA_TESTING_INFERENCE_ENDPOINTS="$(node x-pack/platform/packages/shared/kbn-evals/scripts/ci/generate_openrouter_connectors.js \
  --models openrouter-anthropic-claude-sonnet-4-6)"
export KIBANA_TESTING_INFERENCE_ENDPOINTS
micro_eval_log="$(mktemp)"
node scripts/evals start --suite nightshift-micro-evals --profile golden \
  --model openrouter-anthropic-claude-sonnet-4-6 >"$micro_eval_log" 2>&1
```

The helper reads the profile's OpenRouter block and default `evaluationConnectorId` into the
runner's environment, printing only a redacted summary. Limit the OpenRouter payload to the
selected target and judge: the full catalog can exceed Java's environment-string size limit.
The generator automatically includes an OpenRouter judge from `EVAL_CONNECTOR_ID`.
For an EIS judge, first configure it with `node scripts/evals init` and include its definition
from `generate_eis_connectors.js` in the payload before starting the stack; an OpenRouter-only
payload cannot define an EIS connector. The standard runner enables Cloud Connected Mode
using the usual Elastic credentials. Never print connector payloads: they contain secrets.
Use `node scripts/evals run` with the same arguments when the stack is already up, or pass
`--skip-server` to `start`. `--judge` overrides the profile judge.

The temporary log is owner-only. Startup commands can contain tracing credentials and task
errors can contain source examples: share only the experiment URLs, rule summaries, and
sanitized diagnostics from it, never the raw log.

For this port's local acceptance, the approved judge override is
`openrouter-google-gemini-3-1-pro-preview` because the profile's EIS Gemini judge required an
unavailable Vault sign-in. Set `EVAL_CONNECTOR_ID` to that ID **before** regenerating the
OpenRouter payload, and pass the same ID with `--judge`. The profile remains unchanged;
experiment metadata records the actual model and the PR evidence records the connector.
For EIS, judge metadata is read from the underlying inference endpoint because REST
discovery exposes endpoint IDs in place of stack connector aliases.

The repo skill [/run-micro-evals](../../../../../.agents/skills/run-micro-evals/SKILL.md)
resolves the profile and connector, runs this command, and returns all three experiment links
and rule verdicts. The suite has one spec and no task/example subset switch.

## CI and reports

The `evals:nightshift-micro-evals` label selects this suite on any Kibana PR. Changes within
this package automatically request the label through `.github/paths-labeller.yml`.
Start the PR's CI using the bot comment's `kibana-pull-request` checkbox; that pipeline
triggers the label-selected eval pipeline after the Kibana build.
The suite also participates in the standard weekly pipeline. Its registered default model
group is `eis/anthropic-claude-4.6-sonnet`; PR `models:` and `models:judge:` labels use the
normal eval pipeline overrides. The step reports through `kibana-evals`.
CI must supply `NIGHTSHIFT_PLAN_EXTRACTION_SPLIT` through private runtime configuration.

The suite uses plain `evals_tracing`, a 30-minute test/CI timeout, and no sandbox, seed data,
or external task process. Target concurrency is 4 for monitor-id and extraction, 2 for merge.

Each task prints the standard statistics table, a permanent `KBN_EXPERIMENT_URL`, every
Passing Rule, and a `MICRO_EVAL_RESULT` line:

```text
exact_match=0.967 >= 0.91 PASS
non_empty_output=0.967 >= 0.91 PASS
format_validity=1.000 >= 0.95 PASS
MICRO_EVAL_RESULT: MonitorIdExtraction — PASS
```

Missing metrics print `<metric>: MISSING (no evaluator produced this metric) FAIL`.
An all-errored experiment prints a warning. Rules are **report-only**: a failed rule leaves
the step green. Acceptance assertions check that every example has every registered score;
ingestion and infrastructure failures still fail the test. A future assertion on the
rule verdict can enable gating without changing evaluators or thresholds.

| Task | Passing Rules (AND-joined means) |
| --- | --- |
| MonitorIdExtraction | `exact_match >= 0.91`, `non_empty_output >= 0.91`, `format_validity >= 0.95` |
| PlanExtraction | `structural_validity >= 0.94`, `taken_path_coverage >= 0.88`, `evolution_preservation >= 0.89`, `llm_judge_quality >= 0.17` |
| PlanMerge | `structural_validity >= 0.84`, `mutation_preservation >= 0.83`, `checkmark_placement >= 0.84`, `no_conflicting_checkmarks >= 0.95`, `mutation_correctness >= 0.75` |

Each task's `rules.ts` retains the Deductive thresholds and provenance comment. Shared
names such as `structural_validity` are reported per experiment, never averaged across tasks.

## Dataset contract

Global setup reads all three sources from the selected results cluster into an owner-only
temporary directory. The spec reads these snapshots synchronously during collection, and
setup teardown removes them. Source `deductive/*` datasets are read-only: only derived
`nightshift/micro/*` datasets are upserted. Additional input, output, and metadata fields are
preserved as JSON. Source persisted IDs are replaced by the owned dataset's IDs;
`langsmith_example_id` is retained and `source_kbn_example_id` records the original kbn ID.

| Task | Read-only source | Owned dataset | Required split |
| --- | --- | --- | --- |
| MonitorIdExtraction | `deductive/monitor_id_extraction` | `nightshift/micro/monitor_id_extraction` | `suite/baseline` |
| PlanExtraction | `deductive/context_graph` | `nightshift/micro/context_graph` | Private `NIGHTSHIFT_PLAN_EXTRACTION_SPLIT` setting |
| PlanMerge | `deductive/context_graph_mutation` | `nightshift/micro/context_graph_mutation` | Whole dataset |

`selectDatasetExamples` in `@kbn/evals-extensions` implements AND filtering on
`metadata.dataset_split`, excludes `metadata.status === 'archived'`, and rejects an empty
selection. Both this suite and the golden investigation suite use that helper. Owned
copies are tagged `nightshift`, `micro-eval`, and the task type.

### Common fields

| Field | Contract |
| --- | --- |
| `input`, `output` | Task-specific objects; extra fields preserved. Expected `output` reaches evaluators only. |
| `metadata.langsmith_example_id` | Required nonempty provenance string, at most 500 characters. |
| `metadata.source_kbn_example_id` | Optional before derivation; overwritten with the source example's persisted ID. |
| `metadata.dataset_split` | Optional list of up to 100 split names (500 characters each); missing matches only a whole-dataset selection. |
| `metadata.status` | Optional lifecycle string; `archived` is excluded. |
| `metadata.case_type` | Optional case classifier; extraction's `new_tree` substring disables evolution scoring. |
| Text / collections | Task text is bounded at 1,000,000 characters; messages, monitor lists, and mutation node-ID lists at 10,000 entries. |

### MonitorIdExtraction

[Runtime schema](evals/monitor_id_extraction/example.schema.json) ·
[Synthetic example](evals/monitor_id_extraction/example.json)

| Field | Contract |
| --- | --- |
| `input.user_message` | Optional string, passed verbatim; absent becomes empty. |
| `input.existing_monitors` | Optional/null list of `[id, symptom]` pairs or `{ monitor_id, symptom }` objects. An empty list uses the no-list prompt. |
| `output.expected_monitor_id` | Optional/null expected ID, trimmed for comparison; empty means abstention. |
| Target output | `{ monitor_id }`, trimmed; invalid structured output becomes empty, exceptions add `error`. |

### PlanExtraction

[Runtime schema](evals/plan_extraction/example.schema.json) ·
[Synthetic example](evals/plan_extraction/example.json)

| Field | Contract |
| --- | --- |
| `input.messages` | Optional/null list of `{ type?, content? }`. `ai`/`assistant` map to assistant, all other types to user. |
| `input.existing_tree_mermaid` | Optional/null base tree; the target always uses the non-preserving taken-mark mode. |
| `output.expected_tree_mermaid` | Optional/null expected tree for the judge. |
| `output.expected_decision_tree_mermaid` | Legacy expected-tree fallback. |
| Target output | The six `InvestigationPlan` fields: `monitor_id`, `applicability`, `category_identification`, `decision_tree_mermaid`, `evidence_gatherer_metadata` (defaults to `[]`), `keywords`; exceptions return `{ decision_tree_mermaid: '', error }`. |

### PlanMerge

[Runtime schema](evals/plan_merge/example.schema.json) ·
[Synthetic example](evals/plan_merge/example.json)

| Field | Contract |
| --- | --- |
| `input.initial_tree_mermaid` | Optional/null initial tree, with `\|✅\s*` taken marks reset before reinforcement. |
| `input.causal_summary` | Optional/null confirmed cause and requested structural edits, placed in Plan B's applicability. |
| `input.question` | Optional/null; retained but unused by the target. |
| `output.expected_merged_mermaid` | Optional/null reference tree for the mutation judge. |
| `output.mutation_spec.preserved_node_ids` | IDs that must survive. |
| `output.mutation_spec.nodes_added` / `nodes_deleted` | IDs that must appear / disappear. |
| `output.mutation_spec.correct_terminal` | Terminal that must be reached by a taken edge. |
| `output.mutation_spec.terminals_without_checkmark` | Terminals that must have no taken edge. |
| Target output | `{ merged_mermaid }`; exceptions add `error` and an empty tree. |

Mutation constraints are optional/null. Missing constraints retain Python's not-applicable
scores; in particular, checkmark placement with no spec passes even for an empty output.

### Regenerate schemas

Schemas are generated from the runtime zod definitions and guarded by Jest. After a contract
change, run from the repository root:

```bash
node -r @kbn/setup-node-env <<'JS'
const fs = require('fs');
const { z } = require('@kbn/zod/v4');
for (const task of ['monitor_id_extraction', 'plan_extraction', 'plan_merge']) {
  const directory = `x-pack/platform/packages/shared/kbn-evals-suite-nightshift-micro-evals/evals/${task}`;
  const { exampleSchema } = require(`./${directory}/types`);
  fs.writeFileSync(`${directory}/example.schema.json`, JSON.stringify(z.toJSONSchema(exampleSchema), null, 2) + '\n');
}
JS
```

Commit only schemas and synthetic examples. The source examples and downloaded score/trace
documents stay in private local storage.

## Runner parity contract

| Surface | Deductive / Phase A | Kibana suite |
| --- | --- | --- |
| Targets | Three Python tasks, code-defined prompts at the pinned commit | Same prompt text, field descriptions, message/table/base-tree/reinforcement assembly; one structured-output call per target |
| Consecutive message roles | Original conversation turns | Inference normalizes turns with `ensureMultiTurn`, inserting `"-"` messages between consecutive same-role turns; for example, an assistant turn between a final human history message and the trailing human template |
| Models | Task-specific routing (including Haiku for monitor-id) | One selected model for all tasks; default CI group Sonnet 4.6 |
| Structured output | Pydantic via `LlmRouter` | JSON Schema via `BoundInferenceClient.output`, validated with the same six plan fields and evidence-metadata default |
| Token budgets | Monitor 64/256; plans 20,480; judges 200/300 | **Current inference defaults**, approved for this port because `output` exposes no token budget or temperature option |
| Target deadlines | Extraction 120s; merge 180s | Same elapsed limits through abort signals |
| Judges | Direct OpenAI `gpt-4o-mini`, JSON-object mode, temperature 0 | Profile/CI-selected judge, structured-output mode, current inference temperature default; judge model recorded |
| Judge versions | Prompt text in Python | SHA-256 of complete system/user/section templates in each LLM score's evaluator version |
| CODE evaluators | Names, regexes, arithmetic, Python three-decimal rounding and comments | Same names, checks, ordering, rounding, and explanations; merge retains fences while extraction strips them |
| Judge failures | Quality/mutation: 0; conflict: 0.5 | Same fallback scores and comment formats; conflict judge skipped for at most one taken terminal |
| Passing Rules | Thresholds gate the Python driver's result | Same thresholds/provenance, report-only in this iteration |
| Dataset selection | Client-side AND split filtering and archived exclusion | Shared extension helper; owned derived datasets, source provenance retained |
| Experiment separation | One task per experiment | One dataset/experiment per task; reporter uses experiment IDs, not cross-task execution aggregates |
| Metadata | Python task/backend metadata | Every score's `evaluator.metadata.experiment` records `task_type`, `target`, `prompt_source_commit`, `judge_model`, `backend`, `runner`, `dataset`, `split`, `rules` |
| Traces | Python LLM/task traces | Native inference/task/evaluator spans; native git and hostname metadata |
| Native replacement | Python task implementation | Replace the corresponding `task.ts` function when a native task exists; dataset/evaluator/rule contracts stay stable |

Known backend gaps remain: closed top-level experiment metadata, no server-side splits or
dataset versioning, roughly five-second score refresh, and unpaginated dataset reads. These
small datasets fit the current limits. The closed metadata schema is why experiment details
are copied into each evaluator's metadata. VisualizeAnswer is deferred to its own spec.

## Validation

Jest covers pure-module seams with synthetic inputs: dataset derivation and schema parity,
prompt assembly, every CODE evaluator, stubbed judge responses/failures, and reporting.
The Playwright spec is the acceptance seam; it runs all tasks and checks complete ingestion.
The PR description carries reference/local/CI experiment links, every rule verdict, and
private Phase A replay counts. LLM replay uses recorded judge ratings to verify normalization
and explanations; it does not claim a fresh LLM response reproduces an earlier rating.

```bash
node scripts/jest --config=x-pack/platform/packages/shared/kbn-evals-suite-nightshift-micro-evals/jest.config.js --runInBand
node scripts/type_check --project x-pack/platform/packages/shared/kbn-evals-suite-nightshift-micro-evals/tsconfig.json
node scripts/check.js --scope=local
```

## Vocabulary

### Eval Backend

Where evaluation datasets, experiments and scores are stored and linked: LangSmith or kbn (the Kibana evals plugin on the kbn-evals golden cluster). Selecting a backend changes where results live, never what is graded.
_Avoid_: Using "backend" for the inference service or for the agent under test

### Eval Target

The agent under evaluation. Today either the Deductive CopilotV2 agent in investigate mode or the Kibana Nightshift Deductive Investigator. A target receives the example question and execution metadata, never the reference answer.
_Avoid_: Executor, subject, system-under-test; conflating the target with the cluster it runs on

### Eval Runner

The process that reads a dataset from an Eval Backend, drives an Eval Target on each example, grades the output, and writes scores back. The Deductive golden runner and the Kibana Nightshift investigations eval suite are both runners.
_Avoid_: Calling the operator CLI the runner; the CLI only triggers a runner

### Golden Eval

The full-investigation evaluation of an Eval Target on a cluster dataset, gated by `goal_pass` against a reference answer and accompanied by the metric and reward keys. Distinct from a Micro Eval, which gates a single LLM task's prompt against a task-specific dataset.
_Avoid_: Using "golden" for the `suite/golden` split alone; a golden eval can run on any suite split

### Trajectory

The compact, ordered record of a target's tool calls, tool results and final response that graders read: step type, tool name, arguments, tool output capped at 2000 characters, and success. Built from the target's message stream, never from traces.
_Avoid_: Treating a trace as the trajectory; storing raw response envelopes as the trajectory

### Harness Parity

Running the same inputs, graders and score keys against an Eval Target that lacks the data access of the reference target. Harness parity proves the runner and the contract; its scores are expected near zero and are not capability claims.
_Avoid_: Reading harness-parity scores as accuracy; calling a run with data access "harness parity"

### Micro Eval

The evaluation of one LLM task's prompt against a task-specific dataset, gated by Passing Rules, and run on a pull request when that prompt changes. Distinct from a Golden Eval, which evaluates a full investigation.
_Avoid_: Calling a golden-eval slice or a lite run a micro eval; "unit eval"; "prompt test"

### Passing Rule

One AND-clause gate on the mean of a single score key over a Micro Eval run: a metric, an operator and a threshold. A Micro Eval passes only when every rule passes; a rule whose metric was never produced fails.
_Avoid_: Treating the threshold as a per-example cutoff; reading a missing metric as a pass; "assertion"

### Reference Target

An Eval Target that is a Deductive prompt carried verbatim as eval data and executed on the Eval Runner's own inference path, standing in until a native product task exists. Its scores measure the prompt on that runner, never a product capability.
_Avoid_: "stub", "mock", "fake target"; treating it as a product feature; reading its scores as a capability claim
