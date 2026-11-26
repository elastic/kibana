# @kbn/evals-suite-context-engine-memory

Context Engine Memory evaluation suites for [kbn/evals](../../kbn-evals). Owned by `@elastic/context-eng`.

## `memory-longmemeval-direct-index`

A plumbing POC ([search-team#17382](https://github.com/elastic/search-team/issues/17382)) that runs five [LongMemEval-S](https://github.com/xiaowu0162/LongMemEval) questions through Agent Builder:

1. Download the pinned public `longmemeval_s_cleaned.json` from Hugging Face (revision `98d7416c`), verify its size and SHA-256, and keep the five frozen IDs.
2. For each question, index its full history into `longmemeval-memory-direct-index-poc`, one document per conversation turn, a user message plus the assistant replies that follow it (fields `session_id`, `session_order`, `session_date`, `session_timestamp`, `turn_index`, `turn_count`, `message_count`, `text`). Turns keep search results well under Agent Builder's 20k-token tool-result limit, and the session fields let the agent fetch neighbouring turns.
3. Ask the default Agent Builder agent the question. The prompt names the index and gives the question date; the agent chooses its own tools and queries.
4. Judge the answer with the LongMemEval task-specific prompts (copied verbatim from upstream `evaluate_qa.py`, MIT), through the evaluation connector at temperature 0.
5. Delete the index, then read the scores back from the score store and fail unless every question produced a valid, judged, persisted answer.

It bypasses Memory ingestion, Dreaming and recall, so it does **not** measure Memory quality, regression sensitivity or comparability with published LongMemEval results.

### Evaluators

| Name | Kind | Meaning |
| --- | --- | --- |
| `longmemeval-answer-accuracy` | LLM | 1 if the judge accepts the answer, 0 otherwise; null if the task produced no answer |
| `longmemeval-evidence-session-recall` | CODE | Informational: share of the question's evidence sessions any tool call returned |
| `longmemeval-used-esql` | CODE | Informational: whether the agent used an ES\|QL tool |

Each task output also records tool calls, queries (no row values), results over Agent Builder's 20k-token tool-result budget, `read_file` use, token usage and load and answer durations.

### Running locally

```bash
node scripts/evals start \
  --suite memory-longmemeval-direct-index \
  --model <task-model-connector> \
  --judge eis-zai-glm-5-2
```

- `LONGMEMEVAL_IDS=118b2229` runs a subset of the frozen IDs.
- `LONGMEMEVAL_S_PATH=/path/to/longmemeval_s_cleaned.json` uses a local copy (still checksum-verified). Otherwise the file is cached under the OS temp directory after the first download.
- Point local runs at a local evaluations target so test runs don't land in the shared score history.

### CI

- PRs: add `evals:memory-longmemeval-direct-index` and one `models:eis/...` label. The suite's `defaultJudge` applies.
- Weekly: the `Evals: Memory LongMemEval-S Direct Index` step in `.buildkite/pipelines/evals/llm_evals.yml` (one model, explicit judge). Remove that step to turn the recurring run off.

### Versioning

The dataset is `context-engine-memory: longmemeval-s-direct-index-v2`. Changing the selected IDs, source, sanitization, index representation, prompt or question-date rendering requires a new dataset version, so comparisons never pair incomparable runs.
