# @kbn/evals-suite-context-engine-memory

Context Engine Memory evaluation suites for [kbn/evals](../../kbn-evals). Owned by `@elastic/context-eng`.

## `memory-longmemeval-direct-index`

A plumbing POC ([search-team#17382](https://github.com/elastic/search-team/issues/17382)) that runs five [LongMemEval-S](https://github.com/xiaowu0162/LongMemEval) questions through Agent Builder:

1. Download the pinned public `longmemeval_s_cleaned.json` from Hugging Face (revision `98d7416c`), verify its size and SHA-256, and keep the five frozen IDs.
2. For each question, index its full history into `longmemeval-memory-direct-index-poc`, one document per conversation turn, a user message plus the assistant replies that follow it (fields `session_id`, `session_order`, `session_date`, `session_timestamp`, `turn_index`, `turn_count`, `message_count`, `text`). Turns keep search results well under Agent Builder's 20k-token tool-result limit, and the session fields let the agent fetch neighbouring turns.
3. Ask the default Agent Builder agent the question. The prompt names the index and gives the question date; the agent chooses its own tools and queries.
4. Judge the answer with the LongMemEval task-specific prompts (copied verbatim from upstream `evaluate_qa.py`, MIT), through the evaluation connector at temperature 0.
5. Delete the index, then read the scores back from the score store and fail unless every question produced a valid, judged, persisted answer.

### What this is, and is not

This is the **direct-index arm**: a generic Agent Builder agent over a flat Elasticsearch index with one document per conversation turn. It bypasses Memory ingestion, Dreaming and recall, so a score from this suite is **not** a measure of Context Engine Memory quality. Later arms (for example the Memory APIs) would be separate suites or arms with their own dataset version.

It is also **not comparable to published LongMemEval numbers**:
- The grading templates are the upstream ones, but the judge is the configured evaluation connector (currently `eis-zai-glm-5-2`), not GPT-4o, and it answers through a forced tool call (`{ correct: boolean }`) instead of free-text yes/no.
- The agent prompt is a deliberate simplification: it names the index, gives the question date, and says to answer that the history does not contain the answer when it does not. Upstream LongMemEval prompts do none of these, and the last line favours the abstention question. The point of this arm is to test the agent's tools over a known index, not index discovery.
- Only five frozen questions are used. With one run of five binary scores, a single flipped question moves the mean by 20 points, so this cannot detect regressions; it checks that the pipeline runs and persists scores.

### Why one document per turn

A search over whole-session documents returned about 22k tokens and was truncated by Agent Builder's 20k tool-result limit. A turn document is about 500 tokens at the median (3.5k at most), and each keeps its `session_id`, so session-level evidence recall and neighbouring-turn lookups still work.

### Guard rails

- Every index helper accepts only the exact index name `longmemeval-memory-direct-index-poc`; there is no wildcard delete.
- The agent keeps its normal tools and the Kibana user's index access. After each answer the suite records which indices the tools read. A question is **invalid** (and the run fails) if any index other than the POC index was read, **including the `.evaluation-*` indices**, which hold the expected answers. Other dot-prefixed Kibana internals are ignored. Tool calls that do not name an index cannot be attributed, so this check is a safeguard, not a sandbox.
- Not reading the POC index at all is not invalid: the answer is simply scored.
- Any invalid, unjudged or unpersisted question fails the whole run, so a red weekly step means at least one of the five did not produce a usable score.

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

The dataset is `context-engine-memory: longmemeval-s-direct-index-v1`. Changing the selected IDs, source, sanitization, index representation, prompt or question-date rendering requires a new dataset version, so comparisons never pair incomparable runs.
