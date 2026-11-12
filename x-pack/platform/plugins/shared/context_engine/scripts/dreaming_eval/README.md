# Dreaming eval

Measures what Context Engine dreaming learns from agent conversations. It imports benchmark conversations as Agent Builder traces, lets AI indices dream on them, and judges the KIs they write against a list of target knowledge.

```sh
node scripts/context_engine_dreaming_eval.js                      # every stage
node scripts/context_engine_dreaming_eval.js --stage extract,import
node scripts/context_engine_dreaming_eval.js --stage run,evaluate --ai-index dreaming-eval-workarena
node scripts/context_engine_dreaming_eval.js --stage evaluate --run-id 2026-11-12T08-00-00-000
```

It needs a local Elasticsearch and Kibana from this branch. It uses `elastic:changeme` and reads the Kibana URL from `config/kibana.dev.yml` unless you pass `--es-url`, `--kibana-url`, `--es-username` and `--es-password`.

## Stages

Each stage reads what the previous one wrote, so you can rerun any of them on its own.

| Stage | What it does |
| --- | --- |
| `extract` | Downloads the datasets, picks the conversations the config asks for, and writes them with targets generated from the benchmark's questions. |
| `import` | Writes each round as Agent Builder OTel spans to `traces-agent_builder.otel-<space>`. A re-import replaces the dataset's earlier spans. |
| `configure` | Turns on Context Engine and memory, and creates or updates the AI indices of the config: an ES\|QL trace source over the datasets' agents, and their dreaming config. |
| `run` | Per AI index: deletes the facts, entities and relationships dreaming wrote, runs each of its workflows until they have read everything (the first run from the earliest imported round), and dumps the KIs they wrote. |
| `evaluate` | Per target: ranks the dumped KIs with a reranker, then asks an LLM whether the top ones hold the target knowledge. Writes scores by dataset and category. |

## Datasets

- **`longmemeval_s`:** [LongMemEval](https://github.com/xiaowu0162/LongMemEval) S, a personal assistant's chats with its user. It downloads `longmemeval_s_cleaned.json` (277 MB) once. By default it takes the first non-abstention question of each of the 6 question types, the sessions that hold their answers, and one other session per question. Each user message and the assistant's answer is a round, at the session's date.
- **`longmemeval_v2_enterprise`:** [LongMemEval-V2](https://github.com/xiaowu0162/LongMemEval-V2), the enterprise domain: a web agent's runs in a ServiceNow portal (WorkArena). It streams `trajectories.jsonl` (1.2 GB) once and keeps only the trajectories of the enterprise haystack (100 in the small tier). Each trajectory is one round: the goal is what the user sent, each action is a `browser` tool call whose result is the page it led to, and the answer is how the task ended. Pages are cut to `max_observation_chars`, without the elements on most of the trajectory's pages, such as the navigation bar.

## Config

[`config/default.yaml`](config/default.yaml) lists what to import and the AI indices that dream on it. Copy it and pass it with `--config` to try other dreaming configs or subsets without changing code. An AI index names its `datasets` and a `dreaming` config: a built-in `template` (from `public/assets/dreaming_templates`), its own `instructions`, `facts`, `entities` and `relationships`, or both.

## Output

Everything goes to `data/context_engine_dreaming_eval/` (`data_dir`), which git ignores:

- `<dataset>/extracted.json`: the conversations, as rounds of a user message, tool calls and an answer.
- `<dataset>/targets.json`: the targets generated from the benchmark's questions.
- `<dataset>/import.json`: what was imported, and when the earliest round is.
- `runs/<run id>/<AI index>/kis.json`: the KIs a run wrote, with the workflow runs and what each read and wrote.
- `runs/<run id>/<AI index>/evaluation.json` and `summary.md`: each target's verdict, the KIs that hold it, and scores.

## Targets

A target is a question and the answer the AI index should be able to give from its KIs, without the conversations:

```json
{
  "id": "e47becba",
  "dataset": "longmemeval_s",
  "category": "single-session-user",
  "question": "What degree did I graduate with?",
  "answer": "Business Administration",
  "knowledge": "The user graduated with a degree in Business Administration.",
  "askedAt": "2023-05-30T23:40:00.000Z"
}
```

`knowledge` is optional: it states the knowledge directly. The generated targets are the benchmarks' own questions, so they test what a question needs rather than everything worth learning. To evaluate against a curated list, write target files and list them under the AI index's `targets` in the config.

The judge rates each target covered (1), partial (0.5) or missing (0), and the score is their mean. It uses `--judge-connector`, then `evaluate.connector_id`, then Kibana's default AI connector, then the first Elastic Inference Service connector.
